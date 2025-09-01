/**
 * Optimized Database Configuration with Proper Indexing
 * 
 * This module provides an optimized Dexie database configuration
 * with proper indexing for efficient queries on 8GB RAM systems.
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Transaction, Shop, InventoryAuditEntry, StockAlert } from '../types';

export class OptimizedKiranaDB extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  shops!: Table<Shop>;
  inventoryAudit!: Table<InventoryAuditEntry>;
  stockAlerts!: Table<StockAlert>;

  constructor() {
    super('KiranaDB');
    
    this.version(1).stores({
      // Products table with optimized indexes
      products: '++id, name, category, stock, reorderThreshold, [category+stock], [stock+reorderThreshold], createdAt, updatedAt',
      
      // Transactions table with compound indexes for efficient queries
      transactions: '++id, timestamp, amount, type, [timestamp+type], [timestamp+amount], *products.productId',
      
      // Shops table (simple, usually single record)
      shops: '++id, name, type, createdAt',
      
      // Inventory audit with optimized indexes for tracking
      inventoryAudit: '++id, productId, transactionId, timestamp, changeType, [productId+timestamp], [transactionId+timestamp]',
      
      // Stock alerts with status-based indexing
      stockAlerts: '++id, productId, acknowledged, createdAt, [productId+acknowledged], [acknowledged+createdAt]'
    });

    // Add hooks for automatic cleanup and optimization
    this.products.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.products.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date();
    });

    // Auto-cleanup old data to prevent database bloat
    this.open().then(() => {
      this.scheduleCleanup();
    });
  }

  /**
   * Schedule periodic cleanup of old data
   */
  private scheduleCleanup(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.performCleanup().catch(console.error);
    }, 60 * 60 * 1000);

    // Initial cleanup
    setTimeout(() => {
      this.performCleanup().catch(console.error);
    }, 5000);
  }

  /**
   * Perform database cleanup to maintain performance
   */
  private async performCleanup(): Promise<void> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Clean up old acknowledged stock alerts (older than 7 days)
      await this.stockAlerts
        .where('acknowledged').equals(1 as any)
        .and(alert => alert.createdAt < sevenDaysAgo)
        .delete();

      // Clean up old inventory audit entries (older than 30 days)
      await this.inventoryAudit
        .where('timestamp').below(thirtyDaysAgo)
        .delete();

      console.log('Database cleanup completed');
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }

  /**
   * Optimized query methods
   */

  // Get products with low stock using compound index
  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    if (threshold !== undefined) {
      return await this.products
        .where('stock').belowOrEqual(threshold)
        .toArray();
    }

    // Use compound index for better performance
    return await this.products
      .where('[stock+reorderThreshold]')
      .between([0, 0], [Infinity, Infinity])
      .filter(product => product.stock <= product.reorderThreshold)
      .toArray();
  }

  // Get today's transactions using optimized date range query
  async getTodaysTransactions(): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.transactions
      .where('timestamp')
      .between(today, tomorrow, true, false)
      .reverse()
      .toArray();
  }

  // Get transactions by date range with type filter
  async getTransactionsByDateAndType(
    startDate: Date, 
    endDate: Date, 
    type?: 'upi' | 'cash'
  ): Promise<Transaction[]> {
    if (type) {
      return await this.transactions
        .where('[timestamp+type]')
        .between([startDate, type], [endDate, type], true, true)
        .reverse()
        .toArray();
    }

    return await this.transactions
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
  }

  // Get recent inventory changes for a product
  async getRecentInventoryChanges(productId: string, limit: number = 10): Promise<InventoryAuditEntry[]> {
    return await this.inventoryAudit
      .where('productId').equals(productId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  // Get active stock alerts efficiently
  async getActiveStockAlerts(): Promise<StockAlert[]> {
    return await this.stockAlerts
      .where('acknowledged').equals(0 as any)
      .reverse()
      .toArray();
  }

  // Batch operations for better performance
  async batchUpdateStock(updates: Array<{ productId: string; newStock: number }>): Promise<void> {
    await this.transaction('rw', this.products, async () => {
      for (const update of updates) {
        await this.products.update(update.productId, { 
          stock: update.newStock,
          updatedAt: new Date()
        });
      }
    });
  }

  // Get database statistics for monitoring
  async getDatabaseStats(): Promise<{
    products: number;
    transactions: number;
    inventoryAudit: number;
    stockAlerts: number;
    totalSize: number;
  }> {
    const [products, transactions, inventoryAudit, stockAlerts] = await Promise.all([
      this.products.count(),
      this.transactions.count(),
      this.inventoryAudit.count(),
      this.stockAlerts.count()
    ]);

    // Estimate total size (rough calculation)
    const avgRecordSize = 1024; // 1KB per record estimate
    const totalSize = (products + transactions + inventoryAudit + stockAlerts) * avgRecordSize;

    return {
      products,
      transactions,
      inventoryAudit,
      stockAlerts,
      totalSize
    };
  }
}

// Export optimized database instance
export const optimizedDb = new OptimizedKiranaDB();