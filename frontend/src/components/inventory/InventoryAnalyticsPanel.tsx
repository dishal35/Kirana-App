import React, { useState } from 'react';
import type { InventoryAnalytics } from '../../types';

interface InventoryAnalyticsPanelProps {
  analytics: InventoryAnalytics;
  onRefresh: () => Promise<void>;
}

export const InventoryAnalyticsPanel: React.FC<InventoryAnalyticsPanelProps> = ({
  analytics,
  onRefresh
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const getMovementTrend = () => {
    const recent = analytics.stockMovement.slice(-7);
    const totalNet = recent.reduce((sum, day) => sum + day.netChange, 0);
    return totalNet >= 0 ? 'positive' : 'negative';
  };

  const getHealthScore = () => {
    const totalProducts = analytics.totalProducts;
    if (totalProducts === 0) return 0;
    
    const healthyProducts = totalProducts - analytics.lowStockCount - analytics.outOfStockCount - analytics.expiredCount;
    return Math.round((healthyProducts / totalProducts) * 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Inventory Value</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
            </div>
            <div className="text-3xl opacity-80">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Inventory Health</p>
              <p className="text-2xl font-bold">{getHealthScore()}%</p>
            </div>
            <div className="text-3xl opacity-80">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Stock Movement</p>
              <p className="text-2xl font-bold">
                {getMovementTrend() === 'positive' ? '📈' : '📉'}
                {getMovementTrend() === 'positive' ? 'Positive' : 'Negative'}
              </p>
            </div>
            <div className="text-3xl opacity-80">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Active Categories</p>
              <p className="text-2xl font-bold">{analytics.categoryBreakdown.length}</p>
            </div>
            <div className="text-3xl opacity-80">🏷️</div>
          </div>
        </div>
      </div>

      {/* Stock Movement Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Stock Movement Trend</h3>
          <div className="flex space-x-2">
            {(['7', '30', '90'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period} days
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {analytics.stockMovement.slice(-parseInt(selectedPeriod)).map((day, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-16 text-sm text-gray-600">
                {formatDate(day.date)}
              </div>
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">In: {day.totalIn}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-600">Out: {day.totalOut}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${day.netChange >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                  <span className={`text-sm ${day.netChange >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net: {day.netChange >= 0 ? '+' : ''}{day.netChange}
                  </span>
                </div>
              </div>
              <div className="w-32">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${day.netChange >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ 
                      width: `${Math.min(100, Math.abs(day.netChange) * 10)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Moving Products */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Moving Products</h3>
        <div className="space-y-3">
          {analytics.topMovingProducts.slice(0, 10).map((product, index) => (
            <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{product.productName || 'Unknown Product'}</div>
                  <div className="text-sm text-gray-600">
                    {product.frequency} transactions
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{product.totalMovement} units</div>
                <div className={`text-sm ${product.direction === 'out' ? 'text-red-600' : 'text-green-600'}`}>
                  {product.direction === 'out' ? '↓ Outgoing' : '↑ Incoming'}
                </div>
              </div>
            </div>
          ))}
          {analytics.topMovingProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <p>No product movement data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Category Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.categoryBreakdown.map((category) => (
            <div key={category.category} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900">{category.category}</h4>
                <span className="text-sm text-gray-500">{category.totalProducts} products</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Value:</span>
                  <span className="font-medium">{formatCurrency(category.totalValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Average Stock:</span>
                  <span className="font-medium">{Math.round(category.averageStock)} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Low Stock Items:</span>
                  <span className={`font-medium ${category.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {category.lowStockCount}
                  </span>
                </div>
              </div>

              {/* Health indicator */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Category Health:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          category.lowStockCount === 0 ? 'bg-green-500' :
                          category.lowStockCount <= category.totalProducts * 0.2 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.max(10, 100 - (category.lowStockCount / category.totalProducts) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${
                      category.lowStockCount === 0 ? 'text-green-600' :
                      category.lowStockCount <= category.totalProducts * 0.2 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {category.lowStockCount === 0 ? 'Good' :
                       category.lowStockCount <= category.totalProducts * 0.2 ? 'Fair' :
                       'Poor'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {analytics.categoryBreakdown.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏷️</div>
              <p>No category data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={onRefresh}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  );
};