/**
 * Integration tests for notification system connectivity
 * Tests the integration between inventory management, transaction processing, and notifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { inventoryManager } from '../InventoryManager';
import { enhancedTransactionService } from '../EnhancedTransactionService';
import { notificationService } from '../NotificationService';
import { productRepository, transactionRepository } from '../../dbs/repo';
import { db } from '../../dbs/db';
import type { Product, Transaction, InventoryAdjustment } from '../../types';

// Mock the database
vi.mock('../../dbs/db', () => ({
  db: {
    products: {
      add: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn()
        })),
        below: vi.fn(() => ({
          toArray: vi.fn()
        }))
      }))
    },
    transactions: {
      add: vi.fn(),
      toArray: vi.fn()
    },
    notifications: {
      add: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        anyOf: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      update: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn()
    },
    stockAlerts: {
      add: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      delete: vi.fn()
    },
    inventoryAudit: {
      add: vi.fn(),
      toArray: vi.fn()
    },
    bulkOperations: {
      add: vi.fn()
    }
  }
}));

describe('Notification System Integration', () => {
  let mockProduct: Product;
  let mockTransaction: Transaction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      price: 100,
      stock: 5,
      reorderThreshold: 10,
      category: 'Test',
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
      timestamp: new Date(),
      transcription: 'Test transaction',
      confidence: 0.95
    };

    // Setup default mock returns
    (db.products.toArray as any).mockResolvedValue([mockProduct]);
    (db.notifications.toArray as any).mockResolvedValue([]);
    (db.stockAlerts.toArray as any).mockResolvedValue([]);
    (db.stockAlerts.where as any).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })
    });
    (db.inventoryAudit.toArray as any).mockResolvedValue([]);
    (db.notifications.add as any).mockResolvedValue('notification-1');
    (db.stockAlerts.add as any).mockResolvedValue('alert-1');
    (db.inventoryAudit.add as any).mockResolvedValue('audit-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inventory to Notification Integration', () => {
    it('should create low stock notification when stock falls below threshold', async () => {
      // Mock product with low stock
      const lowStockProduct = { ...mockProduct, stock: 5, reorderThreshold: 10 };
      
      // Mock productRepository.getById
      vi.spyOn(productRepository, 'getById').mockResolvedValue(lowStockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      // Adjust stock to trigger low stock alert
      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: -3,
        reason: 'Test adjustment'
      };

      await inventoryManager.adjustStock(adjustment);

      // Verify notification was created
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: expect.stringContaining('Test Product is running low'),
          priority: 'high',
          actionable: true
        })
      );
    });

    it('should create out of stock notification when stock reaches zero', async () => {
      // Mock product with stock that will become zero after adjustment
      const productWithStock = { ...mockProduct, stock: 5 };
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(productWithStock);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: -5, // This will make stock = 0
        reason: 'Sale'
      };

      await inventoryManager.adjustStock(adjustment);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'out_of_stock',
          title: 'Out of Stock',
          message: 'Test Product is out of stock',
          priority: 'critical',
          actionable: true
        })
      );
    });

    it('should create expiry warning notification for products expiring soon', async () => {
      // Mock product expiring in 2 days
      const expiringProduct = {
        ...mockProduct,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      };
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(expiringProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: 0,
        reason: 'Expiry check'
      };

      await inventoryManager.adjustStock(adjustment);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expiry_warning',
          title: 'Expiring Soon',
          message: expect.stringContaining('expires in 2 day'),
          priority: 'high',
          actionable: true
        })
      );
    });

    it('should create expired product notification', async () => {
      // Mock expired product
      const expiredProduct = {
        ...mockProduct,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(expiredProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: 0,
        reason: 'Expiry check'
      };

      await inventoryManager.adjustStock(adjustment);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expired',
          title: 'Product Expired',
          message: 'Test Product has expired',
          priority: 'critical',
          actionable: true
        })
      );
    });
  });

  describe('Transaction to Notification Integration', () => {
    it('should create transaction notification when processing sale', async () => {
      vi.spyOn(productRepository, 'getById').mockResolvedValue(mockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      await inventoryManager.processTransactionSale(mockTransaction);

      // Should create transaction notification
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction',
          title: 'Transaction Completed',
          message: expect.stringContaining('₹200 sale completed'),
          priority: 'medium',
          actionable: false
        })
      );
    });

    it('should integrate inventory updates with transaction processing', async () => {
      vi.spyOn(productRepository, 'getById').mockResolvedValue(mockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      await inventoryManager.processTransactionSale(mockTransaction);

      // Should update stock
      expect(productRepository.updateStock).toHaveBeenCalledWith('product-1', 3);

      // Should create audit entry
      expect(db.inventoryAudit.add).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          type: 'sale',
          quantityChange: -2,
          reason: 'Sale transaction transaction-1'
        })
      );

      // Should create transaction notification
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction',
          title: 'Transaction Completed'
        })
      );
    });
  });

  describe('Cross-Component Notification State', () => {
    it('should maintain notification listeners across components', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Add multiple listeners
      const unsubscribe1 = notificationService.addListener(listener1);
      const unsubscribe2 = notificationService.addListener(listener2);

      // Mock notifications
      (db.notifications.orderBy as any).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              id: 'notification-1',
              type: 'low_stock',
              title: 'Test Notification',
              message: 'Test message',
              priority: 'medium',
              read: false,
              actionable: true,
              timestamp: new Date()
            }
          ])
        })
      });

      // Add a notification
      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Test Notification',
        message: 'Test message',
        priority: 'medium',
        read: false,
        actionable: true
      });

      // Both listeners should be called
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });

    it('should handle notification actions across components', async () => {
      const notificationId = 'notification-1';

      // Mock notification exists
      (db.notifications.update as any).mockResolvedValue(undefined);

      await notificationService.markAsRead(notificationId);

      expect(db.notifications.update).toHaveBeenCalledWith(notificationId, { read: true });
    });

    it('should synchronize notification state when clearing all', async () => {
      (db.notifications.clear as any).mockResolvedValue(undefined);

      await notificationService.clearAll();

      expect(db.notifications.clear).toHaveBeenCalled();
    });
  });

  describe('Notification-Driven Actions', () => {
    it('should provide actionable data for inventory notifications', async () => {
      const lowStockProduct = { ...mockProduct, stock: 5, reorderThreshold: 10 };
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(lowStockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: -1, // This will make stock = 4, still below threshold
        reason: 'Test'
      };

      await inventoryManager.adjustStock(adjustment);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          actionable: true,
          data: expect.objectContaining({
            productId: 'product-1',
            productName: 'Test Product',
            currentStock: 5,
            threshold: 10
          })
        })
      );
    });

    it('should provide transaction data for transaction notifications', async () => {
      vi.spyOn(productRepository, 'getById').mockResolvedValue(mockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      await inventoryManager.processTransactionSale(mockTransaction);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionId: 'transaction-1',
            amount: 200,
            type: 'upi',
            productCount: 1
          })
        })
      );
    });
  });

  describe('Periodic Notification Checks', () => {
    it('should run periodic checks for low stock and expiry', async () => {
      // Mock products with various states
      const products = [
        { ...mockProduct, id: 'product-1', stock: 2, reorderThreshold: 10 },
        { 
          ...mockProduct, 
          id: 'product-2', 
          stock: 5,
          expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
        }
      ];

      (db.products.toArray as any).mockResolvedValue(products);

      await notificationService.checkLowStock();
      await notificationService.checkExpiringProducts();

      // Should create low stock notification
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_stock',
          message: expect.stringContaining('product-1')
        })
      );

      // Should create expiry warning notification
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expiry_warning',
          message: expect.stringContaining('product-2')
        })
      );
    });
  });

  describe('Error Handling in Notification Integration', () => {
    it('should handle notification creation failures gracefully', async () => {
      (db.notifications.add as any).mockRejectedValue(new Error('Database error'));
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(mockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      // Should not throw error even if notification creation fails
      await expect(inventoryManager.processTransactionSale(mockTransaction)).resolves.not.toThrow();
    });

    it('should continue inventory operations even if notifications fail', async () => {
      (db.notifications.add as any).mockRejectedValue(new Error('Notification error'));
      
      vi.spyOn(productRepository, 'getById').mockResolvedValue(mockProduct);
      vi.spyOn(productRepository, 'updateStock').mockResolvedValue();

      const adjustment: InventoryAdjustment = {
        productId: 'product-1',
        type: 'adjustment',
        quantityChange: -2,
        reason: 'Test'
      };

      await inventoryManager.adjustStock(adjustment);

      // Stock should still be updated
      expect(productRepository.updateStock).toHaveBeenCalled();
      
      // Audit entry should still be created
      expect(db.inventoryAudit.add).toHaveBeenCalled();
    });
  });
});