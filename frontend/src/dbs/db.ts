import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Product, Transaction, Shop, InventoryAuditEntry, StockAlert, Notification, BulkInventoryOperation } from '../types';

export class ShopkeeperDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  shops!: Table<Shop>;
  inventoryAudit!: Table<InventoryAuditEntry>;
  stockAlerts!: Table<StockAlert>;
  notifications!: Table<Notification>;
  bulkOperations!: Table<BulkInventoryOperation>;

  constructor(dbName = 'ShopkeeperUPITracker') {
    super(dbName);
    
    this.version(1).stores({
      products: 'id, name, category, stock, reorderThreshold, createdAt, updatedAt, expiryDate',
      transactions: 'id, amount, type, timestamp',
      shops: 'id, name, type, ownerId, createdAt',
      inventoryAudit: 'id, productId, type, timestamp, transactionId',
      stockAlerts: 'id, productId, type, createdAt',
      notifications: 'id, type, priority, timestamp, expiresAt',
      bulkOperations: 'id, type, timestamp, userId'
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

    this.inventoryAudit.hook('creating', function (primKey, obj, trans) {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    this.stockAlerts.hook('creating', function (primKey, obj, trans) {
      obj.createdAt = new Date();
    });

    this.notifications.hook('creating', function (primKey, obj, trans) {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    this.bulkOperations.hook('creating', function (primKey, obj, trans) {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    // Add validation hooks
    this.products.hook('creating', function (primKey, obj, trans) {
      if (typeof obj.price !== 'number' || isNaN(obj.price) || obj.price < 0) {
        throw new Error('Invalid product price');
      }
      if (typeof obj.stock !== 'number' || isNaN(obj.stock) || obj.stock < 0) {
        throw new Error('Invalid product stock');
      }
      if (typeof obj.reorderThreshold !== 'number' || isNaN(obj.reorderThreshold) || obj.reorderThreshold < 0) {
        throw new Error('Invalid reorder threshold');
      }
    });

    this.transactions.hook('creating', function (primKey, obj, trans) {
      if (typeof obj.amount !== 'number' || isNaN(obj.amount) || obj.amount <= 0) {
        throw new Error('Invalid transaction amount');
      }
      if (!['upi', 'cash', 'card'].includes(obj.type)) {
        throw new Error('Invalid transaction type');
      }
    });

    this.shops.hook('creating', function (primKey, obj, trans) {
      if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length === 0) {
        throw new Error('Invalid shop name');
      }
      if (!obj.type || typeof obj.type !== 'string' || obj.type.trim().length === 0) {
        throw new Error('Invalid shop type');
      }
    });
  }
}

export const db = new ShopkeeperDatabase();