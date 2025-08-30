import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TransactionConfirmationModal } from '../TransactionConfirmationModal';
import { Product, Transaction } from '../../../types';
import * as repo from '../../../dbs/repo';

// Mock the repository
vi.mock('../../../dbs/repo', () => ({
  productRepository: {
    getAll: vi.fn(),
    updateStock: vi.fn()
  },
  transactionRepository: {
    create: vi.fn()
  }
}));

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Rice 1kg',
    price: 50,
    stock: 10,
    reorderThreshold: 5,
    category: 'Grains',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Tea Powder',
    price: 25,
    stock: 8,
    reorderThreshold: 3,
    category: 'Beverages',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Biscuits',
    price: 30,
    stock: 0, // Out of stock
    reorderThreshold: 2,
    category: 'Snacks',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  amount: 50,
  suggestedProducts: [mockProducts[0], mockProducts[1]],
  transcription: 'Fifty rupees received on PhonePe',
  confidence: 0.95,
  onTransactionConfirmed: vi.fn()
};

describe('TransactionConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repo.productRepository.getAll as any).mockResolvedValue(mockProducts);
    (repo.transactionRepository.create as any).mockResolvedValue('transaction-123');
    (repo.productRepository.updateStock as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    expect(screen.getByText('Transaction Received')).toBeInTheDocument();
    expect(screen.getByText('₹50.00 received via UPI')).toBeInTheDocument();
    expect(screen.getByText('"Fifty rupees received on PhonePe"')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<TransactionConfirmationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Transaction Received')).not.toBeInTheDocument();
  });

  it('displays suggested products', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rice 1kg')).toBeInTheDocument();
      expect(screen.getByText('Tea Powder')).toBeInTheDocument();
    });
  });

  it('auto-selects first suggested product', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Selected Products')).toBeInTheDocument();
      expect(screen.getAllByText('Rice 1kg')).toHaveLength(2); // Should appear in both catalog and selected sections
    });
  });

  it('allows product selection from catalog', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const teaProduct = screen.getByText('Tea Powder');
      fireEvent.click(teaProduct);
    });

    // Should show tea powder in selected products
    await waitFor(() => {
      const selectedSection = screen.getByText('Selected Products').parentElement;
      expect(selectedSection).toHaveTextContent('Tea Powder');
    });
  });

  it('handles quantity adjustments', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const increaseButton = screen.getAllByLabelText('Increase quantity')[0];
      fireEvent.click(increaseButton);
    });

    // Check if quantity increased
    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  it('switches between UPI and cash transaction types', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    const cashButton = screen.getByText('Cash Payment');
    fireEvent.click(cashButton);
    
    expect(screen.getByText('₹50.00 received via CASH')).toBeInTheDocument();
  });

  it('shows all products when toggle is clicked', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const showAllButton = screen.getByText('Show All Products');
      fireEvent.click(showAllButton);
    });

    await waitFor(() => {
      expect(screen.getByText('All Products')).toBeInTheDocument();
    });
  });

  it('handles out of stock products correctly', async () => {
    // Mock products including out of stock item
    (repo.productRepository.getAll as any).mockResolvedValue(mockProducts);
    
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const showAllButton = screen.getByText('Show All Products');
      fireEvent.click(showAllButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Biscuits')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('calculates transaction total correctly', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      // Auto-selected Rice 1kg (₹50 x 1 = ₹50)
      expect(screen.getByText('Confirm Sale (₹50.00)')).toBeInTheDocument();
    });

    // Add Tea Powder
    await waitFor(() => {
      const teaProduct = screen.getByText('Tea Powder');
      fireEvent.click(teaProduct);
    });

    await waitFor(() => {
      // Rice ₹50 + Tea ₹25 = ₹75
      expect(screen.getByText('Confirm Sale (₹75.00)')).toBeInTheDocument();
    });
  });

  it('shows transaction summary with amount difference', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Summary')).toBeInTheDocument();
      expect(screen.getByText('Perfect match!')).toBeInTheDocument();
    });
  });

  it('confirms transaction successfully', async () => {
    const onTransactionConfirmed = vi.fn();
    render(
      <TransactionConfirmationModal 
        {...defaultProps} 
        onTransactionConfirmed={onTransactionConfirmed}
      />
    );
    
    await waitFor(() => {
      const confirmButton = screen.getByText(/Confirm Sale/);
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(repo.transactionRepository.create).toHaveBeenCalledWith({
        amount: 50,
        products: [{
          productId: '1',
          quantity: 1,
          unitPrice: 50
        }],
        type: 'upi',
        timestamp: expect.any(Date),
        transcription: 'Fifty rupees received on PhonePe',
        confidence: 0.95
      });
      
      expect(repo.productRepository.updateStock).toHaveBeenCalledWith('1', 9);
      expect(onTransactionConfirmed).toHaveBeenCalled();
    });
  });

  it('prevents confirmation with no products selected', async () => {
    render(<TransactionConfirmationModal {...defaultProps} suggestedProducts={[]} />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText(/Confirm Sale/);
      expect(confirmButton).toBeDisabled();
    });
  });

  it('handles quick confirm for suggested products', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const quickConfirmButton = screen.getAllByText('Quick Confirm')[0];
      fireEvent.click(quickConfirmButton);
    });

    // Should auto-confirm since amount matches exactly
    await waitFor(() => {
      expect(repo.transactionRepository.create).toHaveBeenCalled();
    });
  });

  it('closes modal when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<TransactionConfirmationModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(<TransactionConfirmationModal {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('handles loading state during transaction confirmation', async () => {
    // Mock a delayed response
    (repo.transactionRepository.create as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('transaction-123'), 100))
    );

    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText(/Confirm Sale/);
      fireEvent.click(confirmButton);
    });

    // Should show loading state
    expect(screen.getByText('Confirming...')).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Confirming...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('handles transaction creation errors', async () => {
    (repo.transactionRepository.create as any).mockRejectedValue(new Error('Database error'));
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText(/Confirm Sale/);
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to save transaction. Please try again.');
    });

    alertSpy.mockRestore();
  });

  it('removes product when quantity is set to 0', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      const decreaseButton = screen.getAllByLabelText('Decrease quantity')[0];
      fireEvent.click(decreaseButton);
    });

    // Product should be removed from selected products
    await waitFor(() => {
      expect(screen.queryByText('Selected Products')).not.toBeInTheDocument();
    });
  });

  it('respects stock limits when adjusting quantities', async () => {
    render(<TransactionConfirmationModal {...defaultProps} />);
    
    await waitFor(() => {
      // Try to increase quantity beyond stock (Rice has stock of 10)
      const quantityInput = screen.getByDisplayValue('1');
      fireEvent.change(quantityInput, { target: { value: '15' } });
    });

    await waitFor(() => {
      // Should be clamped to stock limit
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });
});