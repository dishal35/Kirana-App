/**
 * Manual Amount Entry Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ManualAmountEntry } from '../ManualAmountEntry';
import * as repo from '../../../dbs/repo';

// Mock the repository
vi.mock('../../../dbs/repo');

// Mock ProductSuggestionModal
vi.mock('../ProductSuggestionModal', () => ({
  ProductSuggestionModal: ({ isOpen, amount, onTransactionCompleted }: any) => (
    isOpen ? (
      <div data-testid="product-suggestion-modal">
        <p>Amount: ₹{amount}</p>
        <button 
          onClick={() => onTransactionCompleted?.('test-transaction-id')}
          data-testid="complete-transaction"
        >
          Complete Transaction
        </button>
      </div>
    ) : null
  )
}));

const mockProducts = [
  {
    id: '1',
    name: 'Milk',
    price: 60,
    stock: 10,
    reorderThreshold: 2,
    category: 'Dairy',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Bread',
    price: 25,
    stock: 5,
    reorderThreshold: 1,
    category: 'Bakery',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('ManualAmountEntry', () => {
  const mockOnTransactionCompleted = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (repo.productRepository.getAll as any).mockResolvedValue(mockProducts);
  });

  it('renders manual amount entry form', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Manual Amount Entry')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument();
    expect(screen.getByText('Select Products')).toBeInTheDocument();
  });

  it('shows quick amount buttons', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('₹25')).toBeInTheDocument();
    expect(screen.getByText('₹50')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('₹1000')).toBeInTheDocument();
  });

  it('allows manual amount entry', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(input, { target: { value: '150' } });

    expect(input).toHaveValue(150);
  });

  it('sets amount when quick button is clicked', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const quickButton = screen.getByText('₹100');
    fireEvent.click(quickButton);

    const input = screen.getByPlaceholderText('Enter amount');
    expect(input).toHaveValue(100);
  });

  it('opens product suggestion modal when valid amount is submitted', async () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText('Enter amount');
    const submitButton = screen.getByText('Select Products');

    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
      expect(screen.getByText('Amount: ₹100')).toBeInTheDocument();
    });
  });

  it('shows error for invalid amount', async () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByText('Select Products');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Please enter a valid amount greater than 0');
    });
  });

  it('shows error for amount too large', async () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText('Enter amount');
    const submitButton = screen.getByText('Select Products');

    fireEvent.change(input, { target: { value: '60000' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Amount too large. Please enter an amount less than ₹50,000');
    });
  });

  it('completes transaction and clears input', async () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText('Enter amount');
    const submitButton = screen.getByText('Select Products');

    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
    });

    const completeButton = screen.getByTestId('complete-transaction');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockOnTransactionCompleted).toHaveBeenCalledWith('test-transaction-id');
      expect(input).toHaveValue(null); // Input should be cleared
    });
  });

  it('disables submit button when no amount entered', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByText('Select Products');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when valid amount entered', () => {
    render(
      <ManualAmountEntry 
        onTransactionCompleted={mockOnTransactionCompleted}
        onError={mockOnError}
      />
    );

    const input = screen.getByPlaceholderText('Enter amount');
    const submitButton = screen.getByText('Select Products');

    fireEvent.change(input, { target: { value: '50' } });
    expect(submitButton).not.toBeDisabled();
  });
});