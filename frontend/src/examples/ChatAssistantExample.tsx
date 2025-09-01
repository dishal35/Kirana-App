import React, { useState, useEffect } from 'react';
import { ChatPage } from '../components/chat/ChatPage';
import { ChatInterface } from '../components/chat/ChatInterface';
import { chatAssistant } from '../services/ChatAssistant';
import { productRepository, transactionRepository } from '../dbs/repo';
import type { BusinessContext } from '../types';

export const ChatAssistantExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'full-page' | 'component' | 'test'>('full-page');
  const [businessContext, setBusinessContext] = useState<BusinessContext>({
    todaysSales: [],
    inventory: [],
    salesHistory: []
  });
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadDemoData();
    testConnection();
  }, []);

  const loadDemoData = async () => {
    try {
      // Load actual data from database
      const inventory = await productRepository.getAll();
      const todaysSales = await transactionRepository.getTodaysTransactions();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const salesHistory = await transactionRepository.getTransactionsByDateRange(
        thirtyDaysAgo,
        new Date()
      );

      setBusinessContext({
        todaysSales,
        inventory,
        salesHistory
      });
    } catch (error) {
      console.error('Failed to load demo data:', error);
      
      // Fallback to mock data
      setBusinessContext({
        todaysSales: [
          {
            id: '1',
            amount: 150,
            products: [{ productId: 'rice-1kg', quantity: 2, unitPrice: 75 }],
            type: 'upi',
            timestamp: new Date(),
            transcription: '150 rupees received on PhonePe'
          },
          {
            id: '2',
            amount: 200,
            products: [{ productId: 'oil-1l', quantity: 1, unitPrice: 200 }],
            type: 'cash',
            timestamp: new Date()
          }
        ],
        inventory: [
          {
            id: 'rice-1kg',
            name: 'Rice (1kg)',
            price: 75,
            stock: 48,
            reorderThreshold: 10,
            category: 'Grains',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'oil-1l',
            name: 'Cooking Oil (1L)',
            price: 200,
            stock: 4,
            reorderThreshold: 5,
            category: 'Cooking',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        salesHistory: []
      });
    }
  };

  const testConnection = async () => {
    try {
      const isConnected = await chatAssistant.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
    }
  };

  const runChatTests = async () => {
    const results: string[] = [];
    
    try {
      results.push('🧪 Starting Chat Assistant Tests...');
      
      // Test 1: English sales query
      results.push('\n📊 Testing English sales query...');
      const englishQuery = {
        text: 'How much did I sell today?',
        language: 'en' as const
      };
      const englishResponse = await chatAssistant.processQuery(englishQuery, businessContext);
      results.push(`✅ Response: ${englishResponse.message.substring(0, 100)}...`);
      results.push(`📈 Confidence: ${(englishResponse.confidence * 100).toFixed(1)}%`);
      
      // Test 2: Hindi inventory query
      results.push('\n🏪 Testing Hindi inventory query...');
      const hindiQuery = {
        text: 'कौन से सामान कम हैं?',
        language: 'hi' as const
      };
      const hindiResponse = await chatAssistant.processQuery(hindiQuery, businessContext);
      results.push(`✅ Response: ${hindiResponse.message.substring(0, 100)}...`);
      results.push(`📈 Confidence: ${(hindiResponse.confidence * 100).toFixed(1)}%`);
      
      // Test 3: Kannada greeting
      results.push('\n👋 Testing Kannada greeting...');
      const kannadaQuery = {
        text: 'ನಮಸ್ಕಾರ, ನನಗೆ ಸಹಾಯ ಮಾಡಿ',
        language: 'kn' as const
      };
      const kannadaResponse = await chatAssistant.processQuery(kannadaQuery, businessContext);
      results.push(`✅ Response: ${kannadaResponse.message.substring(0, 100)}...`);
      results.push(`📈 Confidence: ${(kannadaResponse.confidence * 100).toFixed(1)}%`);
      
      // Test 4: Business insights
      results.push('\n📈 Testing business insights...');
      const insights = await chatAssistant.getSalesInsights(businessContext);
      results.push(`✅ Total Sales: ₹${insights.totalSales}`);
      results.push(`✅ Top Product: ${insights.topProduct}`);
      results.push(`✅ Low Stock Count: ${insights.lowStockCount}`);
      
      // Test 5: Inventory status
      results.push('\n📦 Testing inventory status...');
      const inventoryStatus = await chatAssistant.getInventoryStatus(businessContext);
      results.push(`✅ Total Products: ${inventoryStatus.totalProducts}`);
      results.push(`✅ Low Stock Products: ${inventoryStatus.lowStockProducts.length}`);
      results.push(`✅ Total Inventory Value: ₹${inventoryStatus.totalValue}`);
      
      results.push('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      results.push(`\n❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setTestResults(results);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ Connected to Gemini API';
      case 'failed': return '❌ Failed to connect to Gemini API';
      default: return '🔄 Testing connection...';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Multilingual Chat Assistant Demo
          </h1>
          <div className={`text-sm font-medium ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </div>
          
          {/* Business Context Summary */}
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Current Business Context</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Today's Sales:</span> ₹
                {businessContext.todaysSales.reduce((sum, t) => sum + t.amount, 0)}
              </div>
              <div>
                <span className="font-medium">Products:</span> {businessContext.inventory.length}
              </div>
              <div>
                <span className="font-medium">Low Stock:</span> {
                  businessContext.inventory.filter(p => p.stock <= p.reorderThreshold).length
                }
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'full-page', label: 'Full Chat Page' },
              { id: 'component', label: 'Chat Component' },
              { id: 'test', label: 'API Tests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {activeTab === 'full-page' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Full Chat Page Experience</h2>
              <p className="text-gray-600 mb-4">
                This demonstrates the complete chat page with header, business summary, and quick actions.
              </p>
              <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <ChatPage />
              </div>
            </div>
          )}

          {activeTab === 'component' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Chat Interface Component</h2>
              <p className="text-gray-600 mb-4">
                This shows just the chat interface component that can be embedded anywhere.
              </p>
              
              {/* Sample Queries */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Try these sample queries:</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>English:</strong> "How much did I sell today?" or "Which products are low in stock?"</div>
                  <div><strong>Hindi:</strong> "आज कितना बेचा?" or "कौन से सामान कम हैं?"</div>
                  <div><strong>Kannada:</strong> "ಇಂದು ಎಷ್ಟು ಮಾರಾಟ ಮಾಡಿದೆ?" or "ಯಾವ ಸಾಮಾನು ಕಡಿಮೆ ಇದೆ?"</div>
                </div>
              </div>
              
              <div style={{ height: '500px' }}>
                <ChatInterface
                  businessContext={businessContext}
                  language="en"
                  onLanguageChange={(lang) => console.log('Language changed to:', lang)}
                />
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">API Tests & Diagnostics</h2>
              <p className="text-gray-600 mb-4">
                Test the chat assistant functionality with various queries and languages.
              </p>
              
              <div className="mb-6">
                <button
                  onClick={runChatTests}
                  disabled={connectionStatus !== 'connected'}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Chat Tests
                </button>
                
                {connectionStatus === 'failed' && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">
                      ⚠️ Gemini API connection failed. Please check your API key configuration.
                    </p>
                  </div>
                )}
              </div>

              {testResults.length > 0 && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
                  {testResults.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Multilingual Support"
            description="Supports English, Hindi, and Kannada with automatic language detection"
            icon="🌐"
          />
          <FeatureCard
            title="Business Context"
            description="Integrates with sales data, inventory, and transaction history"
            icon="📊"
          />
          <FeatureCard
            title="Voice Input"
            description="Supports both text and voice input for natural interaction"
            icon="🎤"
          />
          <FeatureCard
            title="Smart Insights"
            description="Provides intelligent business insights and recommendations"
            icon="🧠"
          />
          <FeatureCard
            title="Real-time Data"
            description="Uses live business data for accurate responses"
            icon="⚡"
          />
          <FeatureCard
            title="Conversation Memory"
            description="Maintains context across multiple queries in a conversation"
            icon="💭"
          />
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};