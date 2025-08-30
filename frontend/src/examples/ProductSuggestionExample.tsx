import React, { useState, useEffect } from 'react';
import { productSuggestionService, type ProductSuggestion } from '../services/ProductSuggestionService';
import { productRepository, transactionRepository } from '../dbs/repo';
import { DemoDataService } from '../services/DemoDataService';
import type { Product } from '../types';

export const ProductSuggestionExample: React.FC = () => {
  const [amount, setAmount] = useState<number>(45);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [geminiStatus, setGeminiStatus] = useState<boolean | null>(null);
  const [demoStats, setDemoStats] = useState<any>(null);

  // Initialize sample data
  useEffect(() => {
    initializeSampleData();
    testGeminiConnection();
    loadDemoStats();
  }, []);

  const initializeSampleData = async () => {
    try {
      // Check if we already have products
      const existingProducts = await productRepository.getAll();
      if (existingProducts.length > 0) {
        setProducts(existingProducts);
        return;
      }

      // Check if demo data exists, if not create minimal sample data
      const isDemoInitialized = await DemoDataService.isDemoDataInitialized();
      
      if (!isDemoInitialized) {
        // Create minimal sample products for testing
        const sampleProducts = [
          {
            name: 'Rice (1kg)',
            price: 45,
            stock: 20,
            category: 'Staples',
            reorderThreshold: 5,
          },
          {
            name: 'Tea (250g)',
            price: 120,
            stock: 15,
            category: 'Beverages',
            reorderThreshold: 3,
          },
          {
            name: 'Biscuits',
            price: 30,
            stock: 12,
            category: 'Snacks',
            reorderThreshold: 2,
          },
          {
            name: 'Milk (1L)',
            price: 55,
            stock: 8,
            category: 'Dairy',
            reorderThreshold: 5,
          },
          {
            name: 'Bread',
            price: 25,
            stock: 6,
            category: 'Bakery',
            reorderThreshold: 2,
          },
          {
            name: 'Sugar (1kg)',
            price: 50,
            stock: 10,
            category: 'Staples',
            reorderThreshold: 3,
          },
        ];

        // Add products to database
        const productIds: string[] = [];
        for (const product of sampleProducts) {
          const id = await productRepository.create(product);
          productIds.push(id);
        }

        // Create some sample transactions for history
        const sampleTransactions = [
          {
            amount: 45,
            products: [{ productId: productIds[0], quantity: 1, unitPrice: 45 }],
            type: 'upi' as const,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            amount: 120,
            products: [{ productId: productIds[1], quantity: 1, unitPrice: 120 }],
            type: 'upi' as const,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            amount: 60,
            products: [{ productId: productIds[1], quantity: 2, unitPrice: 30 }],
            type: 'upi' as const,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        ];

        for (const transaction of sampleTransactions) {
          await transactionRepository.create(transaction);
        }
      }

      // Refresh products list
      const updatedProducts = await productRepository.getAll();
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
      setError('Failed to initialize sample data');
    }
  };

  const testGeminiConnection = async () => {
    try {
      const isConnected = await productSuggestionService.testGeminiConnection();
      setGeminiStatus(isConnected);
    } catch (error) {
      setGeminiStatus(false);
    }
  };

  const loadDemoStats = async () => {
    try {
      const stats = await DemoDataService.getDemoShopStats();
      setDemoStats(stats);
    } catch (error) {
      console.error('Failed to load demo stats:', error);
    }
  };

  const getSuggestions = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await productSuggestionService.getSuggestions(amount, 5);
      setSuggestions(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Product Suggestion Demo
        </h2>
        
        {/* Gemini Status */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Gemini AI Status:</span>
            {geminiStatus === null ? (
              <span className="text-gray-500">Testing...</span>
            ) : geminiStatus ? (
              <span className="text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </span>
            ) : (
              <span className="text-orange-600 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Fallback Mode (Rule-based suggestions)
              </span>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Amount (₹)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount..."
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={getSuggestions}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Getting Suggestions...' : 'Get Suggestions'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Suggested Products for {formatCurrency(amount)}
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.product.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-800">
                      {suggestion.product.name}
                    </h4>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium">{formatCurrency(suggestion.product.price)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Suggested Qty:</span>
                      <span className="font-medium">{suggestion.suggestedQuantity}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">
                        {formatCurrency(suggestion.product.price * suggestion.suggestedQuantity)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className={`font-medium ${suggestion.product.stock > 5 ? 'text-green-600' : 'text-orange-600'}`}>
                        {suggestion.product.stock}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <span className={`font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                        {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600 italic">
                      {suggestion.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo Stats */}
        {demoStats && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Overview</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{demoStats.totalProducts}</div>
                <div className="text-sm text-blue-700">Total Products</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(demoStats.totalRevenue)}</div>
                <div className="text-sm text-green-700">Total Revenue</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{demoStats.totalTransactions}</div>
                <div className="text-sm text-purple-700">Transactions</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{demoStats.lowStockProducts}</div>
                <div className="text-sm text-orange-700">Low Stock Items</div>
              </div>
            </div>
          </div>
        )}

        {/* Available Products */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Available Products ({products.length})
          </h3>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <span className="font-medium text-gray-800">{product.name}</span>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(product.price)} • Stock: {product.stock}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {product.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Data Setup */}
        {products.length < 10 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600">💡</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800 mb-2">Want to see more realistic suggestions?</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Set up demo data with 30+ products and transaction history for better AI suggestions.
                  </p>
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await DemoDataService.initializeDemoShop();
                        await initializeSampleData();
                        await loadDemoStats();
                      } catch (error) {
                        setError('Failed to setup demo data');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Setting up...' : 'Setup Demo Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-800 mb-3">Quick Tests:</h4>
          <div className="flex flex-wrap gap-2">
            {[20, 25, 30, 35, 45, 50, 60, 85, 120, 150, 180, 280].map((testAmount) => (
              <button
                key={testAmount}
                onClick={() => {
                  setAmount(testAmount);
                  setTimeout(() => getSuggestions(), 100);
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ₹{testAmount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSuggestionExample;