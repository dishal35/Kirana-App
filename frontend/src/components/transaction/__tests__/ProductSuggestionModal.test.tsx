/**
 * Product Suggestion Modal Component Tests
 * 
 * Tests the enhanced product suggestion modal with new product creation
 * and integration with EnhancedTransactionService.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { ProductSuggestionModal } from '../ProductSuggestionModal';
import { enhancedTransactionService } from '../../../services/EnhancedTransactionService';
import { productRepository } from '../../../dbs/repo';
import type { Product, AudioQualityMetrics } from '../../../types';

// Mock dependencies
vi.mock('../../../services/EnhancedTransactionService');
vi.mock('../../../dbs/repo');

const mockEnhancedTransactionService = enhancedTransactionService as any;
const mockProductRepository = productRepository as any;

describe('ProductSuggestionModal', () => {
  let mockProducts: Product[];
  let mockSuggestedProducts: Product[];
  let mockAudioQuality: AudioQualityMetrics;
  let mockOnTransactionCompleted: MockedFunction<(transactionId: string) => void>;
  let mockOnError: MockedFunction<(error: string) => void>;
  let mockOnClose: MockedFunction<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProducts = [
      {
        id: 'product-1',
        name: 'Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 10,
        category: 'Groceries',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'product-2',
        name: 'Tea',
        price: 20,
        stock: 50,
        reorderThreshold: 5,
        category: 'Beverages',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockSuggestedProducts = [mockProducts[0]];

    mockAudioQuality = {
      volume: 0.8,
      noiseLevel: 0.2,
      clarity: 0.9,
      isAcceptable: true
    };

    mockOnTransactionCompleted = vi.fn();
    mockOnError = vi.fn();
    mockOnClose = vi.fn();

    // Setup mock implementations
    mockProductRepository.getAll.mockResolvedValue(mockProducts);
    mockEnhancedTransactionService.createTransaction.mockResolvedValue({
      id: 'transaction-1',
      amount: 50,
      products: [{ productId: 'product-1', quantity: 1, unitPrice: 50 }],
      type: 'upi',
      timestamp: new Date()
    });
    mockEnhancedTransactionService.addNewProduct.mockResolvedValue({
      id: 'new-product-1',
      name: 'New Product',
      price: 30,
      stock: 10,
      reorderThreshold: 2,
      category: 'New Category',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    amount: 50,
    suggestedProducts: mockSuggestedProducts,
    transcription: '50 rupees received on PhonePe',
    confidence: 0.9,
    audioQuality: mockAudioQuality,
    onTransactionCompleted: mockOnTransactionCompleted,
    onError: mockOnError
  };

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      expect(screen.getByText('Transaction Detected')).toBeInTheDocument();
      expect(screen.getByText('₹50.00 received via UPI')).toBeInTheDocument();
      expect(screen.getByText('"50 rupees received on PhonePe"')).toBeInTheDocument();
      expect(screen.getByText('Quality: 90%')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 90%')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ProductSuggestionModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Transaction Detected')).not.toBeInTheDocument();
    });

    it('should render payment type toggles', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      expect(screen.getByText('UPI Payment')).toBeInTheDocument();
      expect(screen.getByText('Cash Payment')).toBeInTheDocument();
    });

    it('should render product catalog controls', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByText('Show All Products')).toBeInTheDocument();
    });
  });

  describe('Product Loading', () => {
    it('should load products on mount', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockProductRepository.getAll).toHaveBeenCalled();
      });
    });

    it('should handle product loading errors', async () => {
      mockProductRepository.getAll.mockRejectedValue(new Error('Database error'));

      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to load product catalog');
      });
    });

    it('should auto-select first suggested product', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Selected Products')).toBeInTheDocument();
        expect(screen.getByText('Rice')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Type Selection', () => {
    it('should switch between UPI and Cash payment types', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      const cashButton = screen.getByText('Cash Payment');
      fireEvent.click(cashButton);

      expect(screen.getByText('₹50.00 received via CASH')).toBeInTheDocument();
    });
  });

  describe('New Product Creation', () => {
    it('should show new product form when clicked', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      const addButton = screen.getByText('Add New Product');
      fireEvent.click(addButton);

      expect(screen.getByText('Product Name *')).toBeInTheDocument();
      expect(screen.getByText('Price (₹) *')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Initial Stock')).toBeInTheDocument();
    });

    it('should create new product with valid data', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      // Open form
      fireEvent.click(screen.getByText('Add New Product'));

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter product name'), {
        target: { value: 'New Product' }
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '30' }
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., Groceries, Snacks'), {
        target: { value: 'New Category' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Product'));

      await waitFor(() => {
        expect(mockEnhancedTransactionService.addNewProduct).toHaveBeenCalledWith({
          name: 'New Product',
          price: 30,
          category: 'New Category',
          initialStock: 1,
          reorderThreshold: 1,
          imageUrl: undefined
        });
      });
    });

    it('should validate required fields', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      // Open form
      fireEvent.click(screen.getByText('Add New Product'));

      // Try to submit without required fields
      const createButton = screen.getByText('Create Product');
      expect(createButton).toBeDisabled();
    });

    it('should handle product creation errors', async () => {
      mockEnhancedTransactionService.addNewProduct.mockRejectedValue(
        new Error('Product creation failed')
      );

      render(<ProductSuggestionModal {...defaultProps} />);

      // Open form and fill
      fireEvent.click(screen.getByText('Add New Product'));
      fireEvent.change(screen.getByPlaceholderText('Enter product name'), {
        target: { value: 'New Product' }
      });
      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '30' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Create Product'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Product creation failed');
      });
    });

    it('should close form when cancelled', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      // Open form
      fireEvent.click(screen.getByText('Add New Product'));
      expect(screen.getByText('Product Name *')).toBeInTheDocument();

      // Cancel form
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Product Name *')).not.toBeInTheDocument();
    });
  });

  describe('Product Selection and Quantities', () => {
    it('should handle product selection', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Selected Products')).toBeInTheDocument();
      });

      // Should have auto-selected Rice
      expect(screen.getByText('Rice')).toBeInTheDocument();
      expect(screen.getByText('₹50 each')).toBeInTheDocument();
    });

    it('should calculate total correctly', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Confirm Sale (₹50.00)')).toBeInTheDocument();
      });
    });
  });

  describe('Transaction Confirmation', () => {
    it('should create transaction successfully', async () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Sale (₹50.00)');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockEnhancedTransactionService.createTransaction).toHaveBeenCalledWith({
          amount: 50,
          transcription: '50 rupees received on PhonePe',
          selectedProducts: [
            {
              productId: 'product-1',
              quantity: 1,
              unitPrice: 50
            }
          ],
          paymentType: 'upi',
          confidence: 0.9
        });
        expect(mockOnTransactionCompleted).toHaveBeenCalledWith('transaction-1');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle transaction creation errors', async () => {
      mockEnhancedTransactionService.createTransaction.mockRejectedValue(
        new Error('Transaction failed')
      );

      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Sale (₹50.00)');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Transaction failed');
      });
    });

    it('should prevent confirmation without selected products', async () => {
      render(<ProductSuggestionModal {...defaultProps} suggestedProducts={[]} />);

      await waitFor(() => {
        const confirmButton = screen.getByText(/Confirm Sale/);
        expect(confirmButton).toBeDisabled();
      });
    });

    it('should show loading state during transaction creation', async () => {
      // Make the service call hang
      mockEnhancedTransactionService.createTransaction.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<ProductSuggestionModal {...defaultProps} />);

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Sale (₹50.00)');
        fireEvent.click(confirmButton);
      });

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Quick Confirm Functionality', () => {
    it('should auto-confirm for close amount matches', async () => {
      const props = {
        ...defaultProps,
        amount: 50, // Exact match with Rice price
        suggestedProducts: [mockProducts[0]]
      };

      render(<ProductSuggestionModal {...props} />);

      // Should auto-confirm after a short delay
      await waitFor(() => {
        expect(mockEnhancedTransactionService.createTransaction).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Modal State Management', () => {
    it('should reset state when modal closes', () => {
      const { rerender } = render(<ProductSuggestionModal {...defaultProps} />);

      // Open form
      fireEvent.click(screen.getByText('Add New Product'));
      expect(screen.getByText('Product Name *')).toBeInTheDocument();

      // Close modal
      rerender(<ProductSuggestionModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<ProductSuggestionModal {...defaultProps} isOpen={true} />);
      
      // Form should be closed
      expect(screen.queryByText('Product Name *')).not.toBeInTheDocument();
    });

    it('should handle close button click', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle cancel button click', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Audio Quality Display', () => {
    it('should display audio quality information', () => {
      render(<ProductSuggestionModal {...defaultProps} />);

      expect(screen.getByText('Quality: 90%')).toBeInTheDocument();
      expect(screen.getByText('Audio Quality: Good')).toBeInTheDocument();
    });

    it('should handle poor audio quality', () => {
      const poorQuality: AudioQualityMetrics = {
        volume: 0.3,
        noiseLevel: 0.8,
        clarity: 0.2,
        isAcceptable: false
      };

      render(<ProductSuggestionModal {...defaultProps} audioQuality={poorQuality} />);

      expect(screen.getByText('Quality: 20%')).toBeInTheDocument();
      expect(screen.getByText('Audio Quality: Poor')).toBeInTheDocument();
    });

    it('should handle missing audio quality', () => {
      render(<ProductSuggestionModal {...defaultProps} audioQuality={undefined} />);

      expect(screen.queryByText(/Quality:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Audio Quality:/)).not.toBeInTheDocument();
    });
  });
});