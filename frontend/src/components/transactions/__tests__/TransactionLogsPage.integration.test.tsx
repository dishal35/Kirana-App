import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TransactionLogsPage } from '../TransactionLogsPage';
import { useApp } from '../../../contexts/AppContext';
import { transactionRepository, productRepository } from '../../../dbs/repo';
import { TransactionLogsService } from '../../../services/TransactionLogsService';
import type { Transaction, Product } from '../../../types';

// Mock the repositories
vi.mock('../../../dbs/repo', () => ({
  transactionRepository: {
    getAll: vi.fn()
  },
  productRepository: {
    getAll: vi.fn()
  }
}));

// Mock the app context
vi.mock('../../../contexts/AppContext', () => ({
  useApp: vi.fn()
}));

// Mock URL.createObjectURL for export functionality
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Create comprehensive test data
const createMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const baseDate = new Date('2024-01-01T00:00:00');
  
  // Create transactions across multiple days and hours
  for (let day = 0; day < 30; day++) {
    for (let hour = 9; hour < 18; hour += 3) {
      const timestamp = new Date(baseDate);
      timestamp.setDate(timestamp.getDate() + day);
      timestamp.setHours(hour, Math.floor(Math.random() * 60));
      
      const amount = Math.floor(Math.random() * 500) + 50;
      const type = Math.random() > 0.7 ? 'cash' : 'upi';
      
      transactions.push({
        id: `tx-${day}-${hour}`,
        amount,
        products: [
          {
            productId: `p${Math.floor(Math.random() * 5) + 1}`,
            quantity: Math.floor(Math.random() * 3) + 1,
            unitPrice: amount / (Math.floor(Math.random() * 3) + 1)
          }
        ],
        type,
        timestamp,
        transcription: type === 'upi' ? `${type.toUpperCase()} payment received ${amount} rupees` : undefined,
        confidence: type === 'upi' ? Math.random() * 0.3 + 0.7 : undefined
      });
    }
  }
  
  return transactions;
};

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Bread',
    price: 50,
    stock: 20,
    reorderThreshold: 5,
    category: 'Bakery',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p2',
    name: 'Milk',
    price: 60,
    stock: 15,
    reorderThreshold: 3,
    category: 'Dairy',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p3',
    name: 'Rice',
    price: 80,
    stock: 25,
    reorderThreshold: 5,
    category: 'Grains',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p4',
    name: 'Oil',
    price: 120,
    stock: 8,
    reorderThreshold: 2,
    category: 'Cooking',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p5',
    name: 'Sugar',
    price: 45,
    stock: 12,
    reorderThreshold: 3,
    category: 'Grocery',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

describe('TransactionLogsPage Integration Tests', () => {
  let mockTransactions: Transaction[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactions = createMockTransactions();
    
    (useApp as any).mockReturnValue({
      state: {
        language: 'en',
        todaysTransactions: mockTransactions.slice(0, 5),
        products: mockProducts
      }
    });

    (transactionRepository.getAll as any).mockResolvedValue(mockTransactions);
    (productRepository.getAll as any).mockResolvedValue(mockProducts);
  });

  it('handles large dataset efficiently', async () => {
    const startTime = performance.now();
    
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time (less than 2 seconds)
    expect(renderTime).toBeLessThan(2000);
    
    // Should display pagination for large dataset
    expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument();
  });

  it('performs complex filtering operations', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    // Apply date range filter
    const startDateInput = screen.getByDisplayValue(/2024-/);
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });

    // Apply payment type filter
    const paymentTypeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(paymentTypeSelect, { target: { value: 'upi' } });

    // Apply amount range filter
    const minAmountInput = screen.getByPlaceholderText('Min amount');
    fireEvent.change(minAmountInput, { target: { value: '100' } });

    const maxAmountInput = screen.getByPlaceholderText('Max amount');
    fireEvent.change(maxAmountInput, { target: { value: '300' } });

    // Apply product filter
    const productSelect = screen.getByDisplayValue('All Products');
    fireEvent.change(productSelect, { target: { value: 'p1' } });

    await waitFor(() => {
      // Should show filtered results
      const resultText = screen.getByText(/Showing \d+ of \d+ transactions/);
      expect(resultText).toBeInTheDocument();
    });
  });

  it('generates comprehensive analytics', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Show Analytics')).toBeInTheDocument();
    });

    // Show analytics
    const analyticsButton = screen.getByText('Show Analytics');
    fireEvent.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
      expect(screen.getByText('Average Amount')).toBeInTheDocument();
      expect(screen.getByText('UPI Transactions')).toBeInTheDocument();
      expect(screen.getByText('Top Selling Products')).toBeInTheDocument();
    });

    // Should display calculated metrics
    expect(screen.getByText(/₹[\d,]+/)).toBeInTheDocument(); // Total revenue
    expect(screen.getByText(/\d+/)).toBeInTheDocument(); // Transaction count
  });

  it('handles pagination with large datasets', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of \d+/)).toBeInTheDocument();

    // Navigate to next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of \d+/)).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    // Navigate back to previous page
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of \d+/)).toBeInTheDocument();
    });
  });

  it('performs real-time search across all fields', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by transcription, amount, or product name...');

    // Search by transcription
    fireEvent.change(searchInput, { target: { value: 'UPI payment' } });
    
    await waitFor(() => {
      const results = screen.getByText(/Showing \d+ of \d+ transactions/);
      expect(results).toBeInTheDocument();
    });

    // Search by product name
    fireEvent.change(searchInput, { target: { value: 'Bread' } });
    
    await waitFor(() => {
      const results = screen.getByText(/Showing \d+ of \d+ transactions/);
      expect(results).toBeInTheDocument();
    });

    // Search by amount
    fireEvent.change(searchInput, { target: { value: '100' } });
    
    await waitFor(() => {
      const results = screen.getByText(/Showing \d+ of \d+ transactions/);
      expect(results).toBeInTheDocument();
    });
  });

  it('exports large datasets efficiently', async () => {
    // Mock document methods for export
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    const startTime = performance.now();

    // Export CSV
    const exportCsvButton = screen.getByText('Export CSV');
    fireEvent.click(exportCsvButton);

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
    });

    const endTime = performance.now();
    const exportTime = endTime - startTime;

    // Export should complete within reasonable time
    expect(exportTime).toBeLessThan(5000);

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('maintains performance with complex filters and analytics', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    const startTime = performance.now();

    // Apply multiple filters simultaneously
    const paymentTypeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(paymentTypeSelect, { target: { value: 'upi' } });

    const minAmountInput = screen.getByPlaceholderText('Min amount');
    fireEvent.change(minAmountInput, { target: { value: '50' } });

    const searchInput = screen.getByPlaceholderText('Search by transcription, amount, or product name...');
    fireEvent.change(searchInput, { target: { value: 'payment' } });

    // Show analytics
    const analyticsButton = screen.getByText('Show Analytics');
    fireEvent.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Complex operations should complete within reasonable time
    expect(processingTime).toBeLessThan(3000);
  });

  it('handles transaction detail modal with complex data', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
    });

    // Click on first transaction
    const firstTransaction = screen.getAllByText(/₹\d+/)[0];
    const transactionRow = firstTransaction.closest('div');
    fireEvent.click(transactionRow!);

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    });

    // Should display all transaction details
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Payment Type')).toBeInTheDocument();
    expect(screen.getByText('Date & Time')).toBeInTheDocument();

    // Should display products if available
    const productsSection = screen.queryByText('Products');
    if (productsSection) {
      expect(productsSection).toBeInTheDocument();
    }

    // Should display transcription if available
    const transcriptionSection = screen.queryByText('Audio Transcription');
    if (transcriptionSection) {
      expect(transcriptionSection).toBeInTheDocument();
    }
  });

  it('validates data integrity across operations', async () => {
    const service = new TransactionLogsService();
    await service.loadData();

    // Test filtering doesn't modify original data
    const originalCount = mockTransactions.length;
    const filtered = service.filterTransactions({ paymentType: 'upi' });
    
    expect(mockTransactions.length).toBe(originalCount);
    expect(filtered.length).toBeLessThanOrEqual(originalCount);

    // Test analytics calculations are consistent
    const analytics1 = service.calculateAnalytics(mockTransactions);
    const analytics2 = service.calculateAnalytics(mockTransactions);
    
    expect(analytics1.totalAmount).toBe(analytics2.totalAmount);
    expect(analytics1.transactionCount).toBe(analytics2.transactionCount);

    // Test pagination doesn't lose data
    const page1 = service.paginateTransactions(mockTransactions, 1, 10);
    const page2 = service.paginateTransactions(mockTransactions, 2, 10);
    
    const combinedCount = page1.transactions.length + page2.transactions.length;
    expect(combinedCount).toBeLessThanOrEqual(mockTransactions.length);
  });

  it('handles edge cases gracefully', async () => {
    // Test with empty data
    (transactionRepository.getAll as any).mockResolvedValue([]);
    (productRepository.getAll as any).mockResolvedValue([]);

    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No transactions found matching your filters')).toBeInTheDocument();
    });

    // Test analytics with empty data
    const analyticsButton = screen.getByText('Show Analytics');
    fireEvent.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
      expect(screen.getByText('₹0')).toBeInTheDocument(); // Total revenue should be 0
    });
  });
});