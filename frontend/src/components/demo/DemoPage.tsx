import React, { useState, useEffect } from 'react';
import DemoControlPanel from './DemoControlPanel';
import DemoModeIndicator from './DemoModeIndicator';
import { hackathonDemoService, type DemoMetrics } from '../../services/HackathonDemoService';
import { DemoDataService } from '../../services/DemoDataService';
import { ManualAudioTest } from '../../examples/ManualAudioTest';

export const DemoPage: React.FC = () => {
  const [demoStats, setDemoStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'demo' | 'audio-test'>('demo');

  useEffect(() => {
    loadDemoStats();
  }, []);

  const loadDemoStats = async () => {
    try {
      setIsLoading(true);
      const stats = await DemoDataService.getDemoShopStats();
      setDemoStats(stats);
    } catch (error) {
      console.error('Failed to load demo stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioExecute = (scenarioId: string) => {
    console.log(`Scenario ${scenarioId} executed`);
    // Refresh stats after scenario execution
    setTimeout(loadDemoStats, 1000);
  };

  const handleDemoComplete = (metrics: DemoMetrics) => {
    console.log('Demo completed with metrics:', metrics);
    // Refresh stats after demo completion
    setTimeout(loadDemoStats, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading demo environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <DemoModeIndicator />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏆 Hackathon Demo Environment
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete demo environment for showcasing the Shopkeeper UPI Tracker application. 
            Execute individual scenarios or run the full presentation demo.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 flex">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'demo'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Demo Environment
            </button>
            <button
              onClick={() => setActiveTab('audio-test')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'audio-test'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎤 Manual Audio Test
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'demo' && (
          <>
            {/* Demo Stats Overview */}
            {demoStats && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Demo Shop Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{demoStats.totalProducts}</div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₹{demoStats.totalRevenue}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{demoStats.totalTransactions}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{demoStats.lowStockProducts}</div>
                <div className="text-sm text-gray-600">Low Stock Items</div>
              </div>
            </div>
            
            {demoStats.categories && demoStats.categories.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-800 mb-3">Product Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {demoStats.categories.map((category: any) => (
                    <div key={category.category} className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="font-medium text-gray-800">{category.category}</div>
                      <div className="text-sm text-gray-600">{category.count} items</div>
                      <div className="text-xs text-gray-500">₹{Math.round(category.totalValue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo Control Panel */}
        <DemoControlPanel 
          onScenarioExecute={handleScenarioExecute}
          onDemoComplete={handleDemoComplete}
        />

        {/* Demo Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Demo Instructions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">🚀 Quick Start</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Click "Initialize Demo" to set up the demo environment</li>
                <li>Use "Run Full Demo" for complete presentation (5-6 minutes)</li>
                <li>Or execute individual scenarios for focused demonstrations</li>
                <li>Use "Reset Data" between presentations for fresh demos</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">🎯 Demo Features</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>Pre-recorded UPI alert audio for consistent demos</li>
                <li>Realistic transaction scenarios with multiple products</li>
                <li>Multilingual support demonstration (Hindi/English)</li>
                <li>Real-time performance metrics and analytics</li>
                <li>Automated inventory updates and business insights</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Presentation Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              <li>Start with shop setup to show the onboarding process</li>
              <li>Execute 2-3 scenarios to demonstrate core functionality</li>
              <li>Show the dashboard and chat assistant for business insights</li>
              <li>Highlight multilingual support and AI-powered suggestions</li>
              <li>End with performance metrics to showcase technical capabilities</li>
            </ul>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Technical Specifications</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">🔧 Technology Stack</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• React + TypeScript</li>
                <li>• Tailwind CSS</li>
                <li>• IndexedDB (Dexie.js)</li>
                <li>• Google Gemini AI</li>
                <li>• Web Audio API</li>
                <li>• Vite Build Tool</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">📱 Features</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Audio capture & transcription</li>
                <li>• AI-powered product suggestions</li>
                <li>• Automatic inventory management</li>
                <li>• Multilingual chat assistant</li>
                <li>• Real-time business dashboard</li>
                <li>• Offline-first architecture</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">🎯 Performance</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• &lt;2s average processing time</li>
                <li>• 95%+ transcription accuracy</li>
                <li>• 8GB RAM compatibility</li>
                <li>• Responsive mobile design</li>
                <li>• Optimized for low-bandwidth</li>
                <li>• Battery-efficient audio processing</li>
              </ul>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Manual Audio Test Tab */}
        {activeTab === 'audio-test' && (
          <ManualAudioTest />
        )}
      </div>
    </div>
  );
};

export default DemoPage;