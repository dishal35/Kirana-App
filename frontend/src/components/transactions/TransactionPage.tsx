import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { LoadingSpinner } from '../LoadingSpinner';
import type { Transaction } from '../../types';

export const TransactionPage: React.FC = () => {
  const { state, refreshData } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // This would load transactions based on the filter
      // For now, just use today's transactions from state
      setTransactions(state.todaysTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getFilterTitle = (filter: string) => {
    const titles = {
      all: {
        en: 'All Transactions',
        hi: 'सभी लेन-देन',
        kn: 'ಎಲ್ಲಾ ವ್ಯವಹಾರಗಳು',
      },
      today: {
        en: 'Today',
        hi: 'आज',
        kn: 'ಇಂದು',
      },
      week: {
        en: 'This Week',
        hi: 'इस सप्ताह',
        kn: 'ಈ ವಾರ',
      },
      month: {
        en: 'This Month',
        hi: 'इस महीने',
        kn: 'ಈ ತಿಂಗಳು',
      },
    };

    return titles[filter as keyof typeof titles]?.[state.language] || filter;
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" text="Loading transactions..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {state.language === 'hi' ? 'लेन-देन इतिहास' :
             state.language === 'kn' ? 'ವ್ಯವಹಾರ ಇತಿಹಾಸ' :
             'Transaction History'}
          </h1>
          <p className="text-gray-600">
            {state.language === 'hi' ? 'अपने सभी लेन-देन देखें और प्रबंधित करें' :
             state.language === 'kn' ? 'ನಿಮ್ಮ ಎಲ್ಲಾ ವ್ಯವಹಾರಗಳನ್ನು ನೋಡಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ' :
             'View and manage all your transactions'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['today', 'week', 'month', 'all'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === filterOption
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getFilterTitle(filterOption)}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {state.language === 'hi' ? 'कुल राशि' :
                 state.language === 'kn' ? 'ಒಟ್ಟು ಮೊತ್ತ' :
                 'Total Amount'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {state.language === 'hi' ? 'लेन-देन संख्या' :
                 state.language === 'kn' ? 'ವ್ಯವಹಾರಗಳ ಸಂಖ್ಯೆ' :
                 'Transaction Count'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {transactions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {state.language === 'hi' ? 'औसत राशि' :
                 state.language === 'kn' ? 'ಸರಾಸರಿ ಮೊತ್ತ' :
                 'Average Amount'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  transactions.length > 0 
                    ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {state.language === 'hi' ? 'हाल के लेन-देन' :
             state.language === 'kn' ? 'ಇತ್ತೀಚಿನ ವ್ಯವಹಾರಗಳು' :
             'Recent Transactions'}
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600">
              {state.language === 'hi' ? 'कोई लेन-देन नहीं मिला' :
               state.language === 'kn' ? 'ಯಾವುದೇ ವ್ಯವಹಾರಗಳು ಕಂಡುಬಂದಿಲ್ಲ' :
               'No transactions found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'upi' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {transaction.type === 'upi' ? '📱' : '💵'}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatTime(transaction.timestamp)} • {transaction.type.toUpperCase()}
                      </p>
                      {transaction.products.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {transaction.products.length} {
                            transaction.products.length === 1 ? 'item' : 'items'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {transaction.confidence && (
                      <div className="text-xs text-gray-500">
                        {Math.round(transaction.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};