/**
 * Test to verify TransactionConfirmationModal fix
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TransactionConfirmationModal } from '../LazyComponents';

// Mock the lazy component
vi.mock('../transaction/TransactionConfirmationModal', () => ({
  TransactionConfirmationModal: ({ amount, isOpen }: any) => (
    isOpen ? <div data-testid="modal">Amount: {amount}</div> : null
  )
}));

describe('TransactionConfirmationModal Wrapper Fix', () => {
  it('should handle undefined transactionResult gracefully', () => {
    const props = {
      isOpen: true,
      transactionResult: undefined,
      products: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn()
    };

    render(<TransactionConfirmationModal {...props} />);
    
    // Should render with amount 0 instead of crashing
    expect(screen.getByTestId('modal')).toHaveTextContent('Amount: 0');
  });

  it('should handle transactionResult with amount', () => {
    const props = {
      isOpen: true,
      transactionResult: { amount: 150 },
      products: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn()
    };

    render(<TransactionConfirmationModal {...props} />);
    
    expect(screen.getByTestId('modal')).toHaveTextContent('Amount: 150');
  });

  it('should not render when closed', () => {
    const props = {
      isOpen: false,
      transactionResult: { amount: 150 },
      products: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn()
    };

    render(<TransactionConfirmationModal {...props} />);
    
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });
});