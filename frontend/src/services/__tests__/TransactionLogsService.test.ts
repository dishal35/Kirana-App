import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionLogsService } from '../TransactionLogsService';
import { transactionRepository, productRepository } from '../../dbs/repo';
import type { Transaction, Product } from '../../types';

// Mock Blob
class MockBlob {
  constructor(public content: any[], public options: any) {}
  
  get type() {
    return this.options.type;
  }
  
  async text() {
    return this.content.join('');
  }
}

// @ts-ignore
global.Blob = MockBlob;

// Mock the repositories
vi.mock('../../dbs/repo', () => ({
  transactionRepository: {
    getAll: vi.fn()
  },
  productRepository: {
    getAll: vi.fn()
  }
}));

const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 100,
    products: [{ productId: 'p1', quantity: 2, unitPrice: 50 }],
    type: 'upi',
    timestamp: new Date('2024-01-15T10:30:00'),
    transcription: 'Received 100 rupees on PhonePe',
    confidence: 0.95
  },
  {
    id: '2',
    amount: 250,
    products: [{ productId: 'p2', quantity: 1, unitPrice: 250 }],
    type: 'cash',
    timestamp: new Date('2024-01-15T14:20:00'),
    transcription: undefined,
    confidence: undefined
  },
  {
    id: '3',
    amount: 75,
    products: [
      { productId: 'p1', quantity: 1, unitPrice: 50 },
      { productId: 'p3', quantity: 1, unitPrice: 25 }
    ],
    type: 'upi',
    timestamp: new Date('2024-01-14T09:15:00'),
    transcription: 'GPay payment received 75 rupees',
    confidence: 0.88
  },
  {
    id: '4',
    amount: 300,
    products: [{ productId: 'p2', quantity: 2, unitPrice: 150 }],
    type: 'upi',
    timestamp: new Date('2024-01-13T16:45:00'),
    transcription: 'UPI payment 300 rupees',
    confidence: 0.92
  }
];

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Bread',
    price: 50,
    stock: 20,
    reorderThreshold: 5,
    category: 'Bakery',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p2',
    name: 'Milk',
    price: 250,
    stock: 10,
    reorderThreshold: 3,
    category: 'Dairy',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'p3',
    name: 'Biscuits',
    price: 25,
    stock: 15,
    reorderThreshold: 5,
    category: 'Snacks',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

describe('TransactionLogsService', () => {
  let service: TransactionLogsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TransactionLogsService();
    
    (transactionRepository.getAll as any).mockResolvedValue(mockTransactions);
    (productRepository.getAll as any).mockResolvedValue(mockProducts);
  });

  describe('loadData', () => {
    it('loads transactions and products successfully', async () => {
      const result = await service.loadData();

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.products).toEqual(mockProducts);
      expect(transactionRepository.getAll).toHaveBeenCalled();
      expect(productRepository.getAll).toHaveBeenCalled();
    });

    it('throws error when loading fails', async () => {
      (transactionRepository.getAll as any).mockRejectedValue(new Error('Database error'));

      await expect(service.loadData()).rejects.toThrow('Failed to load transaction data');
    });
  });

  describe('filterTransactions', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('filters by date range', () => {
      const filters = {
        dateRange: {
          start: new Date('2024-01-14T00:00:00'),
          end: new Date('2024-01-15T23:59:59')
        }
      };

      const result = service.filterTransactions(filters);
      expect(result).toHaveLength(3);
      expect(result.map(t => t.id)).toEqual(['1', '2', '3']);
    });

    it('filters by payment type', () => {
      const filters = { paymentType: 'upi' as const };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(3);
      expect(result.every(t => t.type === 'upi')).toBe(true);
    });

    it('filters by amount range', () => {
      const filters = { minAmount: 100, maxAmount: 250 };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(2);
      expect(result.map(t => t.amount)).toEqual([100, 250]);
    });

    it('filters by product', () => {
      const filters = { productId: 'p2' };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(2);
      expect(result.every(t => t.products.some(p => p.productId === 'p2'))).toBe(true);
    });

    it('filters by search text in transcription', () => {
      const filters = { searchText: 'PhonePe' };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by search text in product name', () => {
      const filters = { searchText: 'Bread' };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(2);
      expect(result.every(t => t.products.some(p => p.productId === 'p1'))).toBe(true);
    });

    it('filters by search text in amount', () => {
      const filters = { searchText: '100' };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
    });

    it('applies multiple filters', () => {
      const filters = {
        paymentType: 'upi' as const,
        minAmount: 50,
        searchText: 'GPay'
      };
      const result = service.filterTransactions(filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });

  describe('calculateAnalytics', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('calculates basic analytics correctly', () => {
      const analytics = service.calculateAnalytics(mockTransactions);

      expect(analytics.totalAmount).toBe(725); // 100 + 250 + 75 + 300
      expect(analytics.transactionCount).toBe(4);
      expect(analytics.averageAmount).toBe(181.25);
      expect(analytics.upiTransactions).toBe(3);
      expect(analytics.cashTransactions).toBe(1);
    });

    it('calculates top products correctly', () => {
      const analytics = service.calculateAnalytics(mockTransactions);

      expect(analytics.topProducts).toHaveLength(3);
      expect(analytics.topProducts[0]).toEqual({
        productId: 'p2',
        productName: 'Milk',
        totalSales: 550, // 250 + 300
        count: 3 // 1 + 2
      });
      expect(analytics.topProducts[1]).toEqual({
        productId: 'p1',
        productName: 'Bread',
        totalSales: 150, // 100 + 50
        count: 3 // 2 + 1
      });
    });

    it('calculates hourly distribution', () => {
      const analytics = service.calculateAnalytics(mockTransactions);

      expect(analytics.hourlyDistribution).toHaveLength(24);
      expect(analytics.hourlyDistribution[10]).toEqual({ hour: 10, count: 1, amount: 100 });
      expect(analytics.hourlyDistribution[14]).toEqual({ hour: 14, count: 1, amount: 250 });
      expect(analytics.hourlyDistribution[9]).toEqual({ hour: 9, count: 1, amount: 75 });
    });

    it('calculates payment method distribution', () => {
      const analytics = service.calculateAnalytics(mockTransactions);

      expect(analytics.paymentMethodDistribution).toEqual([
        { method: 'UPI', count: 3, percentage: 75 },
        { method: 'Cash', count: 1, percentage: 25 }
      ]);
    });

    it('calculates daily trends', () => {
      const analytics = service.calculateAnalytics(mockTransactions);

      expect(analytics.dailyTrends).toHaveLength(3);
      expect(analytics.dailyTrends.find(d => d.date === '2024-01-15')).toEqual({
        date: '2024-01-15',
        amount: 350, // 100 + 250
        count: 2
      });
    });

    it('handles empty transaction list', () => {
      const analytics = service.calculateAnalytics([]);

      expect(analytics.totalAmount).toBe(0);
      expect(analytics.transactionCount).toBe(0);
      expect(analytics.averageAmount).toBe(0);
      expect(analytics.topProducts).toHaveLength(0);
    });
  });

  describe('exportTransactions', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('exports as CSV with basic options', async () => {
      const blob = await service.exportTransactions(mockTransactions.slice(0, 1), {
        format: 'csv'
      });

      expect(blob.type).toBe('text/csv;charset=utf-8;');
      
      const text = await blob.text();
      expect(text).toContain('"Transaction ID","Date","Time","Amount","Payment Type","Product Count"');
      expect(text).toContain('"1"');
      expect(text).toContain('"100"');
      expect(text).toContain('"UPI"');
    });

    it('exports as CSV with products included', async () => {
      const blob = await service.exportTransactions(mockTransactions.slice(0, 1), {
        format: 'csv',
        includeProducts: true
      });

      const text = await blob.text();
      expect(text).toContain('"Products","Product Details"');
      expect(text).toContain('"Bread"');
    });

    it('exports as CSV with transcription included', async () => {
      const blob = await service.exportTransactions(mockTransactions.slice(0, 1), {
        format: 'csv',
        includeTranscription: true
      });

      const text = await blob.text();
      expect(text).toContain('"Transcription","Confidence"');
      expect(text).toContain('"Received 100 rupees on PhonePe"');
      expect(text).toContain('"95%"');
    });

    it('exports as JSON with basic options', async () => {
      const blob = await service.exportTransactions(mockTransactions.slice(0, 1), {
        format: 'json'
      });

      expect(blob.type).toBe('application/json;charset=utf-8;');
      
      const text = await blob.text();
      const data = JSON.parse(text);
      
      expect(data.transactionCount).toBe(1);
      expect(data.transactions).toHaveLength(1);
      expect(data.transactions[0].id).toBe('1');
      expect(data.transactions[0].amount).toBe(100);
    });

    it('exports as JSON with analytics included', async () => {
      const blob = await service.exportTransactions(mockTransactions, {
        format: 'json',
        includeAnalytics: true
      });

      const text = await blob.text();
      const data = JSON.parse(text);
      
      expect(data.analytics).toBeDefined();
      expect(data.analytics.totalAmount).toBe(725);
      expect(data.analytics.transactionCount).toBe(4);
    });

    it('throws error on export failure', async () => {
      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw new Error('Stringify error');
      });

      await expect(
        service.exportTransactions(mockTransactions, { format: 'json' })
      ).rejects.toThrow('Failed to export transactions');

      JSON.stringify = originalStringify;
    });
  });

  describe('paginateTransactions', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('paginates transactions correctly', () => {
      const result = service.paginateTransactions(mockTransactions, 1, 2);

      expect(result.transactions).toHaveLength(2);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(4);
    });

    it('handles last page correctly', () => {
      const result = service.paginateTransactions(mockTransactions, 2, 3);

      expect(result.transactions).toHaveLength(1);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(2);
    });

    it('handles page out of bounds', () => {
      // mockTransactions has 4 items, with pageSize 2, we have 2 pages
      // Page 10 should be clamped to page 2, which has the last 2 items
      const result = service.paginateTransactions(mockTransactions, 10, 2);

      expect(result.currentPage).toBe(2); // Should be clamped to max page
      expect(result.transactions).toHaveLength(2); // Page 2 has 2 items (transactions 3,4)
      expect(result.totalPages).toBe(2);
    });

    it('handles empty transaction list', () => {
      const result = service.paginateTransactions([], 1, 10);

      expect(result.transactions).toHaveLength(0);
      expect(result.totalPages).toBe(0);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('searchTransactions', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('searches by transcription', () => {
      const result = service.searchTransactions('PhonePe');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('searches by amount', () => {
      const result = service.searchTransactions('250');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('searches by product name', () => {
      const result = service.searchTransactions('Milk');
      expect(result).toHaveLength(2);
    });

    it('searches by payment type', () => {
      const result = service.searchTransactions('cash');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cash');
    });

    it('returns all transactions for empty query', () => {
      const result = service.searchTransactions('');
      expect(result).toHaveLength(4);
    });

    it('returns empty array for no matches', () => {
      const result = service.searchTransactions('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await service.loadData();
    });

    it('gets transaction by ID', () => {
      const transaction = service.getTransactionById('2');
      expect(transaction?.id).toBe('2');
      expect(transaction?.amount).toBe(250);
    });

    it('returns undefined for non-existent ID', () => {
      const transaction = service.getTransactionById('nonexistent');
      expect(transaction).toBeUndefined();
    });

    it('gets transactions by date range', () => {
      const result = service.getTransactionsByDateRange(
        new Date('2024-01-14T00:00:00'),
        new Date('2024-01-15T23:59:59')
      );
      expect(result).toHaveLength(3);
    });

    it('gets transactions by product', () => {
      const result = service.getTransactionsByProduct('p1');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.products.some(p => p.productId === 'p1'))).toBe(true);
    });

    it('gets recent transactions', () => {
      const result = service.getRecentTransactions(2);
      expect(result).toHaveLength(2);
      // Should be sorted by timestamp descending
      // Transaction 2 (2024-01-15T14:20:00) is more recent than Transaction 1 (2024-01-15T10:30:00)
      expect(result[0].id).toBe('2'); // Most recent
      expect(result[1].id).toBe('1');
    });

    it('limits recent transactions correctly', () => {
      const result = service.getRecentTransactions(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2'); // Most recent transaction
    });
  });
});