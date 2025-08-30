import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ProductCatalogGrid } from '../ProductCatalogGrid';
import { Product } from '../../../types';
import { SelectedProduct } from '../TransactionConfirmationModal';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Rice 1kg',
    price: 50,
    stock: 10,
    reorderThreshold: 5,
    category: 'Grains',
    imageUrl: 'https://example.com/rice.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Tea Powder',
    price: 25,
    stock: 2, // Low stock
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

const mockSelectedProducts: SelectedProduct[] = [
  {
    product: mockProducts[0],
    quantity: 2
  }
];

const defaultProps = {
  products: mockProducts,
  onProductSelect: vi.fn(),
  selectedProducts: [],
  showQuickConfirm: false
};

describe('ProductCatalogGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all products', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    expect(screen.getByText('Rice 1kg')).toBeInTheDocument();
    expect(screen.getByText('Tea Powder')).toBeInTheDocument();
    expect(screen.getByText('Biscuits')).toBeInTheDocument();
  });

  it('displays product information correctly', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    // Check Rice product details
    expect(screen.getByText('Rice 1kg')).toBeInTheDocument();
    expect(screen.getByText('₹50.00')).toBeInTheDocument();
    expect(screen.getByText('Stock: 10')).toBeInTheDocument();
    expect(screen.getByText('Grains')).toBeInTheDocument();
  });

  it('shows product images when available', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    const riceImage = screen.getByAltText('Rice 1kg');
    expect(riceImage).toBeInTheDocument();
    expect(riceImage).toHaveAttribute('src', 'https://example.com/rice.jpg');
  });

  it('shows placeholder for products without images', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    // Tea Powder doesn't have an image, should show SVG placeholder
    const teaSection = screen.getByText('Tea Powder').closest('div');
    expect(teaSection?.querySelector('svg')).toBeInTheDocument();
  });

  it('handles product selection', () => {
    const onProductSelect = vi.fn();
    render(<ProductCatalogGrid {...defaultProps} onProductSelect={onProductSelect} />);
    
    const riceProduct = screen.getByText('Rice 1kg').closest('div');
    fireEvent.click(riceProduct!);
    
    expect(onProductSelect).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('shows "Add to Sale" button for available products', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    expect(screen.getAllByText('Add to Sale')).toHaveLength(2); // Rice and Tea (Biscuits is out of stock)
  });

  it('shows "Add More" button for already selected products', () => {
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        selectedProducts={mockSelectedProducts}
      />
    );
    
    expect(screen.getByText('Add More')).toBeInTheDocument();
    expect(screen.getByText('Add to Sale')).toBeInTheDocument(); // For Tea Powder
  });

  it('displays selected quantity indicator', () => {
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        selectedProducts={mockSelectedProducts}
      />
    );
    
    // Should show quantity badge for selected Rice
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows out of stock indicator', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows low stock indicator', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('disables interaction for out of stock products', () => {
    const onProductSelect = vi.fn();
    render(<ProductCatalogGrid {...defaultProps} onProductSelect={onProductSelect} />);
    
    const biscuitsProduct = screen.getByText('Biscuits').closest('div');
    fireEvent.click(biscuitsProduct!);
    
    // Should not call onProductSelect for out of stock items
    expect(onProductSelect).not.toHaveBeenCalledWith(mockProducts[2]);
  });

  it('applies correct styling for out of stock products', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    const biscuitsProduct = screen.getByText('Biscuits').closest('div');
    expect(biscuitsProduct).toHaveClass('opacity-60');
  });

  it('applies correct styling for selected products', () => {
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        selectedProducts={mockSelectedProducts}
      />
    );
    
    const riceProduct = screen.getByText('Rice 1kg').closest('div');
    expect(riceProduct).toHaveClass('bg-blue-50', 'border-blue-300');
  });

  it('shows quick confirm buttons when enabled', () => {
    const onQuickConfirm = vi.fn();
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        onQuickConfirm={onQuickConfirm}
        showQuickConfirm={true}
      />
    );
    
    expect(screen.getAllByText('Quick Confirm')).toHaveLength(2); // Rice and Tea (not Biscuits)
  });

  it('handles quick confirm action', () => {
    const onQuickConfirm = vi.fn();
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        onQuickConfirm={onQuickConfirm}
        showQuickConfirm={true}
      />
    );
    
    const quickConfirmButtons = screen.getAllByText('Quick Confirm');
    fireEvent.click(quickConfirmButtons[0]);
    
    expect(onQuickConfirm).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('prevents event bubbling on button clicks', () => {
    const onProductSelect = vi.fn();
    const onQuickConfirm = vi.fn();
    
    render(
      <ProductCatalogGrid 
        {...defaultProps} 
        onProductSelect={onProductSelect}
        onQuickConfirm={onQuickConfirm}
        showQuickConfirm={true}
      />
    );
    
    const quickConfirmButton = screen.getAllByText('Quick Confirm')[0];
    fireEvent.click(quickConfirmButton);
    
    // Should call onQuickConfirm but not onProductSelect
    expect(onQuickConfirm).toHaveBeenCalledWith(mockProducts[0]);
    expect(onProductSelect).not.toHaveBeenCalled();
  });

  it('shows empty state when no products available', () => {
    render(<ProductCatalogGrid {...defaultProps} products={[]} />);
    
    expect(screen.getByText('No products available')).toBeInTheDocument();
  });

  it('handles products without categories gracefully', () => {
    const productsWithoutCategory = [
      {
        ...mockProducts[0],
        category: ''
      }
    ];
    
    render(<ProductCatalogGrid {...defaultProps} products={productsWithoutCategory} />);
    
    expect(screen.getByText('Rice 1kg')).toBeInTheDocument();
    // Should not crash when category is empty
  });

  it('displays correct grid layout classes', () => {
    const { container } = render(<ProductCatalogGrid {...defaultProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
  });

  it('shows stock information for all products', () => {
    render(<ProductCatalogGrid {...defaultProps} />);
    
    expect(screen.getByText('Stock: 10')).toBeInTheDocument(); // Rice
    expect(screen.getByText('Stock: 2')).toBeInTheDocument();  // Tea
    expect(screen.getByText('Stock: 0')).toBeInTheDocument();  // Biscuits
  });

  it('handles missing product IDs gracefully', () => {
    const productsWithoutId = [
      {
        ...mockProducts[0],
        id: undefined
      }
    ];
    
    // Should not crash when product ID is missing
    expect(() => {
      render(<ProductCatalogGrid {...defaultProps} products={productsWithoutId as Product[]} />);
    }).not.toThrow();
  });
});