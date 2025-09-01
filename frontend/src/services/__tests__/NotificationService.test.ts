import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '../NotificationService';
import { db } from '../../dbs/db';
import type { Product, Transaction, Notification } from '../../types';

// Mock the database
vi.mock('../../dbs/db', () => ({
  db: {
    notifications: {
      add: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn()
        }))
      })),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          count: vi.fn(),
          modify: vi.fn(),
          and: vi.fn(() => ({
            toArray: vi.fn()
          }))
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
          modify: vi.fn(),
          and: vi.fn(() => ({
            toArray: vi.fn()
          }))
        })),
        below: vi.fn(() => ({
          delete: vi.fn()
        }))
      })),
      update: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn()
    },
    products: {
      toArray: vi.fn(),
      where: vi.fn(() => ({
        below: vi.fn(() => ({
          toArray: vi.fn()
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn()
        }))
      }))
    }
  }
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockProducts: Product[];
  let mockNotifications: Notification[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a new instance for each test to avoid interference
    notificationService = new NotificationService();
    
    mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product 1',
        price: 100,
        stock: 5,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'product-2',
        name: 'Test Product 2',
        price: 200,
        stock: 0,
        reorderThreshold: 5,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'product-3',
        name: 'Expiring Product',
        price: 150,
        stock: 10,
        reorderThreshold: 5,
        category: 'test',
        expiryDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockNotifications = [];

    // Setup default mock implementations
    (db.notifications.add as any).mockImplementation((notification: Notification) => {
      const newNotification = { ...notification, id: crypto.randomUUID() };
      mockNotifications.push(newNotification);
      return Promise.resolve(newNotification.id);
    });

    (db.notifications.orderBy as any).mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        toArray: vi.fn().mockImplementation(() => Promise.resolve([...mockNotifications]))
      })
    });

    (db.notifications.toArray as any).mockResolvedValue([...mockNotifications]);

    (db.products.toArray as any).mockResolvedValue([...mockProducts]);
  });

  afterEach(() => {
    notificationService.destroy();
  });

  describe('addNotification', () => {
    it('should add a notification successfully', async () => {
      const notification = {
        type: 'low_stock' as const,
        title: 'Low Stock Alert',
        message: 'Product is running low',
        priority: 'high' as const,
        read: false,
        actionable: true
      };

      const id = await notificationService.addNotification(notification);

      expect(id).toBeDefined();
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...notification,
          timestamp: expect.any(Date),
          id: expect.any(String)
        })
      );
    });

    it('should handle errors when adding notification fails', async () => {
      (db.notifications.add as any).mockRejectedValue(new Error('Database error'));

      const notification = {
        type: 'low_stock' as const,
        title: 'Low Stock Alert',
        message: 'Product is running low',
        priority: 'high' as const,
        read: false,
        actionable: true
      };

      await expect(notificationService.addNotification(notification)).rejects.toThrow('Failed to add notification');
    });
  });

  describe('getNotifications', () => {
    beforeEach(() => {
      mockNotifications = [
        {
          id: '1',
          type: 'low_stock',
          title: 'Low Stock',
          message: 'Product 1 is low',
          priority: 'high',
          timestamp: new Date(),
          read: false,
          actionable: true
        },
        {
          id: '2',
          type: 'transaction',
          title: 'Transaction',
          message: 'Sale completed',
          priority: 'medium',
          timestamp: new Date(),
          read: true,
          actionable: false
        }
      ];
    });

    it('should return all notifications when no filters applied', async () => {
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(2);
    });

    it('should filter notifications by type', async () => {
      const notifications = await notificationService.getNotifications({ type: 'low_stock' });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('low_stock');
    });

    it('should filter notifications by read status', async () => {
      const notifications = await notificationService.getNotifications({ read: false });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].read).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (db.notifications.orderBy as any).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const notifications = await notificationService.getNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      const testNotifications = [
        { id: '1', read: false },
        { id: '2', read: true },
        { id: '3', read: false }
      ];
      
      (db.notifications.toArray as any).mockResolvedValue(testNotifications);

      const count = await notificationService.getUnreadCount();
      expect(count).toBe(2);
    });

    it('should handle errors and return 0', async () => {
      (db.notifications.toArray as any).mockRejectedValue(new Error('Database error'));

      const count = await notificationService.getUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      await notificationService.markAsRead('notification-1');
      
      expect(db.notifications.update).toHaveBeenCalledWith('notification-1', { read: true });
    });

    it('should handle errors when marking as read', async () => {
      (db.notifications.update as any).mockRejectedValue(new Error('Database error'));

      await expect(notificationService.markAsRead('notification-1')).rejects.toThrow('Failed to mark notification as read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const testNotifications = [
        { id: '1', read: false },
        { id: '2', read: true },
        { id: '3', read: false }
      ];
      
      (db.notifications.toArray as any).mockResolvedValue(testNotifications);
      
      const mockModify = vi.fn().mockResolvedValue(undefined);
      (db.notifications.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          modify: mockModify
        })
      });

      await notificationService.markAllAsRead();
      
      expect(db.notifications.where).toHaveBeenCalledWith('id');
      expect(mockModify).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('checkLowStock', () => {
    it('should create low stock notifications for products below threshold', async () => {
      // Mock existing notifications to be empty
      (db.notifications.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      });

      await notificationService.checkLowStock();

      // Should create notifications for products with low stock
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: 'Test Product 1 is running low (5 remaining)',
          priority: 'high'
        })
      );

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'out_of_stock',
          title: 'Out of Stock',
          message: 'Test Product 2 is out of stock',
          priority: 'critical'
        })
      );
    });

    it('should not create duplicate notifications for same product', async () => {
      // Mock existing notification for product-1
      (db.notifications.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              id: 'existing-1',
              type: 'low_stock',
              data: { productId: 'product-1' },
              read: false
            }
          ])
        })
      });

      await notificationService.checkLowStock();

      // Should only create notification for product-2 (out of stock)
      expect(db.notifications.add).toHaveBeenCalledTimes(1);
      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'out_of_stock',
          message: 'Test Product 2 is out of stock'
        })
      );
    });
  });

  describe('checkExpiringProducts', () => {
    it('should create expiry warnings for products expiring within 24 hours', async () => {
      // Mock existing notifications to be empty
      (db.notifications.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      });

      // Mock products with expiry dates
      (db.products.where as any).mockReturnValue({
        below: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockProducts[2]]) // Expiring product
        })
      });

      await notificationService.checkExpiringProducts();

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expiry_warning',
          title: 'Expiring Soon',
          message: expect.stringContaining('Expiring Product expires in'),
          priority: 'high'
        })
      );
    });

    it('should create expired notifications for products past expiry date', async () => {
      // Mock existing notifications to be empty
      (db.notifications.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      });

      // Mock expired product
      const expiredProduct = {
        ...mockProducts[2],
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
      };

      (db.products.where as any).mockReturnValue({
        below: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([expiredProduct])
        })
      });

      await notificationService.checkExpiringProducts();

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expired',
          title: 'Product Expired',
          message: 'Expiring Product has expired',
          priority: 'critical'
        })
      );
    });
  });

  describe('notifyTransaction', () => {
    it('should create transaction notification', async () => {
      const transaction: Transaction = {
        id: 'txn-1',
        amount: 250,
        products: [
          { productId: 'product-1', quantity: 2, unitPrice: 100 }
        ],
        type: 'upi',
        timestamp: new Date()
      };

      // Mock product lookup
      (db.products.where as any).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockProducts[0]])
        })
      });

      await notificationService.notifyTransaction(transaction);

      expect(db.notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction',
          title: 'Transaction Completed',
          message: '₹250 sale completed - Test Product 1',
          priority: 'medium'
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return correct notification statistics', async () => {
      mockNotifications = [
        {
          id: '1',
          type: 'low_stock',
          title: 'Low Stock',
          message: 'Test',
          priority: 'high',
          timestamp: new Date(),
          read: false,
          actionable: true
        },
        {
          id: '2',
          type: 'transaction',
          title: 'Transaction',
          message: 'Test',
          priority: 'medium',
          timestamp: new Date(),
          read: true,
          actionable: false
        }
      ];

      (db.notifications.toArray as any).mockResolvedValue(mockNotifications);

      const stats = await notificationService.getStats();

      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byType.low_stock).toBe(1);
      expect(stats.byType.transaction).toBe(1);
    });
  });

  describe('listeners', () => {
    it('should notify listeners when notifications change', async () => {
      const listener = vi.fn();
      const unsubscribe = notificationService.addListener(listener);

      await notificationService.addNotification({
        type: 'low_stock',
        title: 'Test',
        message: 'Test message',
        priority: 'medium',
        read: false,
        actionable: true
      });

      // Wait for async notification
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      notificationService.addListener(errorListener);

      // Should not throw even if listener throws
      await expect(notificationService.addNotification({
        type: 'low_stock',
        title: 'Test',
        message: 'Test message',
        priority: 'medium',
        read: false,
        actionable: true
      })).resolves.toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should clean up expired notifications', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      (db.notifications.where as any).mockReturnValue({
        below: vi.fn().mockReturnValue({
          delete: mockDelete
        })
      });

      await notificationService.cleanupExpiredNotifications();

      expect(db.notifications.where).toHaveBeenCalledWith('expiresAt');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});