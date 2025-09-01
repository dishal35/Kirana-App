import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedStockAdjustmentModal } from '../EnhancedStockAdjustmentModal';
import type { Product, InventoryAdjustment } from '../../../types';

describe('EnhancedStockAdjustmentModal', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    price: 100,
    stock: 20,
    reorderThreshold: 5,
    category: 'Test Category',
    expiryDate: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  it('should render when open with product', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Enhanced Stock Adjustment')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Current Stock: 20')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('Enhanced Stock Adjustment')).not.toBeInTheDocument();
  });

  it('should not render when product is null', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={null}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('Enhanced Stock Adjustment')).not.toBeInTheDocument();
  });

  it('should display product information correctly', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Current Stock: 20')).toBeInTheDocument();
    expect(screen.getByText('Reorder Threshold: 5')).toBeInTheDocument();
    expect(screen.getByText('Price: ₹100')).toBeInTheDocument();
    expect(screen.getByText('Current Expiry: 31/12/2024')).toBeInTheDocument();
  });

  it('should show reason codes based on adjustment type', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const typeSelect = screen.getByDisplayValue('Manual Adjustment');
    fireEvent.change(typeSelect, { target: { value: 'restock' } });

    await waitFor(() => {
      const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
      fireEvent.click(reasonSelect);
      expect(screen.getByText('Supplier Delivery')).toBeInTheDocument();
      expect(screen.getByText('Transfer from Another Location')).toBeInTheDocument();
    });
  });

  it('should calculate new stock correctly', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    await waitFor(() => {
      expect(screen.getByText('New stock: 25')).toBeInTheDocument();
    });

    fireEvent.change(quantityInput, { target: { value: '-10' } });

    await waitFor(() => {
      expect(screen.getByText('New stock: 10')).toBeInTheDocument();
    });
  });

  it('should show custom reason field when custom is selected', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'CUSTOM' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Custom Reason')).toBeInTheDocument();
    });
  });

  it('should show expiry date field when update expiry is checked', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const updateExpiryCheckbox = screen.getByLabelText('Update Expiry Date');
    fireEvent.click(updateExpiryCheckbox);

    await waitFor(() => {
      expect(screen.getByLabelText('New Expiry Date')).toBeInTheDocument();
    });
  });

  it('should validate quantity input', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid quantity')).toBeInTheDocument();
    });
  });

  it('should validate reason input', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select a reason code or provide a custom reason')).toBeInTheDocument();
    });
  });

  it('should validate stock reduction limits', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '-25' } }); // More than current stock

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'MANUAL_OVERRIDE' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Cannot reduce stock by 25/)).toBeInTheDocument();
    });
  });

  it('should submit adjustment with reason code', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '10' } });

    const typeSelect = screen.getByDisplayValue('Manual Adjustment');
    fireEvent.change(typeSelect, { target: { value: 'restock' } });

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'SUPPLIER_DELIVERY' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        productId: '1',
        quantityChange: 10,
        reason: 'Supplier Delivery',
        reasonCode: 'SUPPLIER_DELIVERY',
        type: 'restock',
        expiryDate: undefined
      });
    });
  });

  it('should submit adjustment with custom reason', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'CUSTOM' } });

    const customReasonInput = screen.getByLabelText('Custom Reason');
    fireEvent.change(customReasonInput, { target: { value: 'Custom adjustment reason' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        productId: '1',
        quantityChange: 5,
        reason: 'Custom adjustment reason',
        reasonCode: 'CUSTOM',
        type: 'adjustment',
        expiryDate: undefined
      });
    });
  });

  it('should submit adjustment with expiry date update', async () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '0' } });

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'MANUAL_OVERRIDE' } });

    const updateExpiryCheckbox = screen.getByLabelText('Update Expiry Date');
    fireEvent.click(updateExpiryCheckbox);

    const expiryInput = screen.getByLabelText('New Expiry Date');
    fireEvent.change(expiryInput, { target: { value: '2025-01-15' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        productId: '1',
        quantityChange: 0,
        reason: 'Manual Override',
        reasonCode: 'MANUAL_OVERRIDE',
        type: 'adjustment',
        expiryDate: new Date('2025-01-15')
      });
    });
  });

  it('should handle submission errors', async () => {
    mockOnConfirm.mockRejectedValue(new Error('Adjustment failed'));

    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'MANUAL_OVERRIDE' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Adjustment failed')).toBeInTheDocument();
    });
  });

  it('should close modal on cancel', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on X button click', () => {
    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable form during submission', async () => {
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <EnhancedStockAdjustmentModal
        product={mockProduct}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const quantityInput = screen.getByPlaceholderText('Enter positive or negative number');
    fireEvent.change(quantityInput, { target: { value: '5' } });

    const reasonSelect = screen.getByRole('combobox', { name: /reason code/i });
    fireEvent.change(reasonSelect, { target: { value: 'MANUAL_OVERRIDE' } });

    const submitButton = screen.getByText('Adjust Stock');
    fireEvent.click(submitButton);

    expect(screen.getByText('Adjusting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});