/**
 * Manual Amount Entry Component
 * 
 * Simple input field that allows manual entry of transaction amount
 * and directly opens the product confirmation modal
 */

import React, { useState } from 'react';
import { ProductSuggestionModal } from './ProductSuggestionModal';
import { productRepository } from '../../dbs/repo';
import type { Product, AudioQualityMetrics } from '../../types';

export interface ManualAmountEntryProps {
  onTransactionCompleted?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const ManualAmountEntry: React.FC<ManualAmountEntryProps> = ({
  onTransactionCompleted,
  onError,
  className = ''
}) => {
  const [amount, setAmount] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    
    if (!amount || numericAmount <= 0) {
      if (onError) {
        onError('Please enter a valid amount greater than 0');
      }
      return;
    }

    if (numericAmount > 50000) {
      if (onError) {
        onError('Amount too large. Please enter an amount less than ₹50,000');
      }
      return;
    }

    try {
      setIsLoading(true);
      
      // Load all products for suggestions
      const allProducts = await productRepository.getAll();
      setProducts(allProducts);
      
      // Open the product suggestion modal
      setShowModal(true);
      
    } catch (error) {
      console.error('Failed to load products:', error);
      if (onError) {
        onError('Failed to load products. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleTransactionCompleted = (transactionId: string) => {
    setShowModal(false);
    setAmount(''); // Clear the input
    if (onTransactionCompleted) {
      onTransactionCompleted(transactionId);
    }
  };

  const handleModalError = (error: string) => {
    if (onError) {
      onError(error);
    }
  };

  // Suggest products based on amount
  const getSuggestedProducts = (): Product[] => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || products.length === 0) return [];

    // Sort products by how close their price is to the amount
    const suggestions = products
      .filter(p => p.stock > 0) // Only suggest products in stock
      .map(product => ({
        product,
        priceDiff: Math.abs(product.price - numericAmount),
        canAfford: product.price <= numericAmount
      }))
      .sort((a, b) => {
        // Prioritize products we can afford, then by price difference
        if (a.canAfford && !b.canAfford) return -1;
        if (!a.canAfford && b.canAfford) return 1;
        return a.priceDiff - b.priceDiff;
      })
      .slice(0, 3) // Top 3 suggestions
      .map(item => item.product);

    return suggestions;
  };

  const mockAudioQuality: AudioQualityMetrics = {
    volume: 1.0,
    noiseLevel: 0.1,
    clarity: 1.0,
    isAcceptable: true
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Manual Amount Entry
        </h2>
        <p className="text-gray-600">
          Enter transaction amount to select products
        </p>
      </div>

      {/* Amount Entry Form */}
      <form onSubmit={handleAmountSubmit} className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-medium">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              max="50000"
              step="0.01"
              className="pl-8 pr-4 py-3 text-xl font-medium text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none w-64"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              'Select Products'
            )}
          </button>
        </div>
      </form>

      {/* Quick Amount Buttons */}
      <div className="mt-6">
        <p className="text-sm text-gray-600 text-center mb-3">Quick amounts:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[25, 50, 100, 200, 500, 1000].map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => setAmount(quickAmount.toString())}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              ₹{quickAmount}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">How it works:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Enter the transaction amount received</li>
          <li>• Click "Select Products" to open product selection</li>
          <li>• Choose products and quantities that match the amount</li>
          <li>• Confirm the transaction to complete the sale</li>
        </ul>
      </div>

      {/* Product Suggestion Modal */}
      {showModal && (
        <ProductSuggestionModal
          isOpen={showModal}
          onClose={handleModalClose}
          amount={parseFloat(amount)}
          suggestedProducts={getSuggestedProducts()}
          transcription={`Manual entry: ₹${amount}`}
          confidence={1.0} // Perfect confidence for manual entry
          audioQuality={mockAudioQuality}
          onTransactionCompleted={handleTransactionCompleted}
          onError={handleModalError}
        />
      )}
    </div>
  );
};