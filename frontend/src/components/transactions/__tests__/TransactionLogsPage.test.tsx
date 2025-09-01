import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TransactionLogsPage } from '../TransactionLogsPage';
import { useApp } from '../../../contexts/AppContext';
import { transactionRepository, productRepository } from '../../../dbs/repo';
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

const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 100,
    products: [
      { productId: 'p1', quantity: 2, unitPrice: 50 }
    ],
    type: 'upi',
    timestamp: new Date('2024-01-15T10:30:00'),
    transcription: 'Received 100 rupees on PhonePe',
    confidence: 0.95
  },
  {
    id: '2',
    amount: 250,
    products: [
      { productId: 'p2', quantity: 1, unitPrice: 250 }
    ],
    type: 'cash',
    timestamp: new Date('2024-01-15T14:20:00'),
    transcription: undefined,
    confidence: undefined
  },
  {
    id: '3',
    amount: 75,
    products: [
      { productId: 'p1', quantity: 1, unitPrice: 50 },
      { productId: 'p3', quantity: 1, unitPrice: 25 }
    ],
    type: 'upi',
    timestamp: new Date('2024-01-14T09:15:00'),
    transcription: 'GPay payment received 75 rupees',
    confidence: 0.88
  }
];

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
    price: 250,
    stock: 10,
    reorderThreshold: 3,
    category: 'Dairy',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p3',
    name: 'Biscuits',
    price: 25,
    stock: 15,
    reorderThreshold: 5,
    category: 'Snacks',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockAppState = {
  language: 'en' as const,
  todaysTransactions: mockTransactions,
  products: mockProducts
};

describe('TransactionLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useApp as any).mockReturnValue({
      state: mockAppState
    });

    (transactionRepository.getAll as any).mockResolvedValue(mockTransactions);
    (productRepository.getAll as any).mockResolvedValue(mockProducts);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders transaction logs page with header', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Logs')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive transaction history and analytics')).toBeInTheDocument();
    });
  });

  it('loads and displays transactions', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText('₹250')).toBeInTheDocument();
      expect(screen.getByText('₹75')).toBeInTheDocument();
    });

    expect(transactionRepository.getAll).toHaveBeenCalled();
    expect(productRepository.getAll).toHaveBeenCalled();
  });

  it('displays transaction details correctly', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      // Check UPI transaction
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText(/UPI/)).toBeInTheDocument();
      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      
      // Check cash transaction
      expect(screen.getByText('₹250')).toBeInTheDocument();
      expect(screen.getByText(/CASH/)).toBeInTheDocument();
    });
  });

  it('filters transactions by payment type', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText('₹250')).toBeInTheDocument();
    });

    // Filter by UPI only
    const paymentTypeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(paymentTypeSelect, { target: { value: 'upi' } });

    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText('₹75')).toBeInTheDocument();
      expect(screen.queryByText('₹250')).not.toBeInTheDocument();
    });
  });

  it('filters transactions by amount range', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Set minimum amount filter
    const minAmountInput = screen.getByPlaceholderText('Min amount');
    fireEvent.change(minAmountInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText('₹250')).toBeInTheDocument();
      expect(screen.queryByText('₹75')).not.toBeInTheDocument();
    });
  });

  it('filters transactions by product', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Filter by specific product
    const productSelect = screen.getByDisplayValue('All Products');
    fireEvent.change(productSelect, { target: { value: 'p2' } });

    await waitFor(() => {
      expect(screen.getByText('₹250')).toBeInTheDocument();
      expect(screen.queryByText('₹100')).not.toBeInTheDocument();
      expect(screen.queryByText('₹75')).not.toBeInTheDocument();
    });
  });

  it('searches transactions by text', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Search by transcription text
    const searchInput = screen.getByPlaceholderText('Search by transcription, amount, or product name...');
    fireEvent.change(searchInput, { target: { value: 'PhonePe' } });

    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.queryByText('₹250')).not.toBeInTheDocument();
      expect(screen.queryByText('₹75')).not.toBeInTheDocument();
    });
  });

  it('shows analytics when toggled', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Show Analytics')).toBeInTheDocument();
    });

    // Toggle analytics
    const analyticsButton = screen.getByText('Show Analytics');
    fireEvent.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByText('Analytics Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
      expect(screen.getByText('Top Selling Products')).toBeInTheDocument();
    });
  });

  it('calculates analytics correctly', async () => {
    render(<TransactionLogsPage />);
    
    // Show analytics
    const analyticsButton = screen.getByText('Show Analytics');
    fireEvent.click(analyticsButton);

    await waitFor(() => {
      // Total revenue should be 100 + 250 + 75 = 425
      expect(screen.getByText('₹425')).toBeInTheDocument();
      
      // Total transactions should be 3
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // UPI percentage should be 66.7% (2 out of 3 transactions)
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });
  });

  it('opens transaction detail modal', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Click on a transaction
    const transactionRow = screen.getByText('₹100').closest('div');
    fireEvent.click(transactionRow!);

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
      expect(screen.getByText('Audio Transcription')).toBeInTheDocument();
      expect(screen.getByText('"Received 100 rupees on PhonePe"')).toBeInTheDocument();
    });
  });

  it('closes transaction detail modal', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Open modal
    const transactionRow = screen.getByText('₹100').closest('div');
    fireEvent.click(transactionRow!);

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    // Create more transactions to test pagination
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `tx-${i}`,
      amount: 100 + i,
      products: [{ productId: 'p1', quantity: 1, unitPrice: 100 + i }],
      type: 'upi' as const,
      timestamp: new Date(`2024-01-${15 + i}T10:00:00`),
      transcription: `Transaction ${i}`,
      confidence: 0.9
    }));

    (transactionRepository.getAll as any).mockResolvedValue(manyTransactions);

    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Go to next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });

  it('exports transactions as CSV', async () => {
    // Mock document.createElement and appendChild
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

    // Click export CSV
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('exports transactions as JSON', async () => {
    // Mock document.createElement and appendChild
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
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });

    // Click export JSON
    const exportButton = screen.getByText('Export JSON');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('clears filters correctly', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('₹100')).toBeInTheDocument();
    });

    // Apply some filters
    const paymentTypeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(paymentTypeSelect, { target: { value: 'upi' } });

    const searchInput = screen.getByPlaceholderText('Search by transcription, amount, or product name...');
    fireEvent.change(searchInput, { target: { value: 'PhonePe' } });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(paymentTypeSelect).toHaveValue('all');
      expect(searchInput).toHaveValue('');
    });
  });

  it('handles loading state', () => {
    (transactionRepository.getAll as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TransactionLogsPage />);
    
    expect(screen.getByText('Loading transaction logs...')).toBeInTheDocument();
  });

  it('handles empty transaction list', async () => {
    (transactionRepository.getAll as any).mockResolvedValue([]);

    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No transactions found matching your filters')).toBeInTheDocument();
    });
  });

  it('displays product names in transaction details', async () => {
    render(<TransactionLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Products: Bread \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Products: Milk \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Products: Bread \(1\), Biscuits \(1\)/)).toBeInTheDocument();
    });
  });
});