/**
 * Manual Audio Test Component
 * 
 * Simple test interface to verify manual audio recording and product recommendation
 */

import React, { useState } from 'react';
import { AudioTransactionCapture } from '../components/audio/AudioTransactionCapture';
import { ManualAmountEntry } from '../components/transaction/ManualAmountEntry';
import { ProductSuggestionModal } from '../components/transaction/ProductSuggestionModal';
import type { Product, AudioQualityMetrics } from '../types';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Milk (1L)',
    price: 60,
    stock: 20,
    reorderThreshold: 5,
    category: 'Dairy',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Bread',
    price: 25,
    stock: 15,
    reorderThreshold: 3,
    category: 'Bakery',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Rice (1kg)',
    price: 80,
    stock: 10,
    reorderThreshold: 2,
    category: 'Grains',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Sugar (1kg)',
    price: 45,
    stock: 8,
    reorderThreshold: 2,
    category: 'Groceries',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const ManualAudioTest: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [testAmount, setTestAmount] = useState(100);
  const [testTranscription, setTestTranscription] = useState('Test transaction');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handleTransactionCompleted = (transactionId: string) => {
    addLog(`✅ Transaction completed: ${transactionId}`);
    setShowModal(false);
  };

  const handleAudioError = (error: string) => {
    addLog(`❌ Audio error: ${error}`);
  };

  const handleTestProductSuggestion = () => {
    addLog(`🧪 Testing product suggestion with amount: ₹${testAmount}`);
    setShowModal(true);
  };

  const handleModalClose = () => {
    addLog('❌ Modal closed without completion');
    setShowModal(false);
  };

  const handleModalError = (error: string) => {
    addLog(`❌ Modal error: ${error}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Manual Audio & Product Test</h1>
        <p className="text-gray-600 mb-6">
          Test manual audio recording and product recommendation functionality
        </p>

        {/* Manual Amount Entry */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Amount Entry</h2>
          <ManualAmountEntry
            onTransactionCompleted={handleTransactionCompleted}
            onError={handleAudioError}
            className="border border-gray-200 rounded-lg"
          />
        </div>

        {/* Audio Transaction Capture */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Audio Recording</h2>
          <AudioTransactionCapture
            onTransactionCompleted={handleTransactionCompleted}
            onError={handleAudioError}
            className="border border-gray-200 rounded-lg"
          />
        </div>

        {/* Manual Product Suggestion Test */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Product Suggestion Test</h2>
          <div className="flex items-center space-x-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Amount (₹)
              </label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Transcription
              </label>
              <input
                type="text"
                value={testTranscription}
                onChange={(e) => setTestTranscription(e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test transcription"
              />
            </div>
            <div className="pt-6">
              <button
                onClick={handleTestProductSuggestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Test Product Suggestion
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            This will open the product suggestion modal with the specified amount and mock products.
          </p>
        </div>

        {/* Available Products */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available Test Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">₹{product.price}</p>
                <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                <p className="text-xs text-gray-500">Category: {product.category}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Activity Log</h2>
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity yet. Try recording audio or testing product suggestions.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Product Suggestion Modal */}
      {showModal && (
        <ProductSuggestionModal
          isOpen={showModal}
          onClose={handleModalClose}
          amount={testAmount}
          suggestedProducts={mockProducts.slice(0, 2)} // Suggest first 2 products
          transcription={testTranscription}
          confidence={0.85}
          audioQuality={{
            volume: 0.8,
            noiseLevel: 0.2,
            clarity: 0.9,
            isAcceptable: true
          } as AudioQualityMetrics}
          onTransactionCompleted={handleTransactionCompleted}
          onError={handleModalError}
        />
      )}
    </div>
  );
};