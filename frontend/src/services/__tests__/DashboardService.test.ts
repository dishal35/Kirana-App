import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardService } from '../DashboardService';
import { transactionRepository, productRepository } from '../../dbs/repo';
import type { Transaction, Product } from '../../types';

// Mock the repositories
vi.mock('../../dbs/repo', () => ({
  transactionRepository: {
    getTodaysTransactions: vi.fn(),
    getTransactionsByDateRange: vi.fn(),
  },
  productRepository: {
    getAll: vi.fn(),
    getLowStockProducts: vi.fn(),
  },
}));

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockProducts: Product[];
  let mockTransactions: Transaction[];

  beforeEach(() => {
    dashboardService = new DashboardService();
    
    // Reset mocks
    vi.clearAllMocks();

    // Mock products
    mockProducts = [
      {
        id: '1',
        name: 'Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 20,
        category: 'Grains',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        name: 'Dal',
        price: 80,
        stock: 5, // Low stock
        reorderThreshold: 10,
        category: 'Pulses',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '3',
        name: 'Oil',
        price: 120,
        stock: 30,
        reorderThreshold: 15,
        category: 'Cooking',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    // Mock transactions for today
    mockTransactions = [
      {
        id: '1',
        amount: 130, // Rice (2 * 50) + Oil (1 * 30) = 130
        products: [
          { productId: '1', quantity: 2, unitPrice: 50 },
          { productId: '3', quantity: 1, unitPrice: 30 },
        ],
        type: 'upi',
        timestamp: new Date(),
      },
      {
        id: '2',
        amount: 160, // Dal (2 * 80) = 160
        products: [
          { productId: '2', quantity: 2, unitPrice: 80 },
        ],
        type: 'cash',
        timestamp: new Date(),
      },
      {
        id: '3',
        amount: 100, // Rice (2 * 50) = 100
        products: [
          { productId: '1', quantity: 2, unitPrice: 50 },
        ],
        type: 'upi',
        timestamp: new Date(),
      },
    ];

    // Setup default mocks
    vi.mocked(productRepository.getAll).mockResolvedValue(mockProducts);
    vi.mocked(productRepository.getLowStockProducts).mockResolvedValue([mockProducts[1]]); // Dal is low stock
    vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue(mockTransactions);
  });

  describe('getDailySalesMetrics', () => {
    it('should calculate correct daily sales metrics', async () => {
      const result = await dashboardService.getDailySalesMetrics();

      expect(result.total).toBe(390); // 130 + 160 + 100
      expect(result.transactionCount).toBe(3);
      expect(result.averageTransaction).toBe(130); // 390 / 3
    });

    it('should handle empty transactions', async () => {
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);

      const result = await dashboardService.getDailySalesMetrics();

      expect(result.total).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.averageTransaction).toBe(0);
    });
  });

  describe('getTopSellingProduct', () => {
    it('should identify top selling product by quantity', async () => {
      const result = await dashboardService.getTopSellingProduct();

      expect(result.product?.name).toBe('Rice'); // 4 units sold (2 + 2)
      expect(result.quantitySold).toBe(4);
      expect(result.revenue).toBe(200); // 4 * 50
    });

    it('should handle no sales', async () => {
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);

      const result = await dashboardService.getTopSellingProduct();

      expect(result.product).toBeNull();
      expect(result.quantitySold).toBe(0);
      expect(result.revenue).toBe(0);
    });

    it('should handle products not found in catalog', async () => {
      const transactionsWithUnknownProduct: Transaction[] = [
        {
          id: '1',
          amount: 100,
          products: [{ productId: 'unknown', quantity: 1, unitPrice: 100 }],
          type: 'upi',
          timestamp: new Date(),
        },
      ];

      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue(transactionsWithUnknownProduct);

      const result = await dashboardService.getTopSellingProduct();

      expect(result.product).toBeNull();
      expect(result.quantitySold).toBe(0);
      expect(result.revenue).toBe(0);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return correct low stock alerts', async () => {
      const result = await dashboardService.getLowStockAlerts();

      expect(result.count).toBe(1);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Dal');
    });

    it('should handle no low stock products', async () => {
      vi.mocked(productRepository.getLowStockProducts).mockResolvedValue([]);

      const result = await dashboardService.getLowStockAlerts();

      expect(result.count).toBe(0);
      expect(result.products).toHaveLength(0);
    });
  });

  describe('getRevenueChart', () => {
    it('should generate revenue chart for specified days', async () => {
      // Mock transactions for different days
      const mockDateTransactions = new Map();
      
      // Setup mock for getTransactionsByDateRange to return different amounts for different days
      vi.mocked(transactionRepository.getTransactionsByDateRange).mockImplementation(
        async (startDate: Date, endDate: Date) => {
          const dateKey = startDate.toDateString();
          return mockDateTransactions.get(dateKey) || [];
        }
      );

      // Add some mock data for the last 3 days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      mockDateTransactions.set(today.toDateString(), [
        { id: '1', amount: 100, products: [], type: 'upi', timestamp: today }
      ]);
      mockDateTransactions.set(yesterday.toDateString(), [
        { id: '2', amount: 200, products: [], type: 'cash', timestamp: yesterday }
      ]);

      const result = await dashboardService.getRevenueChart(3);

      expect(result.dates).toHaveLength(3);
      expect(result.amounts).toHaveLength(3);
      expect(result.amounts[2]).toBe(100); // Today's amount
      expect(result.amounts[1]).toBe(200); // Yesterday's amount
      expect(result.amounts[0]).toBe(0); // Day before (no transactions)
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top selling products list', async () => {
      const result = await dashboardService.getTopSellingProducts(3);

      expect(result).toHaveLength(3);
      expect(result[0].productName).toBe('Rice'); // Top seller
      expect(result[0].quantitySold).toBe(4);
      expect(result[0].revenue).toBe(200);
      
      expect(result[1].productName).toBe('Dal'); // Second
      expect(result[1].quantitySold).toBe(2);
      expect(result[1].revenue).toBe(160);
      
      expect(result[2].productName).toBe('Oil'); // Third
      expect(result[2].quantitySold).toBe(1);
      expect(result[2].revenue).toBe(30);
    });

    it('should limit results correctly', async () => {
      const result = await dashboardService.getTopSellingProducts(2);

      expect(result).toHaveLength(2);
      expect(result[0].productName).toBe('Rice');
      expect(result[1].productName).toBe('Dal');
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics together', async () => {
      // Mock the revenue chart method
      vi.mocked(transactionRepository.getTransactionsByDateRange).mockResolvedValue([]);

      const result = await dashboardService.getAllMetrics();

      expect(result.dailySales.total).toBe(390);
      expect(result.topSellingProduct.product?.name).toBe('Rice');
      expect(result.lowStockAlerts.count).toBe(1);
      expect(result.revenueChart.dates).toHaveLength(7);
      expect(result.revenueChart.amounts).toHaveLength(7);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      vi.mocked(transactionRepository.getTodaysTransactions).mockRejectedValue(
        new Error('Database error')
      );

      await expect(dashboardService.getDailySalesMetrics()).rejects.toThrow('Database error');
    });

    it('should handle product repository errors', async () => {
      vi.mocked(productRepository.getAll).mockRejectedValue(
        new Error('Product fetch error')
      );

      await expect(dashboardService.getTopSellingProduct()).rejects.toThrow('Product fetch error');
    });
  });
});