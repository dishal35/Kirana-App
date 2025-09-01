import { transactionRepository, productRepository } from '../dbs/repo';
import type { Transaction, Product } from '../types';

export interface TransactionFilters {
  dateRange?: { start: Date; end: Date };
  paymentType?: 'upi' | 'cash' | 'all';
  minAmount?: number;
  maxAmount?: number;
  productId?: string;
  searchText?: string;
}

export interface TransactionAnalytics {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  upiTransactions: number;
  cashTransactions: number;
  topProducts: Array<{ 
    productId: string; 
    productName: string; 
    totalSales: number; 
    count: number; 
  }>;
  hourlyDistribution: Array<{ hour: number; count: number; amount: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; percentage: number }>;
  dailyTrends: Array<{ date: string; amount: number; count: number }>;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeProducts?: boolean;
  includeTranscription?: boolean;
  includeAnalytics?: boolean;
}

export class TransactionLogsService {
  private transactions: Transaction[] = [];
  private products: Product[] = [];

  async loadData(): Promise<{ transactions: Transaction[]; products: Product[] }> {
    try {
      const [transactions, products] = await Promise.all([
        transactionRepository.getAll(),
        productRepository.getAll()
      ]);
      
      this.transactions = transactions;
      this.products = products;
      
      return { transactions, products };
    } catch (error) {
      console.error('Failed to load transaction data:', error);
      throw new Error('Failed to load transaction data');
    }
  }

  filterTransactions(filters: TransactionFilters): Transaction[] {
    return this.transactions.filter(transaction => {
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
      if (filters.minAmount !== undefined && transaction.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount !== undefined && transaction.amount > filters.maxAmount) {
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
          const product = this.products.find(p => p.id === item.productId);
          return product?.name.toLowerCase().includes(searchLower);
        });
        
        if (!matchesTranscription && !matchesAmount && !matchesProducts) {
          return false;
        }
      }

      return true;
    });
  }

  calculateAnalytics(transactions: Transaction[]): TransactionAnalytics {
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = transactions.length;
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
    
    const upiTransactions = transactions.filter(t => t.type === 'upi').length;
    const cashTransactions = transactions.filter(t => t.type === 'cash').length;

    // Top products analysis
    const productSales = new Map<string, { totalSales: number; count: number; name: string }>();
    transactions.forEach(transaction => {
      transaction.products.forEach(item => {
        const product = this.products.find(p => p.id === item.productId);
        if (product) {
          const existing = productSales.get(item.productId) || { 
            totalSales: 0, 
            count: 0, 
            name: product.name 
          };
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
      .slice(0, 10);

    // Hourly distribution
    const hourlyData = new Map<number, { count: number; amount: number }>();
    transactions.forEach(transaction => {
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

    // Daily trends
    const dailyData = new Map<string, { amount: number; count: number }>();
    transactions.forEach(transaction => {
      const dateKey = new Date(transaction.timestamp).toISOString().split('T')[0];
      const existing = dailyData.get(dateKey) || { amount: 0, count: 0 };
      existing.amount += transaction.amount;
      existing.count += 1;
      dailyData.set(dateKey, existing);
    });

    const dailyTrends = Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, amount: data.amount, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAmount,
      transactionCount,
      averageAmount,
      upiTransactions,
      cashTransactions,
      topProducts,
      hourlyDistribution,
      paymentMethodDistribution,
      dailyTrends
    };
  }

  async exportTransactions(
    transactions: Transaction[], 
    options: ExportOptions
  ): Promise<Blob> {
    try {
      if (options.format === 'csv') {
        return this.exportAsCSV(transactions, options);
      } else {
        return this.exportAsJSON(transactions, options);
      }
    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw new Error('Failed to export transactions');
    }
  }

  private exportAsCSV(transactions: Transaction[], options: ExportOptions): Blob {
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'Amount',
      'Payment Type',
      'Product Count'
    ];

    if (options.includeProducts) {
      headers.push('Products', 'Product Details');
    }

    if (options.includeTranscription) {
      headers.push('Transcription', 'Confidence');
    }

    const rows = transactions.map(transaction => {
      const row = [
        transaction.id || '',
        new Date(transaction.timestamp).toLocaleDateString('en-IN'),
        new Date(transaction.timestamp).toLocaleTimeString('en-IN'),
        transaction.amount.toString(),
        transaction.type.toUpperCase(),
        transaction.products.length.toString()
      ];

      if (options.includeProducts) {
        const productNames = transaction.products.map(item => {
          const product = this.products.find(p => p.id === item.productId);
          return product?.name || 'Unknown';
        }).join('; ');

        const productDetails = transaction.products.map(item => {
          const product = this.products.find(p => p.id === item.productId);
          return `${product?.name || 'Unknown'} (Qty: ${item.quantity}, Price: ₹${item.unitPrice})`;
        }).join('; ');

        row.push(productNames, productDetails);
      }

      if (options.includeTranscription) {
        row.push(
          transaction.transcription || '',
          transaction.confidence ? `${Math.round(transaction.confidence * 100)}%` : ''
        );
      }

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private exportAsJSON(transactions: Transaction[], options: ExportOptions): Blob {
    const exportData = transactions.map(transaction => {
      const data: any = {
        id: transaction.id,
        timestamp: transaction.timestamp,
        amount: transaction.amount,
        type: transaction.type,
        productCount: transaction.products.length
      };

      if (options.includeProducts) {
        data.products = transaction.products.map(item => ({
          ...item,
          productName: this.products.find(p => p.id === item.productId)?.name || 'Unknown'
        }));
      }

      if (options.includeTranscription) {
        data.transcription = transaction.transcription;
        data.confidence = transaction.confidence;
      }

      return data;
    });

    let finalExport: any = {
      exportDate: new Date().toISOString(),
      transactionCount: transactions.length,
      transactions: exportData
    };

    if (options.includeAnalytics) {
      finalExport.analytics = this.calculateAnalytics(transactions);
    }

    return new Blob([JSON.stringify(finalExport, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
  }

  paginateTransactions(
    transactions: Transaction[], 
    page: number, 
    pageSize: number
  ): { 
    transactions: Transaction[]; 
    totalPages: number; 
    currentPage: number; 
    totalCount: number; 
  } {
    const totalCount = transactions.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const currentPage = totalPages === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    return {
      transactions: paginatedTransactions,
      totalPages,
      currentPage,
      totalCount
    };
  }

  searchTransactions(query: string): Transaction[] {
    if (!query.trim()) {
      return this.transactions;
    }

    const searchLower = query.toLowerCase();
    return this.transactions.filter(transaction => {
      // Search in transcription
      if (transaction.transcription?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in amount
      if (transaction.amount.toString().includes(searchLower)) {
        return true;
      }

      // Search in product names
      const hasMatchingProduct = transaction.products.some(item => {
        const product = this.products.find(p => p.id === item.productId);
        return product?.name.toLowerCase().includes(searchLower);
      });

      if (hasMatchingProduct) {
        return true;
      }

      // Search in payment type
      if (transaction.type.toLowerCase().includes(searchLower)) {
        return true;
      }

      return false;
    });
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  getTransactionsByProduct(productId: string): Transaction[] {
    return this.transactions.filter(transaction =>
      transaction.products.some(item => item.productId === productId)
    );
  }

  getRecentTransactions(limit: number = 10): Transaction[] {
    return this.transactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

// Export singleton instance
export const transactionLogsService = new TransactionLogsService();