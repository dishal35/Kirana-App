/**
 * Performance Monitoring Component
 * 
 * This component provides real-time performance monitoring and metrics
 * to ensure optimal performance on 8GB RAM systems.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { memoryManager, type MemoryMetrics } from '../utils/MemoryManager';
import { optimizedDb } from '../dbs/optimizedDb';

interface PerformanceMetrics {
  memory: MemoryMetrics | null;
  database: {
    products: number;
    transactions: number;
    inventoryAudit: number;
    stockAlerts: number;
    totalSize: number;
  } | null;
  audioCache: {
    size: number;
    totalMemoryUsage: number;
    oldestEntry: number;
    newestEntry: number;
  } | null;
  renderTime: number;
  isVisible: boolean;
}

interface PerformanceMonitorProps {
  showDetails?: boolean;
  updateInterval?: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  updateInterval = 5000, // 5 seconds
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: null,
    database: null,
    audioCache: null,
    renderTime: 0,
    isVisible: false,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Collect performance metrics
  const collectMetrics = useCallback(async () => {
    const startTime = performance.now();

    try {
      const [memoryMetrics, dbStats, cacheStats] = await Promise.all([
        Promise.resolve(memoryManager.getMemoryMetrics()),
        optimizedDb.getDatabaseStats().catch(() => null),
        Promise.resolve(memoryManager.getCacheStats()),
      ]);

      const renderTime = performance.now() - startTime;

      setMetrics(prev => ({
        ...prev,
        memory: memoryMetrics,
        database: dbStats,
        audioCache: cacheStats,
        renderTime,
      }));
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }, []);

  // Update metrics periodically
  useEffect(() => {
    collectMetrics();
    const interval = setInterval(collectMetrics, updateInterval);
    return () => clearInterval(interval);
  }, [collectMetrics, updateInterval]);

  // Show/hide based on performance issues
  useEffect(() => {
    const shouldShow = metrics.memory?.isMemoryPressure || 
                     (metrics.memory?.usedPercentage ?? 0) > 70 ||
                     showDetails;
    
    setMetrics(prev => ({ ...prev, isVisible: shouldShow }));
  }, [metrics.memory, showDetails]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get status color based on memory usage
  const getStatusColor = (percentage: number): string => {
    if (percentage > 85) return 'text-red-600 bg-red-100';
    if (percentage > 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (!metrics.isVisible && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact view */}
      {!isExpanded && (
        <div
          className={`p-2 rounded-lg shadow-lg cursor-pointer transition-all ${
            metrics.memory?.isMemoryPressure 
              ? 'bg-red-100 border-2 border-red-300' 
              : 'bg-white border border-gray-300'
          }`}
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium">
              {metrics.memory ? formatPercentage(metrics.memory.usedPercentage) : 'N/A'}
            </span>
            {metrics.memory?.isMemoryPressure && (
              <span className="text-red-600 text-xs">⚠️</span>
            )}
          </div>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Performance Monitor</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Memory Metrics */}
          {metrics.memory && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
              <div className="space-y-2">
                <div className={`px-2 py-1 rounded text-sm ${getStatusColor(metrics.memory.usedPercentage)}`}>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{formatPercentage(metrics.memory.usedPercentage)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Heap Used:</span>
                    <span>{formatBytes(metrics.memory.usedJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Total:</span>
                    <span>{formatBytes(metrics.memory.totalJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Limit:</span>
                    <span>{formatBytes(metrics.memory.jsHeapSizeLimit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Metrics */}
          {metrics.database && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Database</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Products:</span>
                  <span>{metrics.database.products}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span>{metrics.database.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Audit Entries:</span>
                  <span>{metrics.database.inventoryAudit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alerts:</span>
                  <span>{metrics.database.stockAlerts}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Est. Size:</span>
                  <span>{formatBytes(metrics.database.totalSize)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Audio Cache Metrics */}
          {metrics.audioCache && metrics.audioCache.size > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Audio Cache</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Cached Items:</span>
                  <span>{metrics.audioCache.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Used:</span>
                  <span>{formatBytes(metrics.audioCache.totalMemoryUsage)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance Actions */}
          <div className="border-t pt-3 space-y-2">
            <button
              onClick={() => {
                memoryManager.clearAudioCache();
                collectMetrics();
              }}
              className="w-full px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Clear Audio Cache
            </button>
            
            <button
              onClick={() => {
                if ('gc' in window && typeof (window as any).gc === 'function') {
                  (window as any).gc();
                  setTimeout(collectMetrics, 1000);
                } else {
                  alert('Garbage collection not available. Enable in Chrome DevTools.');
                }
              }}
              className="w-full px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Force GC (DevTools)
            </button>

            <div className="text-xs text-gray-500 text-center">
              Render: {metrics.renderTime.toFixed(1)}ms
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;