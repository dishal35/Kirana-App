import React, { useState, useEffect } from 'react';
import { hackathonDemoService, type DemoScenario, type DemoMetrics } from '../../services/HackathonDemoService';

interface DemoControlPanelProps {
  onScenarioExecute?: (scenarioId: string) => void;
  onDemoComplete?: (metrics: DemoMetrics) => void;
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  onScenarioExecute,
  onDemoComplete
}) => {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [metrics, setMetrics] = useState<DemoMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setScenarios(hackathonDemoService.getDemoScenarios());
    setMetrics(hackathonDemoService.getDemoMetrics());
    setIsDemoMode(hackathonDemoService.isDemoModeActive());
  }, []);

  const handleInitializeDemo = async () => {
    try {
      setIsRunning(true);
      await hackathonDemoService.initializeDemoMode();
      setIsDemoMode(true);
      setMetrics(hackathonDemoService.getDemoMetrics());
      console.log('✅ Demo mode initialized');
    } catch (error) {
      console.error('Failed to initialize demo:', error);
      alert('Failed to initialize demo mode');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExecuteScenario = async (scenarioId: string) => {
    try {
      setIsRunning(true);
      setCurrentScenario(scenarioId);
      
      const result = await hackathonDemoService.executeDemoScenario(scenarioId);
      
      if (result.success) {
        console.log(`✅ Scenario ${scenarioId} completed successfully`);
        onScenarioExecute?.(scenarioId);
      } else {
        console.error(`❌ Scenario ${scenarioId} failed:`, result.error);
        alert(`Scenario failed: ${result.error}`);
      }
      
      setMetrics(hackathonDemoService.getDemoMetrics());
    } catch (error) {
      console.error('Failed to execute scenario:', error);
      alert('Failed to execute scenario');
    } finally {
      setIsRunning(false);
      setCurrentScenario(null);
    }
  };

  const handleRunFullDemo = async () => {
    try {
      setIsRunning(true);
      const finalMetrics = await hackathonDemoService.runFullDemo();
      setMetrics(finalMetrics);
      onDemoComplete?.(finalMetrics);
      console.log('🎉 Full demo completed!');
    } catch (error) {
      console.error('Failed to run full demo:', error);
      alert('Failed to run full demo');
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Are you sure you want to reset all demo data? This will clear all transactions and reinitialize the demo.')) {
      return;
    }

    try {
      setIsRunning(true);
      await hackathonDemoService.resetDemoData();
      setMetrics(hackathonDemoService.getDemoMetrics());
      console.log('🔄 Demo data reset successfully');
    } catch (error) {
      console.error('Failed to reset demo:', error);
      alert('Failed to reset demo data');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExitDemo = () => {
    hackathonDemoService.exitDemoMode();
    setIsDemoMode(false);
    console.log('🏁 Exited demo mode');
  };

  const performanceAnalytics = hackathonDemoService.getPerformanceAnalytics();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🎯 Hackathon Demo Control Panel
        </h2>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isDemoMode 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isDemoMode ? '🟢 Demo Mode Active' : '⚪ Demo Mode Inactive'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={handleInitializeDemo}
          disabled={isRunning || isDemoMode}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isRunning ? '⏳ Initializing...' : '🚀 Initialize Demo'}
        </button>

        <button
          onClick={handleRunFullDemo}
          disabled={isRunning || !isDemoMode}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isRunning ? '⏳ Running...' : '🎬 Run Full Demo'}
        </button>

        <button
          onClick={handleResetDemo}
          disabled={isRunning}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isRunning ? '⏳ Resetting...' : '🔄 Reset Data'}
        </button>

        <button
          onClick={handleExitDemo}
          disabled={isRunning || !isDemoMode}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🏁 Exit Demo
        </button>
      </div>

      {/* Demo Scenarios */}
      {isDemoMode && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📱 Demo Scenarios</h3>
          <div className="grid gap-4">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{scenario.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>💰 Amount: ₹{scenario.expectedAmount}</span>
                      <span>⏱️ Duration: ~{scenario.duration}s</span>
                      <span>🛍️ Products: {scenario.suggestedProducts.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExecuteScenario(scenario.id)}
                    disabled={isRunning}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentScenario === scenario.id
                        ? 'bg-yellow-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white'
                    }`}
                  >
                    {currentScenario === scenario.id ? '⏳ Running...' : '▶️ Execute'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800">Scenarios Completed</h4>
            <p className="text-2xl font-bold text-blue-600">
              {metrics.scenariosCompleted}/{metrics.totalScenarios}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800">Success Rate</h4>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(metrics.successRate * 100)}%
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-800">Avg Processing</h4>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(metrics.averageProcessingTime)}ms
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium text-orange-800">Demo Duration</h4>
            <p className="text-2xl font-bold text-orange-600">
              {metrics.endTime 
                ? Math.round((metrics.endTime.getTime() - metrics.startTime.getTime()) / 1000)
                : Math.round((Date.now() - metrics.startTime.getTime()) / 1000)
              }s
            </p>
          </div>
        </div>
      )}

      {/* Performance Analytics */}
      {performanceAnalytics && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Performance Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Avg Transcription:</span>
              <p className="font-medium">{performanceAnalytics.averageTranscriptionTime}ms</p>
            </div>
            <div>
              <span className="text-gray-600">Avg Suggestion:</span>
              <p className="font-medium">{performanceAnalytics.averageSuggestionTime}ms</p>
            </div>
            <div>
              <span className="text-gray-600">Avg Accuracy:</span>
              <p className="font-medium">{performanceAnalytics.averageAccuracy}%</p>
            </div>
            <div>
              <span className="text-gray-600">Total Scenarios:</span>
              <p className="font-medium">{performanceAnalytics.totalScenarios}</p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Script */}
      <div className="mt-6">
        <details className="bg-gray-50 p-4 rounded-lg">
          <summary className="font-medium text-gray-800 cursor-pointer">
            📝 View Demo Script
          </summary>
          <pre className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">
            {hackathonDemoService.getDemoScript()}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default DemoControlPanel;