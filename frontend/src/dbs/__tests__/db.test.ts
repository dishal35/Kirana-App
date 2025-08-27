import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShopkeeperDatabase } from '../../dbs/db';
import { mockProducts, mockTransactions, mockShops } from '../../test/mocks';

describe('Database Operations', () => {
  let db: ShopkeeperDatabase;

  beforeEach(async () => {
    // Clear indexedDB
    indexedDB.deleteDatabase('TestShopkeeperDB');
    db = new ShopkeeperDatabase('TestShopkeeperDB');
    await db.open();
  });

  afterEach(async () => {
    await db.close();
    await indexedDB.deleteDatabase('TestShopkeeperDB');
  });

  describe('Products', () => {
    it('should create and retrieve a product', async () => {
      const product = mockProducts.valid;
      const id = await db.products.add(product);
      const retrieved = await db.products.get(id);
      expect(retrieved).toEqual(expect.objectContaining({
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category
      }));
    });

    it('should update a product', async () => {
      const product = mockProducts.valid;
      const id = await db.products.add(product);
      
      const updatedStock = 20;
      await db.products.update(id, { stock: updatedStock });
      
      const retrieved = await db.products.get(id);
      expect(retrieved?.stock).toBe(updatedStock);
    });

    it('should delete a product', async () => {
      const product = mockProducts.valid;
      const id = await db.products.add(product);
      
      await db.products.delete(id);
      const retrieved = await db.products.get(id);
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Transactions', () => {
    it('should create and retrieve a transaction', async () => {
      const transaction = mockTransactions.valid;
      const id = await db.transactions.add(transaction);
      const retrieved = await db.transactions.get(id);
      expect(retrieved).toEqual(expect.objectContaining({
        amount: transaction.amount,
        type: transaction.type
      }));
    });

    it('should retrieve transactions by date range', async () => {
      const startDate = new Date('2025-08-25T00:00:00Z');
      const endDate = new Date('2025-08-26T23:59:59Z');

      const transaction1 = { 
        ...mockTransactions.valid, 
        id: '1',
        timestamp: startDate
      };
      const transaction2 = { 
        ...mockTransactions.valid,
        id: '2',
        timestamp: endDate
      };
      
      // Add transactions one by one to avoid duplicate key error
      await db.transactions.add(transaction1);
      await db.transactions.add(transaction2);
      
      const transactions = await db.transactions
        .where('timestamp')
        .between(startDate, new Date('2025-08-27T00:00:00Z'))
        .toArray();
      
      expect(transactions).toHaveLength(2);
    });
  });

  describe('Shops', () => {
    it('should create and retrieve shop details', async () => {
      const shop = mockShops.valid;
      const id = await db.shops.add(shop);
      
      const retrieved = await db.shops.get(id);
      expect(retrieved).toEqual(expect.objectContaining({
        name: shop.name,
        type: shop.type
      }));
    });

    it('should update shop details', async () => {
      const shop = mockShops.valid;
      const id = await db.shops.add(shop);
      
      const newName = 'Updated Shop Name';
      await db.shops.update(id, { name: newName });
      
      const retrieved = await db.shops.get(id);
      expect(retrieved?.name).toBe(newName);
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate unique keys', async () => {
      const shop = { ...mockShops.valid, id: 'unique-id' };
      await db.shops.add(shop);
      
      await expect(db.shops.add(shop)).rejects.toThrow();
    });

    it('should handle invalid data types', async () => {
      const invalidProduct = {
        ...mockProducts.valid,
        id: 'test-id',
        price: NaN  // This will cause a validation error
      };
      await expect(db.products.add(invalidProduct)).rejects.toThrow();
    });
  });
});
