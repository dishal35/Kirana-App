import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../NotificationService';
import { db } from '../../dbs/db';
import type { Product, Transaction } from '../../types';

describe('NotificationService Integration Tests', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    // Clear all data before each test
    await db.delete();
    await db.open();
    
    notificationService = new NotificationService();
  });

  afterEach(async () => {
    notificationService.destroy();
    await db.delete();
  });

  describe('End-to-end notification workflow', () => {
    it('should handle complete notification lifecycle', async () => {
      // Add a notification
      const notificationId = await notificationService.addNotification({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: 'Product is running low',
        priority: 'high',
        read: false,
        actionable: true,
        data: { productId: 'test-product' }
      });

      // Verify notification was added
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(notificationId);
      expect(notifications[0].read).toBe(false);

      // Check unread count
      const unreadCount = await notificationService.getUnreadCount();
      expect(unreadCount).toBe(1);

      // Mark as read
      await notificationService.markAsRead(notificationId);

      // Verify it's marked as read
      const updatedNotifications = await notificationService.getNotifications();
      expect(updatedNotifications[0].read).toBe(true);

      // Check unread count is now 0
      const newUnreadCount = await notificationService.getUnreadCount();
      expect(newUnreadCount).toBe(0);

      // Delete notification
      await notificationService.deleteNotification(notificationId);

      // Verify it's deleted
      const finalNotifications = await notificationService.getNotifications();
      expect(finalNotifications).toHaveLength(0);
    });

    it('should handle low stock detection with real database', async () => {
      // Add products to database
      const lowStockProduct: Product = {
        id: 'low-stock-product',
        name: 'Low Stock Item',
        price: 100,
        stock: 3,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const outOfStockProduct: Product = {
        id: 'out-of-stock-product',
        name: 'Out of Stock Item',
        price: 200,
        stock: 0,
        reorderThreshold: 5,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const normalProduct: Product = {
        id: 'normal-product',
        name: 'Normal Item',
        price: 150,
        stock: 20,
        reorderThreshold: 5,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.products.bulkAdd([lowStockProduct, outOfStockProduct, normalProduct]);

      // Run low stock check
      await notificationService.checkLowStock();

      // Verify notifications were created
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(2);

      const lowStockNotification = notifications.find(n => n.type === 'low_stock');
      const outOfStockNotification = notifications.find(n => n.type === 'out_of_stock');

      expect(lowStockNotification).toBeDefined();
      expect(lowStockNotification!.message).toContain('Low Stock Item');
      expect(lowStockNotification!.priority).toBe('high');

      expect(outOfStockNotification).toBeDefined();
      expect(outOfStockNotification!.message).toContain('Out of Stock Item');
      expect(outOfStockNotification!.priority).toBe('critical');
    });

    it('should handle expiry detection with real database', async () => {
      // Add products with different expiry dates
      const expiringProduct: Product = {
        id: 'expiring-product',
        name: 'Expiring Item',
        price: 100,
        stock: 10,
        reorderThreshold: 5,
        category: 'perishable',
        expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12 hours
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const expiredProduct: Product = {
        id: 'expired-product',
        name: 'Expired Item',
        price: 150,
        stock: 5,
        reorderThreshold: 3,
        category: 'perishable',
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const freshProduct: Product = {
        id: 'fresh-product',
        name: 'Fresh Item',
        price: 200,
        stock: 15,
        reorderThreshold: 5,
        category: 'perishable',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.products.bulkAdd([expiringProduct, expiredProduct, freshProduct]);

      // Run expiry check
      await notificationService.checkExpiringProducts();

      // Verify notifications were created
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(2);

      const expiryWarning = notifications.find(n => n.type === 'expiry_warning');
      const expiredNotification = notifications.find(n => n.type === 'expired');

      expect(expiryWarning).toBeDefined();
      expect(expiryWarning!.message).toContain('Expiring Item');
      expect(expiryWarning!.priority).toBe('high');

      expect(expiredNotification).toBeDefined();
      expect(expiredNotification!.message).toContain('Expired Item');
      expect(expiredNotification!.priority).toBe('critical');
    });

    it('should handle transaction notifications with real database', async () => {
      // Add products to database
      const product1: Product = {
        id: 'product-1',
        name: 'Test Product 1',
        price: 100,
        stock: 10,
        reorderThreshold: 5,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const product2: Product = {
        id: 'product-2',
        name: 'Test Product 2',
        price: 200,
        stock: 15,
        reorderThreshold: 5,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.products.bulkAdd([product1, product2]);

      // Create transaction
      const transaction: Transaction = {
        id: 'test-transaction',
        amount: 500,
        products: [
          { productId: 'product-1', quantity: 2, unitPrice: 100 },
          { productId: 'product-2', quantity: 1, unitPrice: 200 }
        ],
        type: 'upi',
        timestamp: new Date()
      };

      // Notify about transaction
      await notificationService.notifyTransaction(transaction);

      // Verify notification was created
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(1);

      const transactionNotification = notifications[0];
      expect(transactionNotification.type).toBe('transaction');
      expect(transactionNotification.message).toContain('₹500');
      expect(transactionNotification.message).toContain('Test Product 1, Test Product 2');
      expect(transactionNotification.priority).toBe('medium');
    });

    it('should handle notification filtering correctly', async () => {
      // Add multiple notifications
      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Low Stock 1',
        message: 'Product 1 is low',
        priority: 'high',
        read: false,
        actionable: true
      });

      await notificationService.addNotification({
        type: 'transaction',
        title: 'Transaction 1',
        message: 'Sale completed',
        priority: 'medium',
        read: true,
        actionable: false
      });

      await notificationService.addNotification({
        type: 'expired',
        title: 'Expired Product',
        message: 'Product expired',
        priority: 'critical',
        read: false,
        actionable: true
      });

      // Test filtering by type
      const lowStockNotifications = await notificationService.getNotifications({ type: 'low_stock' });
      expect(lowStockNotifications).toHaveLength(1);
      expect(lowStockNotifications[0].type).toBe('low_stock');

      // Test filtering by read status
      const unreadNotifications = await notificationService.getNotifications({ read: false });
      expect(unreadNotifications).toHaveLength(2);

      // Test filtering by priority
      const criticalNotifications = await notificationService.getNotifications({ priority: 'critical' });
      expect(criticalNotifications).toHaveLength(1);
      expect(criticalNotifications[0].priority).toBe('critical');
    });

    it('should generate correct statistics', async () => {
      // Add various notifications
      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Low Stock',
        message: 'Test',
        priority: 'high',
        read: false,
        actionable: true
      });

      await notificationService.addNotification({
        type: 'transaction',
        title: 'Transaction',
        message: 'Test',
        priority: 'medium',
        read: true,
        actionable: false
      });

      await notificationService.addNotification({
        type: 'expired',
        title: 'Expired',
        message: 'Test',
        priority: 'critical',
        read: false,
        actionable: true
      });

      const stats = await notificationService.getStats();

      expect(stats.total).toBe(3);
      expect(stats.unread).toBe(2);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.byType.low_stock).toBe(1);
      expect(stats.byType.transaction).toBe(1);
      expect(stats.byType.expired).toBe(1);
    });

    it('should handle mark all as read correctly', async () => {
      // Add multiple unread notifications
      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Low Stock 1',
        message: 'Test 1',
        priority: 'high',
        read: false,
        actionable: true
      });

      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Low Stock 2',
        message: 'Test 2',
        priority: 'high',
        read: false,
        actionable: true
      });

      // Verify unread count
      let unreadCount = await notificationService.getUnreadCount();
      expect(unreadCount).toBe(2);

      // Mark all as read
      await notificationService.markAllAsRead();

      // Verify all are now read
      unreadCount = await notificationService.getUnreadCount();
      expect(unreadCount).toBe(0);

      const notifications = await notificationService.getNotifications();
      expect(notifications.every(n => n.read)).toBe(true);
    });

    it('should prevent duplicate low stock notifications', async () => {
      // Add a low stock product
      const product: Product = {
        id: 'low-stock-product',
        name: 'Low Stock Item',
        price: 100,
        stock: 3,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.products.add(product);

      // Run low stock check twice
      await notificationService.checkLowStock();
      await notificationService.checkLowStock();

      // Should only have one notification
      const notifications = await notificationService.getNotifications({ type: 'low_stock' });
      expect(notifications).toHaveLength(1);
    });
  });
});