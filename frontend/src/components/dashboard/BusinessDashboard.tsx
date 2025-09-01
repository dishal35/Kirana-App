import React, { useState, useEffect } from 'react';
import { dashboardService, type DashboardMetrics } from '../../services/DashboardService';
import { SimpleDemoService } from '../../services/SimpleDemoService';
import { productRepository } from '../../dbs/repo';
import { DateNavigator } from '../common/DateNavigator';
import { ClickToSpeakAudio } from '../audio/ClickToSpeakAudio';
import { useDate } from '../../contexts/DateContext';
import { useAuth } from '../../contexts/AuthContext';

// Icon components for better visual design
const SalesIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const ProductIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const TrendIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export const BusinessDashboard: React.FC = () => {
  const { selectedDate } = useDate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load general metrics
      const data = await dashboardService.getAllMetrics();
      setMetrics(data);
      
      // Load date-specific transactions if using demo account
      if (user?.type === 'demo') {
        const transactions = await SimpleDemoService.getTransactionsForDate(selectedDate);
        setDailySummary({
          totalSales: transactions.reduce((sum, t) => sum + t.amount, 0),
          totalTransactions: transactions.length,
          upiTransactions: transactions.filter(t => t.type === 'upi').length,
          cashTransactions: transactions.filter(t => t.type === 'cash').length
        });
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [selectedDate, user?.type]); // Reload when date or user changes

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !metrics) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" role="status" aria-label="Loading"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertIcon />
          <div className="ml-3">
            <p className="text-red-600 font-medium">Error loading dashboard</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={loadMetrics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600">Last updated: {formatTime(lastUpdated)}</p>
        </div>
        <button
          onClick={loadMetrics}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Date Navigator */}
      <DateNavigator />

      {/* Click to Speak Audio */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-indigo-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">🎤 Voice Transaction Entry</h3>
        <ClickToSpeakAudio 
          onTransactionDetected={async (result) => {
            console.log('Transaction detected:', result);
            
            // For demo purposes, create a simple transaction
            if (user?.type === 'demo' && result.amount > 0) {
              try {
                // Get a random product for the transaction
                const allProducts = await productRepository.getAll();
                if (allProducts.length > 0) {
                  const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
                  
                  await SimpleDemoService.addManualTransaction(
                    result.amount,
                    result.transcription,
                    [{ productId: randomProduct.id!, quantity: 1 }]
                  );
                  
                  // Refresh the dashboard
                  loadMetrics();
                  
                  alert(`✅ Transaction created: ₹${result.amount} for ${randomProduct.name}`);
                }
              } catch (error) {
                console.error('Failed to create transaction:', error);
                alert('Failed to create transaction. Please try again.');
              }
            }
          }}
        />
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Daily Sales */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <SalesIcon />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.dailySales.total)}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.dailySales.transactionCount} transactions
              </p>
            </div>
          </div>
        </div>

        {/* Top Product */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <ProductIcon />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Product</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {metrics.topSellingProduct.product?.name || 'No sales yet'}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.topSellingProduct.quantitySold > 0 
                  ? `${metrics.topSellingProduct.quantitySold} sold`
                  : 'Start selling today'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              metrics.lowStockAlerts.count > 0 
                ? 'bg-yellow-100 text-yellow-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <AlertIcon />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.lowStockAlerts.count}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.lowStockAlerts.count > 0 ? 'Need attention' : 'All good'}
              </p>
            </div>
          </div>
        </div>

        {/* Average Transaction */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <TrendIcon />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.dailySales.averageTransaction)}
              </p>
              <p className="text-xs text-gray-500">
                Per sale today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">7-Day Revenue Trend</h2>
        <div className="h-64">
          <SimpleBarChart data={metrics.revenueChart} />
        </div>
      </div>

      {/* Low Stock Products Alert */}
      {metrics.lowStockAlerts.count > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
              <AlertIcon />
            </div>
            <h2 className="ml-3 text-lg font-semibold text-yellow-800">
              Low Stock Alert
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.lowStockAlerts.products.slice(0, 6).map((product) => (
              <div key={product.id} className="bg-white p-4 rounded border border-yellow-200">
                <div className="flex items-center">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      Stock: {product.stock} (Threshold: {product.reorderThreshold})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {metrics.lowStockAlerts.products.length > 6 && (
            <p className="mt-4 text-sm text-yellow-700">
              And {metrics.lowStockAlerts.products.length - 6} more products need restocking
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Simple Bar Chart Component
interface SimpleBarChartProps {
  data: {
    dates: string[];
    amounts: number[];
  };
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data }) => {
  const maxAmount = Math.max(...data.amounts, 1);
  
  return (
    <div className="flex items-end justify-between h-full space-x-2 px-4">
      {data.dates.map((date, index) => {
        const amount = data.amounts[index];
        const height = (amount / maxAmount) * 100;
        
        return (
          <div key={date} className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col items-center">
              <div className="text-xs text-gray-600 mb-1">
                ₹{amount > 0 ? Math.round(amount) : 0}
              </div>
              <div
                className="w-full bg-blue-500 rounded-t transition-all duration-300 min-h-[4px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              {date}
            </div>
          </div>
        );
      })}
    </div>
  );
};