/**
 * Enhanced Transaction Service Example
 * 
 * Demonstrates the complete audio-to-transaction workflow
 * with the new EnhancedTransactionService and components.
 */

import React, { useState } from 'react';
import { AudioTransactionCapture } from '../components/audio/AudioTransactionCapture';
import { enhancedTransactionService } from '../services/EnhancedTransactionService';

export const EnhancedTransactionExample: React.FC = () => {
  const [transactions, setTransactions] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [serviceStatus, setServiceStatus] = useState<string>('Ready');

  const handleTransactionCompleted = (transactionId: string) => {
    setTransactions(prev => [...prev, `Transaction ${transactionId} completed at ${new Date().toLocaleTimeString()}`]);
    setServiceStatus('Transaction completed successfully');
  };

  const handleError = (error: string) => {
    setErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${error}`]);
    setServiceStatus(`Error: ${error}`);
  };

  const testPipeline = async () => {
    setServiceStatus('Testing pipeline...');
    try {
      const result = await enhancedTransactionService.testAudioPipeline();
      setServiceStatus(result ? 'Pipeline test passed' : 'Pipeline test failed');
    } catch (error) {
      setServiceStatus(`Pipeline test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearLogs = () => {
    setTransactions([]);
    setErrors([]);
    setServiceStatus('Ready');
  };

  const exportTransactions = async (format: 'json' | 'csv') => {
    try {
      setServiceStatus(`Exporting as ${format.toUpperCase()}...`);
      const blob = await enhancedTransactionService.exportTransactions(format);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setServiceStatus(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      setServiceStatus(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Enhanced Transaction Service Demo
        </h1>
        <p className="text-gray-600 mb-4">
          Complete audio-to-transaction workflow with product suggestions and inventory management.
        </p>
        
        {/* Service Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 font-medium">Status: {serviceStatus}</p>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={testPipeline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Test Pipeline
          </button>
          <button
            onClick={() => exportTransactions('json')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportTransactions('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Export CSV
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Audio Transaction Capture Component */}
      <AudioTransactionCapture
        onTransactionCompleted={handleTransactionCompleted}
        onError={handleError}
        className="mb-6"
      />

      {/* Transaction Log */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Completed Transactions ({transactions.length})
          </h2>
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <div
                key={index}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <p className="text-green-800">{transaction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Log */}
      {errors.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Errors ({errors.length})
          </h2>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <p className="text-red-800">{error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">How to Use</h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
            <p>Click "Test Pipeline" to verify all services are working correctly.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
            <p>Tap the microphone button to start listening for UPI payment alerts.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
            <p>Play a UPI alert sound (e.g., "50 rupees received on PhonePe") near your microphone.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
            <p>The app will automatically detect the transaction and show product suggestions.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
            <p>Select products, adjust quantities, or create new products as needed.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
            <p>Confirm the transaction to update inventory and save the sale record.</p>
          </div>
        </div>
      </div>

      {/* Technical Features */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Technical Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Audio Processing</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time voice activity detection</li>
              <li>• Gemini API audio transcription</li>
              <li>• UPI alert pattern recognition</li>
              <li>• Audio quality validation</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Transaction Management</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic amount extraction</li>
              <li>• AI-powered product suggestions</li>
              <li>• Real-time inventory updates</li>
              <li>• Transaction export (JSON/CSV)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibent text-gray-800">Product Management</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Dynamic product creation</li>
              <li>• Stock validation and updates</li>
              <li>• Price correction handling</li>
              <li>• Inventory audit trail</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">Error Handling</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Graceful API failure recovery</li>
              <li>• Audio quality issue detection</li>
              <li>• Transaction validation</li>
              <li>• User-friendly error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};