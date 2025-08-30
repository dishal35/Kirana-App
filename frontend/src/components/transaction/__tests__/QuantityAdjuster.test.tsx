import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { QuantityAdjuster } from '../QuantityAdjuster';

const defaultProps = {
  quantity: 5,
  maxQuantity: 10,
  onQuantityChange: vi.fn()
};

describe('QuantityAdjuster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct initial quantity', () => {
    render(<QuantityAdjuster {...defaultProps} />);
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('shows max quantity indicator', () => {
    render(<QuantityAdjuster {...defaultProps} />);
    
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('increases quantity when plus button is clicked', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseButton);
    
    expect(onQuantityChange).toHaveBeenCalledWith(6);
  });

  it('decreases quantity when minus button is clicked', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseButton);
    
    expect(onQuantityChange).toHaveBeenCalledWith(4);
  });

  it('handles direct input changes', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '7' } });
    
    expect(onQuantityChange).toHaveBeenCalledWith(7);
  });

  it('clamps input values to valid range', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const input = screen.getByDisplayValue('5');
    
    // Test upper bound
    fireEvent.change(input, { target: { value: '15' } });
    expect(onQuantityChange).toHaveBeenCalledWith(10); // Clamped to maxQuantity
    
    // Test lower bound
    fireEvent.change(input, { target: { value: '-5' } });
    expect(onQuantityChange).toHaveBeenCalledWith(0); // Clamped to minQuantity (default 0)
  });

  it('respects custom minQuantity', () => {
    const onQuantityChange = vi.fn();
    const { rerender } = render(
      <QuantityAdjuster 
        {...defaultProps} 
        quantity={3}
        minQuantity={2}
        onQuantityChange={onQuantityChange} 
      />
    );
    
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseButton); // Should go to 2
    
    expect(onQuantityChange).toHaveBeenCalledWith(2);
    expect(onQuantityChange).toHaveBeenCalledTimes(1);
    
    // Test that it won't go below minQuantity
    vi.clearAllMocks();
    
    // Re-render with quantity at minimum
    rerender(
      <QuantityAdjuster 
        {...defaultProps} 
        quantity={2}
        minQuantity={2}
        onQuantityChange={onQuantityChange} 
      />
    );
    
    const decreaseButtonAtMin = screen.getByLabelText('Decrease quantity');
    fireEvent.click(decreaseButtonAtMin); // Should not call onQuantityChange
    
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('disables decrease button at minimum quantity', () => {
    render(<QuantityAdjuster {...defaultProps} quantity={0} />);
    
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    expect(decreaseButton).toBeDisabled();
  });

  it('disables increase button at maximum quantity', () => {
    render(<QuantityAdjuster {...defaultProps} quantity={10} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    expect(increaseButton).toBeDisabled();
  });

  it('applies correct styling for disabled buttons', () => {
    render(<QuantityAdjuster {...defaultProps} quantity={0} />);
    
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    expect(decreaseButton).toHaveClass('cursor-not-allowed', 'text-gray-400');
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(<QuantityAdjuster {...defaultProps} size="sm" />);
    
    let input = screen.getByDisplayValue('5');
    expect(input).toHaveClass('w-12', 'h-6', 'text-sm');
    
    rerender(<QuantityAdjuster {...defaultProps} size="lg" />);
    input = screen.getByDisplayValue('5');
    expect(input).toHaveClass('w-20', 'h-10', 'text-lg');
  });

  it('handles disabled state', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} disabled={true} onQuantityChange={onQuantityChange} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    const input = screen.getByDisplayValue('5');
    
    expect(increaseButton).toBeDisabled();
    expect(decreaseButton).toBeDisabled();
    expect(input).toBeDisabled();
    
    // Test that interactions don't work when disabled
    fireEvent.click(increaseButton);
    fireEvent.click(decreaseButton);
    fireEvent.change(input, { target: { value: '8' } });
    
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('handles invalid input gracefully', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const input = screen.getByDisplayValue('5');
    
    // Test non-numeric input
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onQuantityChange).toHaveBeenCalledWith(0); // Should default to 0 for invalid input
    
    // Test empty input
    fireEvent.change(input, { target: { value: '' } });
    expect(onQuantityChange).toHaveBeenCalledWith(0);
  });

  it('shows correct button hover states', () => {
    render(<QuantityAdjuster {...defaultProps} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    expect(increaseButton).toHaveClass('hover:bg-gray-100');
  });

  it('has proper accessibility attributes', () => {
    render(<QuantityAdjuster {...defaultProps} />);
    
    const input = screen.getByLabelText('Quantity');
    const increaseButton = screen.getByLabelText('Increase quantity');
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
    
    expect(increaseButton).toHaveAttribute('aria-label', 'Increase quantity');
    expect(decreaseButton).toHaveAttribute('aria-label', 'Decrease quantity');
  });

  it('handles edge case with zero max quantity', () => {
    render(<QuantityAdjuster {...defaultProps} maxQuantity={0} quantity={0} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    const decreaseButton = screen.getByLabelText('Decrease quantity');
    
    expect(increaseButton).toBeDisabled();
    expect(decreaseButton).toBeDisabled();
    expect(screen.getByText('/ 0')).toBeInTheDocument();
  });

  it('maintains focus on input after button interactions', () => {
    render(<QuantityAdjuster {...defaultProps} />);
    
    const input = screen.getByDisplayValue('5');
    const increaseButton = screen.getByLabelText('Increase quantity');
    
    input.focus();
    fireEvent.click(increaseButton);
    
    // Input should maintain focus for better UX
    expect(document.activeElement).toBe(input);
  });

  it('handles rapid button clicks correctly', () => {
    const onQuantityChange = vi.fn();
    render(<QuantityAdjuster {...defaultProps} onQuantityChange={onQuantityChange} />);
    
    const increaseButton = screen.getByLabelText('Increase quantity');
    
    // Simulate rapid clicks
    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);
    
    expect(onQuantityChange).toHaveBeenCalledTimes(3);
    expect(onQuantityChange).toHaveBeenNthCalledWith(1, 6);
    expect(onQuantityChange).toHaveBeenNthCalledWith(2, 6); // Should still be 6 since quantity prop hasn't updated
    expect(onQuantityChange).toHaveBeenNthCalledWith(3, 6);
  });
});