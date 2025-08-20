import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Transaction, Shop } from '../types';

export class ShopkeeperDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  shops!: Table<Shop>;

  constructor() {
    super('ShopkeeperUPITracker');
    
    this.version(1).stores({
      products: '++id, name, category, stock, reorderThreshold, createdAt, updatedAt',
      transactions: '++id, amount, type, timestamp',
      shops: '++id, name, type, ownerId, createdAt'
    });

    // Add hooks for automatic timestamp updates
    this.products.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.products.hook('updating', function (modifications: Partial<Product>, primKey, obj, trans) {
      modifications.updatedAt = new Date();
    });

    this.transactions.hook('creating', function (primKey, obj, trans) {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    this.shops.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
    });
  }
}

export const db = new ShopkeeperDatabase();