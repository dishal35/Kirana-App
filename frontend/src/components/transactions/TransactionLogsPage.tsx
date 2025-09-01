import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { transactionRepository, productRepository } from '../../dbs/repo';
import { LoadingSpinner } from '../LoadingSpinner';
import type { Transaction, Product } from '../../types';

interface TransactionFilters {
  dateRange?: { start: Date; end: Date };
  paymentType?: 'upi' | 'cash' | 'all';
  minAmount?: number;
  maxAmount?: number;
  productId?: string;
  searchText?: string;
}

interface TransactionAnalytics {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  upiTransactions: number;
  cashTransactions: number;
  topProducts: Array<{ productId: string; productName: string; totalSales: number; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number; amount: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; percentage: number }>;
}

export const TransactionLogsPage: React.FC = () => {
  const { state } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    paymentType: 'all',
    dateRange: {
      start: (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
      })(),
      end: (() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today;
      })()
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTransactions, allProducts] = await Promise.all([
        transactionRepository.getAll(),
        productRepository.getAll()
      ]);
      setTransactions(allTransactions);
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load transaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Date range filter
      if (filters.dateRange) {
        const transactionDate = new Date(transaction.timestamp);
        if (transactionDate < filters.dateRange.start || transactionDate > filters.dateRange.end) {
          return false;
        }
      }

      // Payment type filter
      if (filters.paymentType && filters.paymentType !== 'all' && transaction.type !== filters.paymentType) {
        return false;
      }

      // Amount range filter
      if (filters.minAmount && transaction.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount && transaction.amount > filters.maxAmount) {
        return false;
      }

      // Product filter
      if (filters.productId) {
        const hasProduct = transaction.products.some(item => item.productId === filters.productId);
        if (!hasProduct) {
          return false;
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesTranscription = transaction.transcription?.toLowerCase().includes(searchLower);
        const matchesAmount = transaction.amount.toString().includes(searchLower);
        const matchesProducts = transaction.products.some(item => {
          const product = products.find(p => p.id === item.productId);
          return product?.name.toLowerCase().includes(searchLower);
        });
        
        if (!matchesTranscription && !matchesAmount && !matchesProducts) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters, products]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  const analytics: TransactionAnalytics = useMemo(() => {
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = filteredTransactions.length;
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
    
    const upiTransactions = filteredTransactions.filter(t => t.type === 'upi').length;
    const cashTransactions = filteredTransactions.filter(t => t.type === 'cash').length;

    // Top products analysis
    const productSales = new Map<string, { totalSales: number; count: number; name: string }>();
    filteredTransactions.forEach(transaction => {
      transaction.products.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const existing = productSales.get(item.productId) || { totalSales: 0, count: 0, name: product.name };
          existing.totalSales += item.quantity * item.unitPrice;
          existing.count += item.quantity;
          productSales.set(item.productId, existing);
        }
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        totalSales: data.totalSales,
        count: data.count
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // Hourly distribution
    const hourlyData = new Map<number, { count: number; amount: number }>();
    filteredTransactions.forEach(transaction => {
      const hour = new Date(transaction.timestamp).getHours();
      const existing = hourlyData.get(hour) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += transaction.amount;
      hourlyData.set(hour, existing);
    });

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyData.get(hour)?.count || 0,
      amount: hourlyData.get(hour)?.amount || 0
    }));

    // Payment method distribution
    const paymentMethodDistribution = [
      {
        method: 'UPI',
        count: upiTransactions,
        percentage: transactionCount > 0 ? (upiTransactions / transactionCount) * 100 : 0
      },
      {
        method: 'Cash',
        count: cashTransactions,
        percentage: transactionCount > 0 ? (cashTransactions / transactionCount) * 100 : 0
      }
    ];

    return {
      totalAmount,
      transactionCount,
      averageAmount,
      upiTransactions,
      cashTransactions,
      topProducts,
      hourlyDistribution,
      paymentMethodDistribution
    };
  }, [filteredTransactions, products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date));
    } catch (error) {
      console.error('Invalid date:', date);
      return 'Invalid Date';
    }
  };

  const exportTransactions = async (format: 'csv' | 'json') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = ['Date', 'Time', 'Amount', 'Type', 'Products', 'Transcription', 'Confidence'];
        const rows = filteredTransactions.map(transaction => [
          new Date(transaction.timestamp).toLocaleDateString('en-IN'),
          new Date(transaction.timestamp).toLocaleTimeString('en-IN'),
          transaction.amount.toString(),
          transaction.type.toUpperCase(),
          transaction.products.map(item => {
            const product = products.find(p => p.id === item.productId);
            return `${product?.name || 'Unknown'} (${item.quantity})`;
          }).join('; '),
          transaction.transcription || '',
          transaction.confidence ? Math.round(transaction.confidence * 100).toString() + '%' : ''
        ]);

        content = [headers, ...rows].map(row => 
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        const exportData = filteredTransactions.map(transaction => ({
          ...transaction,
          products: transaction.products.map(item => ({
            ...item,
            productName: products.find(p => p.id === item.productId)?.name || 'Unknown'
          }))
        }));
        
        content = JSON.stringify(exportData, null, 2);
        filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export transactions:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" text="Loading transaction logs..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Logs</h1>
          <p className="text-gray-600">Comprehensive transaction history and analytics</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button
            onClick={() => exportTransactions('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportTransactions('json')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Overview</h2>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.totalAmount)}</div>
              <div className="text-sm text-blue-600">Total Revenue</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.transactionCount}</div>
              <div className="text-sm text-green-600">Total Transactions</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(analytics.averageAmount)}</div>
              <div className="text-sm text-purple-600">Average Amount</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {analytics.paymentMethodDistribution[0]?.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-orange-600">UPI Transactions</div>
            </div>
          </div>

          {/* Top Products */}
          {analytics.topProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Top Selling Products</h3>
              <div className="space-y-2">
                {analytics.topProducts.map((product, index) => (
                  <div key={product.productId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium">{product.productName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(product.totalSales)}</div>
                      <div className="text-sm text-gray-600">{product.count} units sold</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}    
  {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateRange?.start.toISOString().split('T')[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    start: new Date(e.target.value),
                    end: prev.dateRange?.end || new Date()
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.dateRange?.end.toISOString().split('T')[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    start: prev.dateRange?.start || new Date(),
                    end: new Date(e.target.value + 'T23:59:59')
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
            <select
              value={filters.paymentType || 'all'}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                paymentType: e.target.value as 'upi' | 'cash' | 'all'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="upi">UPI Only</option>
              <option value="cash">Cash Only</option>
            </select>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min amount"
                value={filters.minAmount || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  minAmount: e.target.value ? Number(e.target.value) : undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max amount"
                value={filters.maxAmount || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  maxAmount: e.target.value ? Number(e.target.value) : undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={filters.productId || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                productId: e.target.value || undefined
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            placeholder="Search by transcription, amount, or product name..."
            value={filters.searchText || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              searchText: e.target.value || undefined
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Clear Filters */}
        <div className="mt-4">
          <button
            onClick={() => setFilters({
              paymentType: 'all',
              dateRange: {
                start: new Date(new Date().setHours(0, 0, 0, 0)),
                end: new Date(new Date().setHours(23, 59, 59, 999))
              }
            })}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
            {filteredTransactions.length !== transactions.length && (
              <span className="ml-2 text-blue-600">
                (filtered from {transactions.length} total)
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-900">
            Total: {formatCurrency(analytics.totalAmount)}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
        </div>

        {paginatedTransactions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600">No transactions found matching your filters</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {paginatedTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 cursor-pointer"
                     onClick={() => setSelectedTransaction(transaction)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${
                        transaction.type === 'upi' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {transaction.type === 'upi' ? '📱' : '💵'}
                      </div>
                      <div className="ml-4">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(transaction.timestamp)} • {transaction.type.toUpperCase()}
                        </p>
                        {transaction.products.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">
                              Products: {transaction.products.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                return `${product?.name || 'Unknown'} (${item.quantity})`;
                              }).join(', ')}
                            </p>
                          </div>
                        )}
                        {transaction.transcription && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            "{transaction.transcription.substring(0, 100)}..."
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {transaction.confidence && (
                        <div className="text-xs text-gray-500 mb-1">
                          {Math.round(transaction.confidence * 100)}% confidence
                        </div>
                      )}
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                  <p className="text-lg text-gray-900 capitalize">{selectedTransaction.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-gray-900">{formatDateTime(selectedTransaction.timestamp)}</p>
                </div>
                {selectedTransaction.confidence && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confidence</label>
                    <p className="text-gray-900">{Math.round(selectedTransaction.confidence * 100)}%</p>
                  </div>
                )}
              </div>

              {/* Products */}
              {selectedTransaction.products.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Products</label>
                  <div className="space-y-2">
                    {selectedTransaction.products.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                            <p className="text-sm text-gray-600">per unit</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Audio Transcription */}
              {selectedTransaction.transcription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audio Transcription</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 italic">"{selectedTransaction.transcription}"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};