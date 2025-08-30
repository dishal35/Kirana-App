import React, { useState, useEffect } from 'react';
import type { Product, Transaction, TransactionItem } from '../../types';
import { ProductCatalogGrid } from './ProductCatalogGrid';
import { QuantityAdjuster } from './QuantityAdjuster';
import { TransactionSummary } from './TransactionSummary';
import { productRepository, transactionRepository } from '../../dbs/repo';

export interface TransactionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  suggestedProducts: Product[];
  transcription?: string;
  confidence?: number;
  onTransactionConfirmed: (transaction: Transaction) => void;
}

export interface SelectedProduct {
  product: Product;
  quantity: number;
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
  isOpen,
  onClose,
  amount,
  suggestedProducts,
  transcription,
  confidence,
  onTransactionConfirmed
}) => {
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [transactionType, setTransactionType] = useState<'upi' | 'cash'>('upi');
  const [isLoading, setIsLoading] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Load all products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await productRepository.getAll();
        setAllProducts(products); // Include all products, even out of stock
      } catch (error) {
        console.error('Failed to load products:', error);
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
  }, [isOpen, suggestedProducts, amount]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProducts([]);
      setShowAllProducts(false);
      setTransactionType('upi');
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

  const handleConfirmTransaction = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }

    setIsLoading(true);
    try {
      // Create transaction items
      const transactionItems: TransactionItem[] = selectedProducts.map(sp => ({
        productId: sp.product.id!,
        quantity: sp.quantity,
        unitPrice: sp.product.price
      }));

      // Create transaction
      const transaction: Omit<Transaction, 'id'> = {
        amount: calculateTotal(),
        products: transactionItems,
        type: transactionType,
        timestamp: new Date(),
        transcription,
        confidence
      };

      // Save transaction
      const transactionId = await transactionRepository.create(transaction);

      // Update product stock
      for (const sp of selectedProducts) {
        const newStock = sp.product.stock - sp.quantity;
        await productRepository.updateStock(sp.product.id!, newStock);
      }

      // Notify parent component
      onTransactionConfirmed({ ...transaction, id: transactionId });
      onClose();
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      alert('Failed to save transaction. Please try again.');
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
            <h2 className="text-xl font-bold">Transaction Received</h2>
            <p className="text-green-100">₹{amount.toFixed(2)} received via {transactionType.toUpperCase()}</p>
            {transcription && (
              <p className="text-green-200 text-sm mt-1">"{transcription}"</p>
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
          {/* Transaction Type Toggle */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTransactionType('upi')}
              className={`px-4 py-2 rounded-lg font-medium ${
                transactionType === 'upi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              UPI Payment
            </button>
            <button
              onClick={() => setTransactionType('cash')}
              className={`px-4 py-2 rounded-lg font-medium ${
                transactionType === 'cash'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cash Payment
            </button>
          </div>

          {/* Product Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">
                {showAllProducts ? 'All Products' : 'Suggested Products'}
              </h3>
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showAllProducts ? 'Show Suggestions' : 'Show All Products'}
              </button>
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
                {isLoading ? 'Confirming...' : `Confirm Sale (₹${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};