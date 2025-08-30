import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TransactionSummary } from '../TransactionSummary';

const defaultProps = {
  originalAmount: 100,
  calculatedTotal: 100,
  amountDifference: 0,
  selectedProductsCount: 2
};

describe('TransactionSummary', () => {
  it('renders transaction summary header', () => {
    render(<TransactionSummary {...defaultProps} />);
    
    expect(screen.getByText('Transaction Summary')).toBeInTheDocument();
  });

  it('displays amount breakdown correctly', () => {
    render(<TransactionSummary {...defaultProps} />);
    
    expect(screen.getByText('Amount Received:')).toBeInTheDocument();
    expect(screen.getAllByText('₹100.00')).toHaveLength(2); // Should appear twice (received and total)
    expect(screen.getByText('Selected Products Total:')).toBeInTheDocument();
  });

  it('shows perfect match for exact amounts', () => {
    render(<TransactionSummary {...defaultProps} />);
    
    expect(screen.getByText('Perfect match!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows positive difference when calculated total is higher', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={120}
        amountDifference={20}
      />
    );
    
    expect(screen.getByText('₹20.00 more than received')).toBeInTheDocument();
  });

  it('shows negative difference when calculated total is lower', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={80}
        amountDifference={-20}
      />
    );
    
    expect(screen.getByText('₹20.00 less than received')).toBeInTheDocument();
  });

  it('calculates accuracy percentage correctly', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={90}
        amountDifference={-10}
      />
    );
    
    // 10% difference should show 90% accuracy
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('shows correct color coding for different accuracy levels', () => {
    const { rerender } = render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={95}
        amountDifference={-5}
      />
    );
    
    // 95% accuracy should show green
    let progressBar = document.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();
    
    // 85% accuracy should show yellow
    rerender(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={85}
        amountDifference={-15}
      />
    );
    
    progressBar = document.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();
    
    // 70% accuracy should show red
    rerender(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={70}
        amountDifference={-30}
      />
    );
    
    progressBar = document.querySelector('.bg-red-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays product count information', () => {
    render(<TransactionSummary {...defaultProps} />);
    
    expect(screen.getByText('• 2 products selected')).toBeInTheDocument();
  });

  it('handles singular product count', () => {
    render(<TransactionSummary {...defaultProps} selectedProductsCount={1} />);
    
    expect(screen.getByText('• 1 product selected')).toBeInTheDocument();
  });

  it('shows warning note for significant differences', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={120}
        amountDifference={20}
      />
    );
    
    expect(screen.getByText(/You may need to collect additional payment/)).toBeInTheDocument();
  });

  it('shows change note for negative differences', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={80}
        amountDifference={-20}
      />
    );
    
    expect(screen.getByText(/You may need to provide change/)).toBeInTheDocument();
  });

  it('shows empty state when no products selected', () => {
    render(<TransactionSummary {...defaultProps} selectedProductsCount={0} />);
    
    expect(screen.getByText('Select products to see transaction details')).toBeInTheDocument();
  });

  it('displays correct icons for different difference states', () => {
    const { rerender } = render(<TransactionSummary {...defaultProps} />);
    
    // Perfect match should show checkmark
    let icon = document.querySelector('svg.text-green-600');
    expect(icon).toBeInTheDocument();
    
    // Positive difference should show warning icon
    rerender(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={120}
        amountDifference={20}
      />
    );
    
    icon = document.querySelector('svg.text-orange-600');
    expect(icon).toBeInTheDocument();
    
    // Negative difference should show error icon
    rerender(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={80}
        amountDifference={-20}
      />
    );
    
    icon = document.querySelector('svg.text-red-600');
    expect(icon).toBeInTheDocument();
  });

  it('handles zero original amount edge case', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        originalAmount={0}
        calculatedTotal={50}
        amountDifference={50}
      />
    );
    
    // Should still show 100% accuracy for zero original amount
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles very small differences as perfect match', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={100.005}
        amountDifference={0.005}
      />
    );
    
    // Differences less than 0.01 should be treated as perfect match
    expect(screen.getByText('Perfect match!')).toBeInTheDocument();
  });

  it('formats currency amounts correctly', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        originalAmount={123.45}
        calculatedTotal={98.76}
        amountDifference={-24.69}
      />
    );
    
    expect(screen.getByText('₹123.45')).toBeInTheDocument();
    expect(screen.getByText('₹98.76')).toBeInTheDocument();
    expect(screen.getByText('₹24.69 less than received')).toBeInTheDocument();
  });

  it('shows progress bar with correct width', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={90}
        amountDifference={-10}
      />
    );
    
    const progressBar = document.querySelector('.h-2.rounded-full:not(.bg-gray-200)');
    expect(progressBar).toHaveStyle({ width: '90%' });
  });

  it('handles large amounts correctly', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        originalAmount={99999.99}
        calculatedTotal={99999.99}
        amountDifference={0}
      />
    );
    
    expect(screen.getAllByText('₹99999.99')).toHaveLength(2); // Should appear twice
    expect(screen.getByText('Perfect match!')).toBeInTheDocument();
  });

  it('shows appropriate styling for warning notes', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        calculatedTotal={120}
        amountDifference={20}
      />
    );
    
    const warningNote = screen.getByText(/You may need to collect additional payment/).closest('div');
    expect(warningNote).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('rounds accuracy percentage correctly', () => {
    render(
      <TransactionSummary 
        {...defaultProps} 
        originalAmount={100}
        calculatedTotal={96.7}
        amountDifference={-3.3}
      />
    );
    
    // 96.7% should round to 97%
    expect(screen.getByText('97%')).toBeInTheDocument();
  });
});