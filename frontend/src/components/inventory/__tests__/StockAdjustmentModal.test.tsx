import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StockAdjustmentModal } from '../StockAdjustmentModal';
import type { Product, InventoryAdjustment } from '../../../types';

describe('StockAdjustmentModal', () => {
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    price: 100,
    stock: 50,
    reorderThreshold: 10,
    category: 'test',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOnClose = vi.fn();
  const mockOnAdjust = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={false}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    expect(screen.queryByText('Adjust Stock')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    expect(screen.getByRole('heading', { name: 'Adjust Stock' })).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Current Stock: 50')).toBeInTheDocument();
  });

  it('should handle positive stock adjustment', async () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Select restock type
    fireEvent.change(screen.getByDisplayValue('Manual Adjustment'), {
      target: { value: 'restock' }
    });

    // Enter positive quantity
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '20' }
    });

    // Enter reason
    fireEvent.change(screen.getByPlaceholderText('e.g., New delivery from supplier'), {
      target: { value: 'New stock delivery' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(mockOnAdjust).toHaveBeenCalledWith({
        productId: 'product-1',
        quantityChange: 20,
        reason: 'New stock delivery',
        type: 'restock'
      });
    });
  });

  it('should handle negative stock adjustment', async () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Select damage type
    fireEvent.change(screen.getByDisplayValue('Manual Adjustment'), {
      target: { value: 'damage' }
    });

    // Enter negative quantity
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '-5' }
    });

    // Enter reason
    fireEvent.change(screen.getByPlaceholderText('e.g., Damaged during transport'), {
      target: { value: 'Damaged goods' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(mockOnAdjust).toHaveBeenCalledWith({
        productId: 'product-1',
        quantityChange: -5,
        reason: 'Damaged goods',
        type: 'damage'
      });
    });
  });

  it('should show error for invalid quantity', async () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Enter invalid quantity
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: 'invalid' }
    });

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Test reason' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid quantity')).toBeInTheDocument();
    });

    expect(mockOnAdjust).not.toHaveBeenCalled();
  });

  it('should show error for missing reason', async () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Enter quantity but no reason
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '10' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(screen.getByText('Please provide a reason for the adjustment')).toBeInTheDocument();
    });

    expect(mockOnAdjust).not.toHaveBeenCalled();
  });

  it('should show error for excessive negative adjustment', async () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Enter quantity that exceeds current stock
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '-60' }
    });

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Test reason' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot reduce stock by 60. Current stock: 50')).toBeInTheDocument();
    });

    expect(mockOnAdjust).not.toHaveBeenCalled();
  });

  it('should show new stock calculation', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Enter quantity
    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '10' }
    });

    expect(screen.getByText('New stock: 60')).toBeInTheDocument();
  });

  it('should close modal on cancel', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on X button', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    fireEvent.click(screen.getByText('✕'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle adjustment error', async () => {
    const errorMessage = 'Adjustment failed';
    mockOnAdjust.mockRejectedValue(new Error(errorMessage));

    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter positive or negative number'), {
      target: { value: '10' }
    });

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Test reason' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should update placeholder based on adjustment type', () => {
    render(
      <StockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onAdjust={mockOnAdjust}
      />
    );

    // Change to restock
    fireEvent.change(screen.getByDisplayValue('Manual Adjustment'), {
      target: { value: 'restock' }
    });

    expect(screen.getByPlaceholderText('e.g., New delivery from supplier')).toBeInTheDocument();

    // Change to damage
    fireEvent.change(screen.getByDisplayValue('Restock'), {
      target: { value: 'damage' }
    });

    expect(screen.getByPlaceholderText('e.g., Damaged during transport')).toBeInTheDocument();
  });
});