import { db } from '../dbs/db';
import { productRepository } from '../dbs/repo';
import type { 
  Product, 
  InventoryAuditEntry, 
  StockAlert, 
  InventoryAdjustment,
  Transaction 
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
        transactionId: transaction.id
      });

      // Check for low stock alerts
      await this.checkAndCreateStockAlerts(item.productId);
    }
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
      reason: adjustment.reason
    });

    // Check for alerts after adjustment
    await this.checkAndCreateStockAlerts(adjustment.productId);
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