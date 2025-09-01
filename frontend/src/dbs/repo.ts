import { db } from './db';
import type { Product, Transaction, Shop, InventoryAuditEntry, StockAlert } from '../types';

export class ProductRepository {
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date();
    const productWithId = { 
      ...product, 
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    } as Product;
    await db.products.add(productWithId);
    return productWithId;
  }

  async getAll(): Promise<Product[]> {
    return await db.products.toArray();
  }

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  }

  async update(product: Product): Promise<Product> {
    const updatedProduct = { ...product, updatedAt: new Date() };
    await db.products.update(product.id!, updatedProduct);
    return updatedProduct;
  }

  async updateById(id: string, updates: Partial<Product>): Promise<void> {
    await db.products.update(id, { ...updates, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    await db.products.delete(id);
  }

  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    const allProducts = await db.products.toArray();
    return allProducts.filter(product => {
      const effectiveThreshold = threshold ?? product.reorderThreshold;
      return product.stock <= effectiveThreshold;
    });
  }

  async updateStock(id: string, newStock: number): Promise<void> {
    await db.products.update(id, { stock: newStock });
  }
}

export class TransactionRepository {
  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const transactionWithId = { ...transaction, id: crypto.randomUUID() } as Transaction;
    await db.transactions.add(transactionWithId);
    return transactionWithId;
  }

  async getAll(): Promise<Transaction[]> {
    return await db.transactions.orderBy('timestamp').reverse().toArray();
  }

  async getById(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  }

  async getTodaysTransactions(): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.transactions
      .where('timestamp')
      .between(today, tomorrow)
      .toArray();
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db.transactions
      .where('timestamp')
      .between(startDate, endDate)
      .toArray();
  }

  async getTotalSalesForToday(): Promise<number> {
    const todaysTransactions = await this.getTodaysTransactions();
    return todaysTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  }
}

export class ShopRepository {
  async create(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
    const shopWithId = { 
      ...shop, 
      id: crypto.randomUUID(),
      createdAt: new Date()
    } as Shop;
    await db.shops.add(shopWithId);
    return shopWithId;
  }

  async getAll(): Promise<Shop[]> {
    return await db.shops.toArray();
  }

  async getById(id: string): Promise<Shop | undefined> {
    return await db.shops.get(id);
  }

  async update(id: string, updates: Partial<Shop>): Promise<void> {
    await db.shops.update(id, updates);
  }

  async getCurrentShop(): Promise<Shop | undefined> {
    // For MVP, we'll assume there's only one shop
    const shops = await db.shops.toArray();
    return shops[0];
  }
}

export class InventoryAuditRepository {
  async create(entry: Omit<InventoryAuditEntry, 'id'>): Promise<string> {
    const entryWithId = { ...entry, id: crypto.randomUUID() } as InventoryAuditEntry;
    const id = await db.inventoryAudit.add(entryWithId);
    return id.toString();
  }

  async getByProductId(productId: string, limit?: number): Promise<InventoryAuditEntry[]> {
    let query = db.inventoryAudit
      .where('productId')
      .equals(productId)
      .orderBy('timestamp')
      .reverse();

    if (limit) {
      query = query.limit(limit);
    }

    return await query.toArray();
  }

  async getByTransactionId(transactionId: string): Promise<InventoryAuditEntry[]> {
    return await db.inventoryAudit
      .where('transactionId')
      .equals(transactionId)
      .toArray();
  }

  async getAll(): Promise<InventoryAuditEntry[]> {
    return await db.inventoryAudit
      .orderBy('timestamp')
      .reverse()
      .toArray();
  }
}

export class StockAlertRepository {
  async create(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<string> {
    const alertWithId = { ...alert, id: crypto.randomUUID() } as StockAlert;
    const id = await db.stockAlerts.add(alertWithId);
    return id.toString();
  }

  async getActive(): Promise<StockAlert[]> {
    const allAlerts = await db.stockAlerts.orderBy('createdAt').reverse().toArray();
    return allAlerts.filter(alert => !alert.acknowledged);
  }

  async getByProductId(productId: string): Promise<StockAlert[]> {
    return await db.stockAlerts
      .where('productId')
      .equals(productId)
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }

  async acknowledge(alertId: string): Promise<void> {
    await db.stockAlerts.update(alertId, { acknowledged: true });
  }

  async deleteOld(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldAlerts = await db.stockAlerts.toArray();
    const alertsToDelete = oldAlerts.filter(alert => 
      alert.acknowledged && alert.createdAt < cutoffDate
    );
    
    for (const alert of alertsToDelete) {
      await db.stockAlerts.delete(alert.id!);
    }
  }
}

// Export singleton instances
export const productRepository = new ProductRepository();
export const transactionRepository = new TransactionRepository();
export const shopRepository = new ShopRepository();
export const inventoryAuditRepository = new InventoryAuditRepository();
export const stockAlertRepository = new StockAlertRepository();