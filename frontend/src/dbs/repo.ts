import { db } from './db';
import { Product, Transaction, Shop } from '../types';

export class ProductRepository {
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await db.products.add(product as Product);
    return id.toString();
  }

  async getAll(): Promise<Product[]> {
    return await db.products.toArray();
  }

  async getById(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
  }

  async update(id: string, updates: Partial<Product>): Promise<void> {
    await db.products.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await db.products.delete(id);
  }

  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    if (threshold) {
      return await db.products.where('stock').belowOrEqual(threshold).toArray();
    }
    return await db.products.where('stock').belowOrEqual('reorderThreshold').toArray();
  }

  async updateStock(id: string, newStock: number): Promise<void> {
    await db.products.update(id, { stock: newStock });
  }
}

export class TransactionRepository {
  async create(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const id = await db.transactions.add(transaction as Transaction);
    return id.toString();
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
  async create(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<string> {
    const id = await db.shops.add(shop as Shop);
    return id.toString();
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

// Export singleton instances
export const productRepository = new ProductRepository();
export const transactionRepository = new TransactionRepository();
export const shopRepository = new ShopRepository();