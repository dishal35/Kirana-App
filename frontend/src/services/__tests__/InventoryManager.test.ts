import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryManager } from '../InventoryManager';
import { productRepository } from '../../dbs/repo';
import { db } from '../../dbs/db';
import type { Product, Transaction, InventoryAdjustment } from '../../types';

// Mock the database
vi.mock('../../dbs/db', () => ({
  db: {
    inventoryAudit: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            reverse: vi.fn(() => ({
              toArray: vi.fn(),
              limit: vi.fn(() => ({
                toArray: vi.fn()
              }))
            }))
          })),
          toArray: vi.fn()
        }))
      }))
    },
    stockAlerts: {
      add: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      toArray: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Mock the repositories
vi.mock('../../dbs/repo', () => ({
  productRepository: {
    getById: vi.fn(),
    updateStock: vi.fn(),
    getAll: vi.fn()
  }
}));

describe('InventoryManager', () => {
  let inventoryManager: InventoryManager;
  let mockProduct: Product;
  let mockTransaction: Transaction;

  beforeEach(() => {
    inventoryManager = new InventoryManager();
    vi.clearAllMocks();

    mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      price: 100,
      stock: 50,
      reorderThreshold: 10,
      category: 'test',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockTransaction = {
      id: 'transaction-1',
      amount: 200,
      products: [
        {
          productId: 'product-1',
          quantity: 2,
          unitPrice: 100
        }
      ],
      type: 'upi',
      timestamp: new Date()
    };
  });

  describe('processTransactionSale', () => {
    it('should reduce stock and create audit entry for valid sale', async () => {
      vi.mocked(productRepository.getById).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.updateStock).mockResolvedValue();
      vi.mocked(db.inventoryAudit.add).mockResolvedValue('audit-1');
      vi.mocked(db.stockAlerts.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      } as any);

      await inventoryManager.processTransactionSale(mockTransaction);

      expect(productRepository.updateStock).toHaveBeenCalledWith('product-1', 48);
      expect(db.inventoryAudit.add).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          type: 'sale',
          quantityChange: -2,
          previousStock: 50,
          newStock: 48,
          transactionId: 'transaction-1'
        })
      );
    });

    it('should throw error for insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      vi.mocked(productRepository.getById).mockResolvedValue(lowStockProduct);

      await expect(inventoryManager.processTransactionSale(mockTransaction))
        .rejects.toThrow('Insufficient stock for product Test Product');
    });

    it('should throw error for non-existent product', async () => {
      vi.mocked(productRepository.getById).mockResolvedValue(undefined);

      await expect(inventoryManager.processTransactionSale(mockTransaction))
        .rejects.toThrow('Product not found: product-1');
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock with positive change', async () => {
      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        quantityChange: 10,
        reason: 'Restock delivery',
        type: 'restock'
      };

      vi.mocked(productRepository.getById).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.updateStock).mockResolvedValue();
      vi.mocked(db.inventoryAudit.add).mockResolvedValue('audit-1');
      vi.mocked(db.stockAlerts.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      } as any);

      await inventoryManager.adjustStock(adjustment);

      expect(productRepository.updateStock).toHaveBeenCalledWith('product-1', 60);
      expect(db.inventoryAudit.add).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          type: 'restock',
          quantityChange: 10,
          previousStock: 50,
          newStock: 60,
          reason: 'Restock delivery'
        })
      );
    });

    it('should adjust stock with negative change for damage', async () => {
      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        quantityChange: -5,
        reason: 'Damaged goods',
        type: 'damage'
      };

      vi.mocked(productRepository.getById).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.updateStock).mockResolvedValue();
      vi.mocked(db.inventoryAudit.add).mockResolvedValue('audit-1');
      vi.mocked(db.stockAlerts.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      } as any);

      await inventoryManager.adjustStock(adjustment);

      expect(productRepository.updateStock).toHaveBeenCalledWith('product-1', 45);
      expect(db.inventoryAudit.add).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          type: 'damage',
          quantityChange: -5,
          previousStock: 50,
          newStock: 45,
          reason: 'Damaged goods'
        })
      );
    });

    it('should throw error for invalid negative adjustment', async () => {
      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        quantityChange: -60, // More than available stock
        reason: 'Invalid adjustment',
        type: 'adjustment'
      };

      vi.mocked(productRepository.getById).mockResolvedValue(mockProduct);

      await expect(inventoryManager.adjustStock(adjustment))
        .rejects.toThrow('Invalid stock adjustment');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with stock at or below reorder threshold', async () => {
      const products = [
        { ...mockProduct, stock: 5 }, // Below threshold
        { ...mockProduct, id: 'product-2', stock: 10 }, // At threshold
        { ...mockProduct, id: 'product-3', stock: 15 } // Above threshold
      ];

      vi.mocked(productRepository.getAll).mockResolvedValue(products);

      const lowStockProducts = await inventoryManager.getLowStockProducts();

      expect(lowStockProducts).toHaveLength(2);
      expect(lowStockProducts[0].stock).toBe(5);
      expect(lowStockProducts[1].stock).toBe(10);
    });
  });

  describe('getOutOfStockProducts', () => {
    it('should return products with zero stock', async () => {
      const products = [
        { ...mockProduct, stock: 0 }, // Out of stock
        { ...mockProduct, id: 'product-2', stock: 1 }, // In stock
        { ...mockProduct, id: 'product-3', stock: 0 } // Out of stock
      ];

      vi.mocked(productRepository.getAll).mockResolvedValue(products);

      const outOfStockProducts = await inventoryManager.getOutOfStockProducts();

      expect(outOfStockProducts).toHaveLength(2);
      expect(outOfStockProducts.every(p => p.stock === 0)).toBe(true);
    });
  });

  describe('getExpiringProducts', () => {
    it('should return products expiring within specified days', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 8);

      const products = [
        { ...mockProduct, expiryDate: tomorrow }, // Expiring soon
        { ...mockProduct, id: 'product-2', expiryDate: nextWeek }, // Not expiring soon
        { ...mockProduct, id: 'product-3' } // No expiry date
      ];

      vi.mocked(productRepository.getAll).mockResolvedValue(products);

      const expiringProducts = await inventoryManager.getExpiringProducts(7);

      expect(expiringProducts).toHaveLength(1);
      expect(expiringProducts[0].expiryDate).toEqual(tomorrow);
    });
  });

  describe('getExpiredProducts', () => {
    it('should return products that have already expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const products = [
        { ...mockProduct, expiryDate: yesterday }, // Expired
        { ...mockProduct, id: 'product-2', expiryDate: tomorrow }, // Not expired
        { ...mockProduct, id: 'product-3' } // No expiry date
      ];

      vi.mocked(productRepository.getAll).mockResolvedValue(products);

      const expiredProducts = await inventoryManager.getExpiredProducts();

      expect(expiredProducts).toHaveLength(1);
      expect(expiredProducts[0].expiryDate).toEqual(yesterday);
    });
  });

  describe('getStockLevel', () => {
    it('should return current stock level for existing product', async () => {
      vi.mocked(productRepository.getById).mockResolvedValue(mockProduct);

      const stockLevel = await inventoryManager.getStockLevel('product-1');

      expect(stockLevel).toBe(50);
    });

    it('should return 0 for non-existent product', async () => {
      vi.mocked(productRepository.getById).mockResolvedValue(undefined);

      const stockLevel = await inventoryManager.getStockLevel('non-existent');

      expect(stockLevel).toBe(0);
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for a product', async () => {
      const mockAuditEntries = [
        {
          id: 'audit-1',
          productId: 'product-1',
          type: 'sale' as const,
          quantityChange: -2,
          previousStock: 50,
          newStock: 48,
          timestamp: new Date()
        }
      ];

      const mockQuery = {
        equals: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            reverse: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue(mockAuditEntries)
            }))
          }))
        }))
      };

      vi.mocked(db.inventoryAudit.where).mockReturnValue(mockQuery as any);

      const auditTrail = await inventoryManager.getAuditTrail('product-1');

      expect(auditTrail).toEqual(mockAuditEntries);
      expect(db.inventoryAudit.where).toHaveBeenCalledWith('productId');
    });

    it('should limit audit trail results when limit is specified', async () => {
      const mockLimit = vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([])
      }));
      
      const mockReverse = vi.fn(() => ({
        limit: mockLimit,
        toArray: vi.fn().mockResolvedValue([])
      }));
      
      const mockOrderBy = vi.fn(() => ({
        reverse: mockReverse
      }));
      
      const mockEquals = vi.fn(() => ({
        orderBy: mockOrderBy
      }));

      vi.mocked(db.inventoryAudit.where).mockReturnValue({
        equals: mockEquals
      } as any);

      await inventoryManager.getAuditTrail('product-1', 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should update alert as acknowledged', async () => {
      vi.mocked(db.stockAlerts.update).mockResolvedValue(1);

      await inventoryManager.acknowledgeAlert('alert-1');

      expect(db.stockAlerts.update).toHaveBeenCalledWith('alert-1', { acknowledged: true });
    });
  });
});