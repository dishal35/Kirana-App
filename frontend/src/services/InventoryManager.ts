import { db } from '../dbs/db';
import { productRepository } from '../dbs/repo';
import { notificationService } from './NotificationService';
import type { 
  Product, 
  InventoryAuditEntry, 
  StockAlert, 
  InventoryAdjustment,
  Transaction,
  ExpiryAlert,
  BulkInventoryOperation,
  InventoryAnalytics,
  StockMovementData,
  ProductMovement,
  CategoryAnalytics
} from '../types';

export class InventoryManager {
  /**
   * Automatically reduce stock for confirmed sales
   */
  async processTransactionSale(transaction: Transaction): Promise<void> {
    for (const item of transaction.products) {
      const product = await productRepository.getById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const newStock = product.stock - item.quantity;
      if (newStock < 0) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
      }

      // Update product stock
      await productRepository.updateStock(item.productId, newStock);

      // Create audit entry
      await this.createAuditEntry({
        productId: item.productId,
        type: 'sale',
        quantityChange: -item.quantity,
        previousStock: product.stock,
        newStock: newStock,
        reason: `Sale transaction ${transaction.id}`,
        transactionId: transaction.id,
        timestamp: new Date()
      });

      // Check for low stock alerts and create notifications
      await this.checkAndCreateStockAlerts(item.productId);
    }

    // Notify about transaction completion
    await notificationService.notifyTransaction(transaction);
  }

  /**
   * Manual stock adjustment with reason tracking
   */
  async adjustStock(adjustment: InventoryAdjustment): Promise<void> {
    const product = await productRepository.getById(adjustment.productId);
    if (!product) {
      throw new Error(`Product not found: ${adjustment.productId}`);
    }

    const newStock = product.stock + adjustment.quantityChange;
    if (newStock < 0) {
      throw new Error(`Invalid stock adjustment. Current stock: ${product.stock}, Adjustment: ${adjustment.quantityChange}`);
    }

    // Update product stock
    await productRepository.updateStock(adjustment.productId, newStock);

    // Update expiry date if provided
    if (adjustment.expiryDate !== undefined) {
      await productRepository.updateById(adjustment.productId, {
        expiryDate: adjustment.expiryDate
      });
    }

    // Create audit entry
    await this.createAuditEntry({
      productId: adjustment.productId,
      type: adjustment.type,
      quantityChange: adjustment.quantityChange,
      previousStock: product.stock,
      newStock: newStock,
      reason: adjustment.reason,
      timestamp: new Date()
    });

    // Check for alerts after adjustment and trigger notifications
    await this.checkAndCreateStockAlerts(adjustment.productId);

    // Create notification for stock adjustment
    await notificationService.addNotification({
      type: 'transaction',
      title: 'Stock Adjusted',
      message: `${product.name} stock ${adjustment.quantityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment.quantityChange)}`,
      priority: 'medium',
      read: false,
      actionable: false,
      data: {
        productId: adjustment.productId,
        productName: product.name,
        adjustment: adjustment.quantityChange,
        newStock: newStock,
        reason: adjustment.reason
      }
    });
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(): Promise<Product[]> {
    const products = await productRepository.getAll();
    return products.filter(product => product.stock <= product.reorderThreshold);
  }

  /**
   * Get products that are out of stock
   */
  async getOutOfStockProducts(): Promise<Product[]> {
    const products = await productRepository.getAll();
    return products.filter(product => product.stock === 0);
  }

  /**
   * Get products expiring soon (within specified days)
   */
  async getExpiringProducts(daysAhead: number = 7): Promise<Product[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const products = await productRepository.getAll();
    return products.filter(product => 
      product.expiryDate && 
      product.expiryDate <= cutoffDate &&
      product.expiryDate > new Date() // Not already expired
    );
  }

  /**
   * Get expired products
   */
  async getExpiredProducts(): Promise<Product[]> {
    const now = new Date();
    const products = await productRepository.getAll();
    return products.filter(product => 
      product.expiryDate && product.expiryDate <= now
    );
  }

  /**
   * Get current stock level for a product
   */
  async getStockLevel(productId: string): Promise<number> {
    const product = await productRepository.getById(productId);
    return product?.stock ?? 0;
  }

  /**
   * Update stock level for a product with notification integration
   */
  async updateStock(productId: string, quantityChange: number, reason: string): Promise<void> {
    const product = await productRepository.getById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const newStock = product.stock + quantityChange;
    if (newStock < 0) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${Math.abs(quantityChange)}`);
    }

    // Update product stock
    await productRepository.updateStock(productId, newStock);

    // Create audit entry
    await this.createAuditEntry({
      productId,
      type: quantityChange > 0 ? 'restock' : 'sale',
      quantityChange,
      previousStock: product.stock,
      newStock,
      reason,
      timestamp: new Date()
    });

    // Check for alerts and create notifications
    await this.checkAndCreateStockAlerts(productId);
  }

  /**
   * Get inventory audit trail for a product
   */
  async getAuditTrail(productId: string, limit?: number): Promise<InventoryAuditEntry[]> {
    let collection = db.inventoryAudit
      .where('productId')
      .equals(productId);

    if (limit) {
      return await collection
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    }

    return await collection
      .orderBy('timestamp')
      .reverse()
      .toArray();
  }

  /**
   * Get all active stock alerts
   */
  async getActiveStockAlerts(): Promise<StockAlert[]> {
    const allAlerts = await db.stockAlerts.orderBy('createdAt').reverse().toArray();
    return allAlerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge a stock alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await db.stockAlerts.update(alertId, { acknowledged: true });
  }

  /**
   * Create audit entry for stock changes
   */
  private async createAuditEntry(entry: Omit<InventoryAuditEntry, 'id'>): Promise<string> {
    const auditEntry = { ...entry, id: crypto.randomUUID() } as InventoryAuditEntry;
    const id = await db.inventoryAudit.add(auditEntry);
    return id.toString();
  }

  /**
   * Check and create stock alerts for a product
   */
  private async checkAndCreateStockAlerts(productId: string): Promise<void> {
    const product = await productRepository.getById(productId);
    if (!product) return;

    // Check for existing unacknowledged alerts for this product
    const productAlerts = await db.stockAlerts
      .where('productId')
      .equals(productId)
      .toArray();
    const existingAlerts = productAlerts.filter(alert => !alert.acknowledged);

    // Out of stock alert
    if (product.stock === 0) {
      const hasOutOfStockAlert = existingAlerts.some(alert => alert.type === 'out_of_stock');
      if (!hasOutOfStockAlert) {
        await this.createStockAlert({
          productId,
          type: 'out_of_stock',
          message: `${product.name} is out of stock`,
          acknowledged: false
        });

        // Create notification for out of stock
        await notificationService.addNotification({
          type: 'out_of_stock',
          title: 'Out of Stock',
          message: `${product.name} is out of stock`,
          priority: 'critical',
          read: false,
          actionable: true,
          data: { productId: product.id, productName: product.name }
        });
      }
    }
    // Low stock alert
    else if (product.stock <= product.reorderThreshold) {
      const hasLowStockAlert = existingAlerts.some(alert => alert.type === 'low_stock');
      if (!hasLowStockAlert) {
        await this.createStockAlert({
          productId,
          type: 'low_stock',
          message: `${product.name} is running low (${product.stock} remaining)`,
          threshold: product.reorderThreshold,
          acknowledged: false
        });

        // Create notification for low stock
        await notificationService.addNotification({
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

    // Expiry alerts
    if (product.expiryDate) {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((product.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        // Expired
        const hasExpiredAlert = existingAlerts.some(alert => alert.type === 'expired');
        if (!hasExpiredAlert) {
          await this.createStockAlert({
            productId,
            type: 'expired',
            message: `${product.name} has expired`,
            expiryDate: product.expiryDate,
            acknowledged: false
          });

          // Create notification for expired product
          await notificationService.addNotification({
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
        }
      } else if (daysUntilExpiry <= 3) {
        // Expiring soon
        const hasExpiryWarning = existingAlerts.some(alert => alert.type === 'expiry_warning');
        if (!hasExpiryWarning) {
          await this.createStockAlert({
            productId,
            type: 'expiry_warning',
            message: `${product.name} expires in ${daysUntilExpiry} day(s)`,
            expiryDate: product.expiryDate,
            acknowledged: false
          });

          // Create notification for expiring product
          await notificationService.addNotification({
            type: 'expiry_warning',
            title: 'Expiring Soon',
            message: `${product.name} expires in ${daysUntilExpiry} day(s)`,
            priority: 'high',
            read: false,
            actionable: true,
            data: { 
              productId: product.id, 
              productName: product.name,
              expiryDate: product.expiryDate,
              daysUntilExpiry: daysUntilExpiry
            }
          });
        }
      }
    }
  }

  /**
   * Create a stock alert
   */
  private async createStockAlert(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<string> {
    const stockAlert = { ...alert, id: crypto.randomUUID() } as StockAlert;
    const id = await db.stockAlerts.add(stockAlert);
    return id.toString();
  }

  /**
   * Get detailed expiry alerts with financial impact
   */
  async getExpiryAlerts(): Promise<ExpiryAlert[]> {
    const products = await productRepository.getAll();
    const now = new Date();
    const alerts: ExpiryAlert[] = [];

    for (const product of products) {
      if (!product.expiryDate || product.stock === 0) continue;

      const daysUntilExpiry = Math.ceil((product.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let severity: 'warning' | 'critical' | 'expired' = 'warning';

      if (daysUntilExpiry <= 0) {
        severity = 'expired';
      } else if (daysUntilExpiry <= 1) {
        severity = 'critical';
      } else if (daysUntilExpiry <= 7) {
        severity = 'warning';
      } else {
        continue; // Not expiring soon
      }

      const estimatedLoss = severity === 'expired' ? product.stock * product.price : 
                           severity === 'critical' ? product.stock * product.price * 0.8 :
                           product.stock * product.price * 0.5;

      alerts.push({
        id: crypto.randomUUID(),
        productId: product.id!,
        productName: product.name,
        expiryDate: product.expiryDate,
        daysUntilExpiry,
        currentStock: product.stock,
        severity,
        estimatedLoss
      });
    }

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  /**
   * Perform bulk inventory adjustments
   */
  async performBulkAdjustments(adjustments: InventoryAdjustment[], notes?: string): Promise<BulkInventoryOperation> {
    const batchId = crypto.randomUUID();
    const operation: BulkInventoryOperation = {
      id: batchId,
      type: 'bulk_adjustment',
      adjustments: adjustments.map(adj => ({ ...adj, batchId })),
      timestamp: new Date(),
      notes
    };

    // Process each adjustment
    for (const adjustment of operation.adjustments) {
      await this.adjustStock(adjustment);
    }

    // Store bulk operation record
    await db.bulkOperations.add(operation);

    return operation;
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(days: number = 30): Promise<InventoryAnalytics> {
    const [products, auditEntries] = await Promise.all([
      productRepository.getAll(),
      this.getRecentAuditEntries(days)
    ]);

    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = products.filter(p => p.stock <= p.reorderThreshold).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    
    const expiryAlerts = await this.getExpiryAlerts();
    const expiringCount = expiryAlerts.filter(a => a.severity === 'warning' || a.severity === 'critical').length;
    const expiredCount = expiryAlerts.filter(a => a.severity === 'expired').length;

    // Calculate stock movement
    const stockMovement = this.calculateStockMovement(auditEntries, days);
    
    // Calculate top moving products
    const topMovingProducts = this.calculateTopMovingProducts(auditEntries);
    
    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(products);

    return {
      totalValue,
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      expiringCount,
      expiredCount,
      stockMovement,
      topMovingProducts,
      categoryBreakdown
    };
  }

  /**
   * Update expiry dates in bulk
   */
  async bulkUpdateExpiryDates(updates: Array<{ productId: string; expiryDate: Date | null }>): Promise<void> {
    const batchId = crypto.randomUUID();
    
    for (const update of updates) {
      await productRepository.updateById(update.productId, {
        expiryDate: update.expiryDate
      });

      // Create audit entry
      await this.createAuditEntry({
        productId: update.productId,
        type: 'adjustment',
        quantityChange: 0,
        previousStock: 0, // Will be updated by the actual stock value
        newStock: 0, // Will be updated by the actual stock value
        reason: `Bulk expiry date update - Batch ${batchId}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get recent audit entries for analytics
   */
  private async getRecentAuditEntries(days: number): Promise<InventoryAuditEntry[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const allEntries = await db.inventoryAudit.toArray();
    return allEntries.filter(entry => entry.timestamp >= cutoffDate);
  }

  /**
   * Calculate stock movement over time
   */
  private calculateStockMovement(entries: InventoryAuditEntry[], days: number): StockMovementData[] {
    const movementMap = new Map<string, { totalIn: number; totalOut: number }>();
    
    // Initialize with zeros for each day
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      movementMap.set(dateKey, { totalIn: 0, totalOut: 0 });
    }

    // Aggregate movements by date
    entries.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      const movement = movementMap.get(dateKey);
      if (movement) {
        if (entry.quantityChange > 0) {
          movement.totalIn += entry.quantityChange;
        } else {
          movement.totalOut += Math.abs(entry.quantityChange);
        }
      }
    });

    // Convert to array and sort by date
    return Array.from(movementMap.entries())
      .map(([dateStr, movement]) => ({
        date: new Date(dateStr),
        totalIn: movement.totalIn,
        totalOut: movement.totalOut,
        netChange: movement.totalIn - movement.totalOut
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate top moving products
   */
  private calculateTopMovingProducts(entries: InventoryAuditEntry[]): ProductMovement[] {
    const productMovement = new Map<string, { totalIn: number; totalOut: number; frequency: number }>();

    entries.forEach(entry => {
      const current = productMovement.get(entry.productId) || { totalIn: 0, totalOut: 0, frequency: 0 };
      
      if (entry.quantityChange > 0) {
        current.totalIn += entry.quantityChange;
      } else {
        current.totalOut += Math.abs(entry.quantityChange);
      }
      current.frequency += 1;
      
      productMovement.set(entry.productId, current);
    });

    // Convert to array and sort by total movement
    return Array.from(productMovement.entries())
      .map(([productId, movement]) => ({
        productId,
        productName: '', // Will be filled by caller
        totalMovement: movement.totalIn + movement.totalOut,
        direction: movement.totalOut > movement.totalIn ? 'out' as const : 'in' as const,
        frequency: movement.frequency
      }))
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, 10); // Top 10
  }

  /**
   * Calculate category breakdown
   */
  private calculateCategoryBreakdown(products: Product[]): CategoryAnalytics[] {
    const categoryMap = new Map<string, {
      products: Product[];
      totalValue: number;
      lowStockCount: number;
    }>();

    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      const current = categoryMap.get(category) || {
        products: [],
        totalValue: 0,
        lowStockCount: 0
      };

      current.products.push(product);
      current.totalValue += product.stock * product.price;
      if (product.stock <= product.reorderThreshold) {
        current.lowStockCount += 1;
      }

      categoryMap.set(category, current);
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalProducts: data.products.length,
      totalValue: data.totalValue,
      lowStockCount: data.lowStockCount,
      averageStock: data.products.reduce((sum, p) => sum + p.stock, 0) / data.products.length
    }));
  }

  /**
   * Run daily maintenance tasks (check expiries, clean old alerts, etc.)
   */
  async runDailyMaintenance(): Promise<void> {
    const products = await productRepository.getAll();
    
    // Check all products for expiry alerts
    for (const product of products) {
      await this.checkAndCreateStockAlerts(product.id!);
    }

    // Clean up old acknowledged alerts (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldAlerts = await db.stockAlerts.toArray();
    const alertsToDelete = oldAlerts.filter(alert => 
      alert.acknowledged && alert.createdAt < thirtyDaysAgo
    );
    
    for (const alert of alertsToDelete) {
      await db.stockAlerts.delete(alert.id!);
    }
  }
}

// Export singleton instance
export const inventoryManager = new InventoryManager();