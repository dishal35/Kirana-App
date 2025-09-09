/**
 * SIMPLIFIED Database for MVP
 * Only essential tables: products, transactions, shops
 */

import Dexie from 'dexie';

export interface Product {
  id?: number;
  name: string;
  price: number;
  stock: number;
  reorderThreshold: number;
  category?: string;
}

export interface Transaction {
  id?: number;
  amount: number;
  productId: number;
  quantity: number;
  type: 'upi' | 'cash';
  timestamp: Date;
  transcription?: string;
}

export interface Shop {
  id?: number;
  name: string;
  type: string;
}

class SimpleDexieDB extends Dexie {
  products!: Dexie.Table<Product, number>;
  transactions!: Dexie.Table<Transaction, number>;
  shops!: Dexie.Table<Shop, number>;

  constructor() {
    super('KiranaSimpleDB');
    
    this.version(1).stores({
      products: '++id, name, category, stock',
      transactions: '++id, timestamp, productId',
      shops: '++id, name'
    });
  }
}

export const db = new SimpleDexieDB();

// Simple repository functions
export const simpleDb = {
  // Products
  async addProduct(product: Omit<Product, 'id'>): Promise<number> {
    return await db.products.add(product);
  },

  async getAllProducts(): Promise<Product[]> {
    return await db.products.toArray();
  },

  async getProductById(id: number): Promise<Product | undefined> {
    return await db.products.get(id);
  },

  async updateProductStock(id: number, newStock: number): Promise<void> {
    await db.products.update(id, { stock: newStock });
  },

  async getLowStockProducts(): Promise<Product[]> {
    const products = await db.products.toArray();
    return products.filter(p => p.stock <= p.reorderThreshold);
  },

  // Transactions
  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<number> {
    return await db.transactions.add(transaction);
  },

  async getTodaysTransactions(): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.transactions
      .where('timestamp')
      .between(today, tomorrow)
      .toArray();
  },

  async getTodaysRevenue(): Promise<number> {
    const todaysTransactions = await this.getTodaysRevenue();
    return todaysTransactions.reduce((sum, t) => sum + t.amount, 0);
  },

  // Shop
  async createShop(shop: Omit<Shop, 'id'>): Promise<number> {
    return await db.shops.add(shop);
  },

  async getShop(): Promise<Shop | undefined> {
    return await db.shops.toCollection().first();
  }
};
