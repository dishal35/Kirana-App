import { db } from '../dbs/db';
import type { 
  Notification, 
  NotificationFilters, 
  NotificationStats, 
  Product, 
  Transaction 
} from '../types';

export class NotificationService {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private checkInterval: number | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  constructor() {
    this.startPeriodicChecks();
  }

  /**
   * Add a notification to the system
   */
  async addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> {
    try {
      const newNotification: Notification = {
        ...notification,
        timestamp: new Date(),
        id: crypto.randomUUID()
      };

      await db.notifications.add(newNotification);
      this.notifyListeners();
      
      return newNotification.id!;
    } catch (error) {
      console.error('Failed to add notification:', error);
      throw new Error('Failed to add notification');
    }
  }

  /**
   * Get all notifications with optional filtering
   */
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    try {
      let query = db.notifications.orderBy('timestamp').reverse();

      if (filters) {
        const notifications = await query.toArray();
        return this.applyFilters(notifications, filters);
      }

      return await query.toArray();
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await db.notifications.toArray();
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await db.notifications.update(notificationId, { read: true });
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const unreadNotifications = await db.notifications.toArray();
      const unreadIds = unreadNotifications.filter(n => !n.read).map(n => n.id!);
      
      if (unreadIds.length > 0) {
        await db.notifications.where('id').anyOf(unreadIds).modify({ read: true });
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    try {
      await db.notifications.clear();
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw new Error('Failed to clear notifications');
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await db.notifications.delete(notificationId);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStats> {
    try {
      const notifications = await db.notifications.toArray();
      
      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        byType: {
          low_stock: 0,
          expiry_warning: 0,
          expired: 0,
          transaction: 0,
          reorder: 0,
          out_of_stock: 0
        }
      };

      notifications.forEach(notification => {
        stats.byPriority[notification.priority]++;
        stats.byType[notification.type]++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: { low_stock: 0, expiry_warning: 0, expired: 0, transaction: 0, reorder: 0, out_of_stock: 0 }
      };
    }
  }

  /**
   * Check for low stock products and create notifications
   */
  async checkLowStock(): Promise<void> {
    try {
      const products = await db.products.toArray();
      const allNotifications = await db.notifications
        .where('type')
        .anyOf(['low_stock', 'out_of_stock'])
        .toArray();
      
      const existingLowStockNotifications = allNotifications.filter(n => !n.read);

      const existingProductIds = new Set(
        existingLowStockNotifications
          .map(n => n.data?.productId)
          .filter(Boolean)
      );

      for (const product of products) {
        if (existingProductIds.has(product.id)) {
          continue; // Skip if we already have an unread notification for this product
        }

        if (product.stock === 0) {
          await this.addNotification({
            type: 'out_of_stock',
            title: 'Out of Stock',
            message: `${product.name} is out of stock`,
            priority: 'critical',
            read: false,
            actionable: true,
            data: { productId: product.id, productName: product.name }
          });
        } else if (product.stock <= product.reorderThreshold) {
          await this.addNotification({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${product.name} is running low (${product.stock} remaining)`,
            priority: 'high',
            read: false,
            actionable: true,
            data: { 
              productId: product.id, 
              productName: product.name,
              currentStock: product.stock,
              threshold: product.reorderThreshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to check low stock:', error);
    }
  }

  /**
   * Check for expiring products and create notifications
   */
  async checkExpiringProducts(): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const products = await db.products
        .where('expiryDate')
        .below(tomorrow)
        .toArray();

      const allExpiryNotifications = await db.notifications
        .where('type')
        .anyOf(['expiry_warning', 'expired'])
        .toArray();
      
      const existingExpiryNotifications = allExpiryNotifications.filter(n => !n.read);

      const existingProductIds = new Set(
        existingExpiryNotifications
          .map(n => n.data?.productId)
          .filter(Boolean)
      );

      for (const product of products) {
        if (!product.expiryDate || existingProductIds.has(product.id)) {
          continue;
        }

        const isExpired = product.expiryDate <= now;
        const hoursUntilExpiry = (product.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (isExpired) {
          await this.addNotification({
            type: 'expired',
            title: 'Product Expired',
            message: `${product.name} has expired`,
            priority: 'critical',
            read: false,
            actionable: true,
            data: { 
              productId: product.id, 
              productName: product.name,
              expiryDate: product.expiryDate
            }
          });
        } else if (hoursUntilExpiry <= 24) {
          await this.addNotification({
            type: 'expiry_warning',
            title: 'Expiring Soon',
            message: `${product.name} expires in ${Math.ceil(hoursUntilExpiry)} hours`,
            priority: 'high',
            read: false,
            actionable: true,
            data: { 
              productId: product.id, 
              productName: product.name,
              expiryDate: product.expiryDate,
              hoursUntilExpiry: Math.ceil(hoursUntilExpiry)
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to check expiring products:', error);
    }
  }

  /**
   * Notify about a completed transaction
   */
  async notifyTransaction(transaction: Transaction): Promise<void> {
    try {
      const productNames = await this.getProductNamesForTransaction(transaction);
      
      await this.addNotification({
        type: 'transaction',
        title: 'Transaction Completed',
        message: `₹${transaction.amount} sale completed${productNames ? ` - ${productNames}` : ''}`,
        priority: 'medium',
        read: false,
        actionable: false,
        data: { 
          transactionId: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          productCount: transaction.products.length
        }
      });
    } catch (error) {
      console.error('Failed to notify transaction:', error);
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      await db.notifications
        .where('expiresAt')
        .below(now)
        .delete();
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
    }
  }

  /**
   * Add a listener for notification changes
   */
  addListener(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Start periodic checks for low stock and expiring products
   */
  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(async () => {
      await this.checkLowStock();
      await this.checkExpiringProducts();
      await this.cleanupExpiredNotifications();
    }, this.CHECK_INTERVAL_MS);

    // Run initial check
    setTimeout(async () => {
      await this.checkLowStock();
      await this.checkExpiringProducts();
      await this.cleanupExpiredNotifications();
    }, 1000);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Notify all listeners about notification changes
   */
  private async notifyListeners(): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      this.listeners.forEach(callback => {
        try {
          callback(notifications);
        } catch (error) {
          console.error('Error in notification listener:', error);
        }
      });
    } catch (error) {
      console.error('Failed to notify listeners:', error);
    }
  }

  /**
   * Apply filters to notifications array
   */
  private applyFilters(notifications: Notification[], filters: NotificationFilters): Notification[] {
    return notifications.filter(notification => {
      if (filters.type && notification.type !== filters.type) {
        return false;
      }
      
      if (filters.priority && notification.priority !== filters.priority) {
        return false;
      }
      
      if (filters.read !== undefined && notification.read !== filters.read) {
        return false;
      }
      
      if (filters.dateRange) {
        const notificationDate = notification.timestamp;
        if (notificationDate < filters.dateRange.start || notificationDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Get product names for a transaction
   */
  private async getProductNamesForTransaction(transaction: Transaction): Promise<string | null> {
    try {
      if (!transaction.products || transaction.products.length === 0) {
        return null;
      }

      const productIds = transaction.products.map(p => p.productId);
      const products = await db.products.where('id').anyOf(productIds).toArray();
      
      if (products.length === 0) {
        return null;
      }

      if (products.length === 1) {
        return products[0].name;
      }

      if (products.length <= 3) {
        return products.map(p => p.name).join(', ');
      }

      return `${products.slice(0, 2).map(p => p.name).join(', ')} and ${products.length - 2} more`;
    } catch (error) {
      console.error('Failed to get product names for transaction:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicChecks();
    this.listeners.clear();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();