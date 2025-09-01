/**
 * Product Suggestion Modal
 * 
 * Enhanced modal for product selection and creation within transaction flow.
 * Integrates with EnhancedTransactionService for complete workflow.
 */

import React, { useState, useEffect } from 'react';
import type { Product, AudioQualityMetrics } from '../../types';
import { ProductCatalogGrid } from './ProductCatalogGrid';
import { QuantityAdjuster } from './QuantityAdjuster';
import { TransactionSummary } from './TransactionSummary';
import { enhancedTransactionService, type TransactionCreationData, type ProductCreationData } from '../../services/EnhancedTransactionService';
import { productRepository } from '../../dbs/repo';

export interface ProductSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  suggestedProducts: Product[];
  transcription?: string;
  confidence?: number;
  audioQuality?: AudioQualityMetrics;
  onTransactionCompleted: (transactionId: string) => void;
  onError: (error: string) => void;
}

export interface SelectedProduct {
  product: Product;
  quantity: number;
}

interface NewProductForm {
  name: string;
  price: number;
  category: string;
  initialStock: number;
  reorderThreshold: number;
  imageUrl: string;
}

export const ProductSuggestionModal: React.FC<ProductSuggestionModalProps> = ({
  isOpen,
  onClose,
  amount,
  suggestedProducts,
  transcription,
  confidence,
  audioQuality,
  onTransactionCompleted,
  onError
}) => {
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [paymentType, setPaymentType] = useState<'upi' | 'cash'>('upi');
  const [isLoading, setIsLoading] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>({
    name: '',
    price: 0,
    category: '',
    initialStock: 1,
    reorderThreshold: 1,
    imageUrl: ''
  });

  // Load all products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await productRepository.getAll();
        setAllProducts(products);
      } catch (error) {
        console.error('Failed to load products:', error);
        onError('Failed to load product catalog');
      }
    };

    if (isOpen) {
      loadProducts();
      // Auto-select first suggested product if available
      if (suggestedProducts.length > 0) {
        const firstSuggestion = suggestedProducts[0];
        const suggestedQuantity = Math.max(1, Math.floor(amount / firstSuggestion.price));
        setSelectedProducts([{
          product: firstSuggestion,
          quantity: Math.min(suggestedQuantity, firstSuggestion.stock)
        }]);
      }
    }
  }, [isOpen, suggestedProducts, amount, onError]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProducts([]);
      setShowAllProducts(false);
      setShowNewProductForm(false);
      setPaymentType('upi');
      setNewProductForm({
        name: '',
        price: 0,
        category: '',
        initialStock: 1,
        reorderThreshold: 1,
        imageUrl: ''
      });
    }
  }, [isOpen]);

  const handleProductSelect = (product: Product) => {
    const existingIndex = selectedProducts.findIndex(sp => sp.product.id === product.id);
    
    if (existingIndex >= 0) {
      // Product already selected, increase quantity
      const updated = [...selectedProducts];
      const currentQuantity = updated[existingIndex].quantity;
      if (currentQuantity < product.stock) {
        updated[existingIndex].quantity = currentQuantity + 1;
        setSelectedProducts(updated);
      }
    } else {
      // Add new product
      setSelectedProducts(prev => [...prev, { product, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove product if quantity is 0
      setSelectedProducts(prev => prev.filter(sp => sp.product.id !== productId));
    } else {
      setSelectedProducts(prev => 
        prev.map(sp => 
          sp.product.id === productId 
            ? { ...sp, quantity: Math.min(newQuantity, sp.product.stock) }
            : sp
        )
      );
    }
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, sp) => total + (sp.product.price * sp.quantity), 0);
  };

  const handleCreateNewProduct = async () => {
    if (!newProductForm.name.trim() || newProductForm.price <= 0) {
      onError('Please provide valid product name and price');
      return;
    }

    setIsLoading(true);
    try {
      const productData: ProductCreationData = {
        name: newProductForm.name.trim(),
        price: newProductForm.price,
        category: newProductForm.category.trim() || 'General',
        initialStock: Math.max(1, newProductForm.initialStock),
        reorderThreshold: Math.max(1, newProductForm.reorderThreshold),
        imageUrl: newProductForm.imageUrl.trim() || undefined
      };

      const newProduct = await enhancedTransactionService.addNewProduct(productData);
      
      // Add to products list and select it
      setAllProducts(prev => [...prev, newProduct]);
      setSelectedProducts(prev => [...prev, { product: newProduct, quantity: 1 }]);
      
      // Close new product form
      setShowNewProductForm(false);
      setNewProductForm({
        name: '',
        price: 0,
        category: '',
        initialStock: 1,
        reorderThreshold: 1,
        imageUrl: ''
      });
    } catch (error) {
      console.error('Failed to create new product:', error);
      onError(error instanceof Error ? error.message : 'Failed to create new product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (selectedProducts.length === 0) {
      onError('Please select at least one product');
      return;
    }

    setIsLoading(true);
    try {
      const transactionData: TransactionCreationData = {
        amount,
        transcription: transcription || '',
        selectedProducts: selectedProducts.map(sp => ({
          productId: sp.product.id!,
          quantity: sp.quantity,
          unitPrice: sp.product.price
        })),
        paymentType,
        confidence
      };

      const transaction = await enhancedTransactionService.createTransaction(transactionData);
      onTransactionCompleted(transaction.id!);
      onClose();
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      onError(error instanceof Error ? error.message : 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickConfirm = async (product: Product) => {
    const quantity = Math.max(1, Math.floor(amount / product.price));
    const actualQuantity = Math.min(quantity, product.stock);
    
    setSelectedProducts([{ product, quantity: actualQuantity }]);
    
    // Auto-confirm if the amount matches closely
    const calculatedTotal = product.price * actualQuantity;
    const difference = Math.abs(calculatedTotal - amount);
    const tolerance = amount * 0.1; // 10% tolerance
    
    if (difference <= tolerance) {
      // Auto-confirm for close matches
      setTimeout(() => handleConfirmTransaction(), 100);
    }
  };

  if (!isOpen) return null;

  const displayProducts = showAllProducts ? allProducts : suggestedProducts;
  const total = calculateTotal();
  const amountDifference = total - amount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Transaction Detected</h2>
            <p className="text-green-100">₹{amount.toFixed(2)} received via {paymentType.toUpperCase()}</p>
            {transcription && (
              <p className="text-green-200 text-sm mt-1">"{transcription}"</p>
            )}
            {audioQuality && (
              <div className="text-green-200 text-xs mt-1 flex gap-4">
                <span>Quality: {(audioQuality.clarity * 100).toFixed(0)}%</span>
                {confidence && <span>Confidence: {(confidence * 100).toFixed(0)}%</span>}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Payment Type Toggle */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setPaymentType('upi')}
              className={`px-4 py-2 rounded-lg font-medium ${
                paymentType === 'upi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              UPI Payment
            </button>
            <button
              onClick={() => setPaymentType('cash')}
              className={`px-4 py-2 rounded-lg font-medium ${
                paymentType === 'cash'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cash Payment
            </button>
          </div>

          {/* New Product Form */}
          {showNewProductForm && (
            <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-3">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Groceries, Snacks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductForm.initialStock}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, initialStock: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateNewProduct}
                  disabled={isLoading || !newProductForm.name.trim() || newProductForm.price <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Product'}
                </button>
                <button
                  onClick={() => setShowNewProductForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Product Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">
                {showAllProducts ? 'All Products' : 'Suggested Products'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewProductForm(!showNewProductForm)}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  {showNewProductForm ? 'Hide Form' : 'Add New Product'}
                </button>
                <button
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllProducts ? 'Show Suggestions' : 'Show All Products'}
                </button>
              </div>
            </div>

            <ProductCatalogGrid
              products={displayProducts}
              onProductSelect={handleProductSelect}
              onQuickConfirm={handleQuickConfirm}
              selectedProducts={selectedProducts}
              showQuickConfirm={!showAllProducts && suggestedProducts.length > 0}
            />
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Selected Products</h3>
              <div className="space-y-2">
                {selectedProducts.map((sp) => (
                  <div
                    key={sp.product.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {sp.product.imageUrl && (
                        <img
                          src={sp.product.imageUrl}
                          alt={sp.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{sp.product.name}</p>
                        <p className="text-sm text-gray-600">₹{sp.product.price} each</p>
                        <p className="text-xs text-gray-500">Stock: {sp.product.stock}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <QuantityAdjuster
                        quantity={sp.quantity}
                        maxQuantity={sp.product.stock}
                        onQuantityChange={(newQuantity) => 
                          handleQuantityChange(sp.product.id!, newQuantity)
                        }
                      />
                      <p className="font-semibold min-w-[80px] text-right">
                        ₹{(sp.product.price * sp.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Summary */}
          <TransactionSummary
            originalAmount={amount}
            calculatedTotal={total}
            amountDifference={amountDifference}
            selectedProductsCount={selectedProducts.length}
          />
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedProducts.length} product(s) selected
              {audioQuality && (
                <span className="ml-2 text-xs">
                  • Audio Quality: {audioQuality.isAcceptable ? 'Good' : 'Poor'}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransaction}
                disabled={selectedProducts.length === 0 || isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : `Confirm Sale (₹${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};