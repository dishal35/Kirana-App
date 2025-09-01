import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inventoryManager } from '../InventoryManager';
import { productRepository } from '../../dbs/repo';
import { db } from '../../dbs/db';
import type { Product, InventoryAdjustment, ExpiryAlert } from '../../types';

// Mock the database
vi.mock('../../dbs/db', () => ({
  db: {
    inventoryAudit: {
      add: vi.fn().mockResolvedValue('audit-id'),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            reverse: vi.fn(() => ({
              limit: vi.fn(() => ({
                toArray: vi.fn()
              })),
              toArray: vi.fn()
            }))
          }))
        }))
      }))
    },
    stockAlerts: {
      add: vi.fn().mockResolvedValue('alert-id'),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      }))
    },
    bulkOperations: {
      add: vi.fn().mockResolvedValue('bulk-id')
    }
  }
}));

// Mock the product repository
vi.mock('../../dbs/repo', () => ({
  productRepository: {
    getAll: vi.fn(),
    getById: vi.fn(),
    updateById: vi.fn(),
    updateStock: vi.fn()
  }
}));

describe('Enhanced Inventory Manager', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Milk',
      price: 50,
      stock: 10,
      reorderThreshold: 15, // Higher than stock to test low stock
      category: 'Dairy',
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now (critical)
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Bread',
      price: 30,
      stock: 5, // Give it some stock so we can test expiry alerts
      reorderThreshold: 10, // Higher than stock to make it low stock
      category: 'Bakery',
      expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Rice',
      price: 100,
      stock: 50,
      reorderThreshold: 10,
      category: 'Grains',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      name: 'Eggs',
      price: 60,
      stock: 0, // Out of stock
      reorderThreshold: 5,
      category: 'Dairy',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (productRepository.getAll as any).mockResolvedValue(mockProducts);
    (db.inventoryAudit.toArray as any).mockResolvedValue([]);
    (db.stockAlerts.toArray as any).mockResolvedValue([]);
  });

  describe('getExpiryAlerts', () => {
    it('should identify expired products', async () => {
      const alerts = await inventoryManager.getExpiryAlerts();
      
      const expiredAlerts = alerts.filter(alert => alert.severity === 'expired');
      expect(expiredAlerts).toHaveLength(1);
      expect(expiredAlerts[0].productName).toBe('Bread');
      expect(expiredAlerts[0].daysUntilExpiry).toBeLessThanOrEqual(0);
    });

    it('should identify products expiring soon', async () => {
      const alerts = await inventoryManager.getExpiryAlerts();
      
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0].productName).toBe('Milk');
      expect(criticalAlerts[0].daysUntilExpiry).toBeLessThanOrEqual(2);
    });

    it('should calculate estimated loss correctly', async () => {
      const alerts = await inventoryManager.getExpiryAlerts();
      
      const expiredAlert = alerts.find(alert => alert.severity === 'expired');
      expect(expiredAlert?.estimatedLoss).toBe(5 * 30); // Bread: stock * price (expired = 100% loss)
      
      const criticalAlert = alerts.find(alert => alert.severity === 'critical');
      expect(criticalAlert?.estimatedLoss).toBe(10 * 50 * 0.8); // Milk: stock * price * 0.8
    });

    it('should not include products without expiry dates', async () => {
      const productsWithoutExpiry = [
        {
          ...mockProducts[0],
          expiryDate: undefined
        }
      ];
      (productRepository.getAll as any).mockResolvedValue(productsWithoutExpiry);

      const alerts = await inventoryManager.getExpiryAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should not include products with zero stock', async () => {
      const productsWithZeroStock = [
        {
          ...mockProducts[0],
          stock: 0,
          expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // expired
        }
      ];
      (productRepository.getAll as any).mockResolvedValue(productsWithZeroStock);

      const alerts = await inventoryManager.getExpiryAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('performBulkAdjustments', () => {
    it('should process multiple adjustments in a batch', async () => {
      const adjustments: InventoryAdjustment[] = [
        {
          productId: '1',
          quantityChange: 5,
          reason: 'Bulk restock',
          type: 'restock'
        },
        {
          productId: '2',
          quantityChange: 10,
          reason: 'Bulk restock',
          type: 'restock'
        }
      ];

      (productRepository.getById as any)
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1]);

      const operation = await inventoryManager.performBulkAdjustments(adjustments, 'Test bulk operation');

      expect(operation.adjustments).toHaveLength(2);
      expect(operation.type).toBe('bulk_adjustment');
      expect(operation.notes).toBe('Test bulk operation');
      expect(db.bulkOperations.add).toHaveBeenCalledWith(operation);
    });

    it('should assign batch IDs to all adjustments', async () => {
      const adjustments: InventoryAdjustment[] = [
        {
          productId: '1',
          quantityChange: 5,
          reason: 'Bulk restock',
          type: 'restock'
        }
      ];

      (productRepository.getById as any).mockResolvedValue(mockProducts[0]);

      const operation = await inventoryManager.performBulkAdjustments(adjustments);

      expect(operation.adjustments[0].batchId).toBeDefined();
      expect(operation.adjustments[0].batchId).toBe(operation.id);
    });
  });

  describe('getInventoryAnalytics', () => {
    beforeEach(() => {
      const mockAuditEntries = [
        {
          id: '1',
          productId: '1',
          type: 'sale',
          quantityChange: -2,
          previousStock: 12,
          newStock: 10,
          reason: 'Sale',
          timestamp: new Date()
        },
        {
          id: '2',
          productId: '2',
          type: 'restock',
          quantityChange: 20,
          previousStock: 0,
          newStock: 20,
          reason: 'Restock',
          timestamp: new Date()
        }
      ];
      (db.inventoryAudit.toArray as any).mockResolvedValue(mockAuditEntries);
    });

    it('should calculate total inventory value', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      const expectedValue = mockProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
      expect(analytics.totalValue).toBe(expectedValue);
    });

    it('should count low stock and out of stock products', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      expect(analytics.lowStockCount).toBe(2); // Milk (10 <= 15) and Bread (5 <= 3 is false, but Eggs 0 <= 5)
      expect(analytics.outOfStockCount).toBe(1); // Eggs has 0 stock
    });

    it('should calculate expiring and expired counts', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      expect(analytics.expiringCount).toBe(1); // Milk expiring soon
      expect(analytics.expiredCount).toBe(1); // Bread expired
    });

    it('should generate category breakdown', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      expect(analytics.categoryBreakdown).toHaveLength(3);
      
      const dairyCategory = analytics.categoryBreakdown.find(c => c.category === 'Dairy');
      expect(dairyCategory?.totalProducts).toBe(2); // Milk and Eggs
      expect(dairyCategory?.totalValue).toBe(10 * 50 + 0 * 60); // Milk + Eggs stock * price
    });

    it('should calculate stock movement data', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      expect(analytics.stockMovement).toBeDefined();
      expect(Array.isArray(analytics.stockMovement)).toBe(true);
    });

    it('should identify top moving products', async () => {
      const analytics = await inventoryManager.getInventoryAnalytics();
      
      expect(analytics.topMovingProducts).toBeDefined();
      expect(Array.isArray(analytics.topMovingProducts)).toBe(true);
    });
  });

  describe('bulkUpdateExpiryDates', () => {
    it('should update expiry dates for multiple products', async () => {
      const updates = [
        { productId: '1', expiryDate: new Date('2024-12-31') },
        { productId: '2', expiryDate: null }
      ];

      await inventoryManager.bulkUpdateExpiryDates(updates);

      expect(productRepository.updateById).toHaveBeenCalledTimes(2);
      expect(productRepository.updateById).toHaveBeenCalledWith('1', {
        expiryDate: new Date('2024-12-31')
      });
      expect(productRepository.updateById).toHaveBeenCalledWith('2', {
        expiryDate: null
      });
    });

    it('should create audit entries for expiry date updates', async () => {
      const updates = [
        { productId: '1', expiryDate: new Date('2024-12-31') }
      ];

      await inventoryManager.bulkUpdateExpiryDates(updates);

      expect(db.inventoryAudit.add).toHaveBeenCalled();
    });
  });

  describe('Enhanced Stock Adjustment', () => {
    it('should handle adjustments with reason codes', async () => {
      const adjustment: InventoryAdjustment = {
        productId: '1',
        quantityChange: 5,
        reason: 'Supplier Delivery',
        reasonCode: 'SUPPLIER_DELIVERY',
        type: 'restock'
      };

      (productRepository.getById as any).mockResolvedValue(mockProducts[0]);

      await inventoryManager.adjustStock(adjustment);

      expect(productRepository.updateStock).toHaveBeenCalledWith('1', 15);
      expect(db.inventoryAudit.add).toHaveBeenCalled();
    });

    it('should update expiry date when provided', async () => {
      const newExpiryDate = new Date('2024-12-31');
      const adjustment: InventoryAdjustment = {
        productId: '1',
        quantityChange: 0,
        reason: 'Expiry date correction',
        type: 'adjustment',
        expiryDate: newExpiryDate
      };

      (productRepository.getById as any).mockResolvedValue(mockProducts[0]);

      await inventoryManager.adjustStock(adjustment);

      expect(productRepository.updateById).toHaveBeenCalledWith('1', {
        expiryDate: newExpiryDate
      });
    });

    it('should validate stock levels before adjustment', async () => {
      const adjustment: InventoryAdjustment = {
        productId: '1',
        quantityChange: -20, // More than current stock (10)
        reason: 'Invalid adjustment',
        type: 'adjustment'
      };

      (productRepository.getById as any).mockResolvedValue(mockProducts[0]);

      await expect(inventoryManager.adjustStock(adjustment))
        .rejects.toThrow('Invalid stock adjustment');
    });
  });
});