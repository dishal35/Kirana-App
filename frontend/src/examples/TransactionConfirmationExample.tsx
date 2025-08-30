import React, { useState, useEffect } from 'react';
import { TransactionConfirmationModal } from '../components/transaction';
import type { Product, Transaction } from '../types';
import { productRepository } from '../dbs/repo';
import { DemoDataService } from '../services/DemoDataService';

export const TransactionConfirmationExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [testScenario, setTestScenario] = useState<'exact-match' | 'multiple-products' | 'cash-transaction'>('exact-match');
  const [isInitializingDemo, setIsInitializingDemo] = useState(false);

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const allProducts = await productRepository.getAll();
        setProducts(allProducts.filter(p => p.stock > 0));
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };

    loadProducts();
  }, []);

  const getTestScenarioData = () => {
    switch (testScenario) {
      case 'exact-match':
        return {
          amount: 50,
          suggestedProducts: products.slice(0, 2),
          transcription: "Fifty rupees received on PhonePe",
          confidence: 0.95
        };
      case 'multiple-products':
        return {
          amount: 150,
          suggestedProducts: products.slice(0, 4),
          transcription: "One hundred fifty rupees received on GPay",
          confidence: 0.88
        };
      case 'cash-transaction':
        return {
          amount: 75,
          suggestedProducts: products.slice(1, 3),
          transcription: undefined,
          confidence: undefined
        };
      default:
        return {
          amount: 50,
          suggestedProducts: products.slice(0, 2),
          transcription: "Fifty rupees received on PhonePe",
          confidence: 0.95
        };
    }
  };

  const handleTransactionConfirmed = (transaction: Transaction) => {
    console.log('Transaction confirmed:', transaction);
    alert(`Transaction confirmed! 
    Amount: ₹${transaction.amount}
    Products: ${transaction.products.length}
    Type: ${transaction.type.toUpperCase()}`);
  };

  const handleInitializeDemoData = async () => {
    setIsInitializingDemo(true);
    try {
      await DemoDataService.initializeDemoShop();
      // Reload products
      const allProducts = await productRepository.getAll();
      setProducts(allProducts.filter(p => p.stock > 0));
      alert('Demo data initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize demo data:', error);
      alert('Failed to initialize demo data. Check console for details.');
    } finally {
      setIsInitializingDemo(false);
    }
  };

  const scenarioData = getTestScenarioData();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transaction Confirmation Interface
        </h1>
        <p className="text-gray-600">
          Test the transaction confirmation modal with different scenarios
        </p>
      </div>

      {/* Test Scenario Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setTestScenario('exact-match')}
            className={`p-4 rounded-lg border text-left transition-all ${
              testScenario === 'exact-match'
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-medium">Exact Match</h3>
            <p className="text-sm text-gray-600 mt-1">
              ₹50 UPI payment with matching product suggestions
            </p>
          </button>

          <button
            onClick={() => setTestScenario('multiple-products')}
            className={`p-4 rounded-lg border text-left transition-all ${
              testScenario === 'multiple-products'
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-medium">Multiple Products</h3>
            <p className="text-sm text-gray-600 mt-1">
              ₹150 UPI payment requiring multiple product selection
            </p>
          </button>

          <button
            onClick={() => setTestScenario('cash-transaction')}
            className={`p-4 rounded-lg border text-left transition-all ${
              testScenario === 'cash-transaction'
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="font-medium">Cash Transaction</h3>
            <p className="text-sm text-gray-600 mt-1">
              ₹75 cash payment without audio transcription
            </p>
          </button>
        </div>
      </div>

      {/* Current Scenario Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Current Scenario Details:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Amount:</span>
            <span className="ml-2 font-medium">₹{scenarioData.amount}</span>
          </div>
          <div>
            <span className="text-gray-600">Suggested Products:</span>
            <span className="ml-2 font-medium">{scenarioData.suggestedProducts.length}</span>
          </div>
          {scenarioData.transcription && (
            <div className="col-span-2">
              <span className="text-gray-600">Transcription:</span>
              <span className="ml-2 font-medium">"{scenarioData.transcription}"</span>
            </div>
          )}
          {scenarioData.confidence && (
            <div>
              <span className="text-gray-600">Confidence:</span>
              <span className="ml-2 font-medium">{(scenarioData.confidence * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Launch Button */}
      <div className="text-center space-y-4">
        {products.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 mb-3">
              No products found in the database. Initialize demo data to test the transaction confirmation interface.
            </p>
            <button
              onClick={handleInitializeDemoData}
              disabled={isInitializingDemo}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isInitializingDemo ? 'Initializing...' : 'Initialize Demo Data'}
            </button>
          </div>
        )}
        
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={products.length === 0}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {products.length === 0 ? 'No Products Available' : 'Open Transaction Confirmation'}
        </button>
      </div>

      {/* Available Products Info */}
      {products.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Available Products ({products.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 6).map((product) => (
              <div key={product.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <p className="text-green-600 font-bold">₹{product.price}</p>
                    <p className="text-xs text-gray-600">Stock: {product.stock}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {products.length > 6 && (
            <p className="text-center text-gray-500 mt-4">
              ... and {products.length - 6} more products
            </p>
          )}
        </div>
      )}

      {/* Transaction Confirmation Modal */}
      <TransactionConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={scenarioData.amount}
        suggestedProducts={scenarioData.suggestedProducts}
        transcription={scenarioData.transcription}
        confidence={scenarioData.confidence}
        onTransactionConfirmed={handleTransactionConfirmed}
      />
    </div>
  );
};