import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InventoryManager } from '../InventoryManager';
import { productRepository, transactionRepository } from '../../dbs/repo';
import { db } from '../../dbs/db';
import type { Product, Transaction, InventoryAdjustment } from '../../types';

describe('InventoryManager Integration Tests', () => {
  let inventoryManager: InventoryManager;
  let testProduct: Product;
  let testProductId: string;

  beforeEach(async () => {
    inventoryManager = new InventoryManager();
    
    // Create a test product
    testProduct = {
      name: 'Integration Test Product',
      price: 50,
      stock: 100,
      reorderThreshold: 20,
      category: 'test',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    testProductId = await productRepository.create(testProduct);
    testProduct.id = testProductId;
  });

  afterEach(async () => {
    // Clean up test data
    await db.products.clear();
    await db.transactions.clear();
    await db.inventoryAudit.clear();
    await db.stockAlerts.clear();
  });

  describe('Transaction Processing', () => {
    it('should process a complete sale transaction', async () => {
      const transaction: Transaction = {
        amount: 150,
        products: [
          {
            productId: testProductId,
            quantity: 3,
            unitPrice: 50
          }
        ],
        type: 'upi',
        timestamp: new Date()
      };

      const transactionId = await transactionRepository.create(transaction);
      transaction.id = transactionId;

      await inventoryManager.processTransactionSale(transaction);

      // Check stock was reduced
      const updatedProduct = await productRepository.getById(testProductId);
      expect(updatedProduct?.stock).toBe(97);

      // Check audit trail was created
      const auditTrail = await inventoryManager.getAuditTrail(testProductId);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].type).toBe('sale');
      expect(auditTrail[0].quantityChange).toBe(-3);
      expect(auditTrail[0].transactionId).toBe(transactionId);
    });

    it('should create low stock alert when threshold is reached', async () => {
      // Reduce stock to threshold level
      const adjustment: InventoryAdjustment = {
        productId: testProductId,
        quantityChange: -80, // Reduce from 100 to 20 (at threshold)
        reason: 'Test reduction',
        type: 'adjustment'
      };

      await inventoryManager.adjustStock(adjustment);

      // Check low stock products
      const lowStockProducts = await inventoryManager.getLowStockProducts();
      expect(lowStockProducts).toHaveLength(1);
      expect(lowStockProducts[0].id).toBe(testProductId);

      // Check alert was created
      const alerts = await inventoryManager.getActiveStockAlerts();
      expect(alerts.some(alert => 
        alert.productId === testProductId && alert.type === 'low_stock'
      )).toBe(true);
    });

    it('should create out of stock alert when stock reaches zero', async () => {
      const adjustment: InventoryAdjustment = {
        productId: testProductId,
        quantityChange: -100, // Reduce to 0
        reason: 'Sold out',
        type: 'adjustment'
      };

      await inventoryManager.adjustStock(adjustment);

      // Check out of stock products
      const outOfStockProducts = await inventoryManager.getOutOfStockProducts();
      expect(outOfStockProducts).toHaveLength(1);
      expect(outOfStockProducts[0].id).toBe(testProductId);

      // Check alert was created
      const alerts = await inventoryManager.getActiveStockAlerts();
      expect(alerts.some(alert => 
        alert.productId === testProductId && alert.type === 'out_of_stock'
      )).toBe(true);
    });
  });

  describe('Expiry Management', () => {
    it('should detect expiring products', async () => {
      // Set expiry date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await productRepository.update(testProductId, { expiryDate: tomorrow });

      const expiringProducts = await inventoryManager.getExpiringProducts(7);
      expect(expiringProducts).toHaveLength(1);
      expect(expiringProducts[0].id).toBe(testProductId);
    });

    it('should detect expired products', async () => {
      // Set expiry date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await productRepository.update(testProductId, { expiryDate: yesterday });

      const expiredProducts = await inventoryManager.getExpiredProducts();
      expect(expiredProducts).toHaveLength(1);
      expect(expiredProducts[0].id).toBe(testProductId);
    });

    it('should create expiry warning alert', async () => {
      // Set expiry date to 2 days from now
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      
      await productRepository.update(testProductId, { expiryDate: twoDaysFromNow });

      // Trigger alert check by doing a stock adjustment
      const adjustment: InventoryAdjustment = {
        productId: testProductId,
        quantityChange: 0, // No change, just trigger alert check
        reason: 'Check expiry',
        type: 'adjustment'
      };

      await inventoryManager.adjustStock(adjustment);

      const alerts = await inventoryManager.getActiveStockAlerts();
      expect(alerts.some(alert => 
        alert.productId === testProductId && alert.type === 'expiry_warning'
      )).toBe(true);
    });

    it('should create expired alert', async () => {
      // Set expiry date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await productRepository.update(testProductId, { expiryDate: yesterday });

      // Trigger alert check
      const adjustment: InventoryAdjustment = {
        productId: testProductId,
        quantityChange: 0,
        reason: 'Check expiry',
        type: 'adjustment'
      };

      await inventoryManager.adjustStock(adjustment);

      const alerts = await inventoryManager.getActiveStockAlerts();
      expect(alerts.some(alert => 
        alert.productId === testProductId && alert.type === 'expired'
      )).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should maintain complete audit trail for multiple operations', async () => {
      // Initial restock
      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: 50,
        reason: 'Initial restock',
        type: 'restock'
      });

      // Sale transaction
      const transaction: Transaction = {
        amount: 100,
        products: [{ productId: testProductId, quantity: 2, unitPrice: 50 }],
        type: 'upi',
        timestamp: new Date()
      };
      const transactionId = await transactionRepository.create(transaction);
      transaction.id = transactionId;
      await inventoryManager.processTransactionSale(transaction);

      // Damage adjustment
      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: -5,
        reason: 'Damaged goods',
        type: 'damage'
      });

      // Check audit trail
      const auditTrail = await inventoryManager.getAuditTrail(testProductId);
      expect(auditTrail).toHaveLength(3);

      // Verify order (most recent first)
      expect(auditTrail[0].type).toBe('damage');
      expect(auditTrail[0].quantityChange).toBe(-5);
      
      expect(auditTrail[1].type).toBe('sale');
      expect(auditTrail[1].quantityChange).toBe(-2);
      
      expect(auditTrail[2].type).toBe('restock');
      expect(auditTrail[2].quantityChange).toBe(50);

      // Verify stock calculations
      expect(auditTrail[2].previousStock).toBe(100);
      expect(auditTrail[2].newStock).toBe(150);
      expect(auditTrail[1].previousStock).toBe(150);
      expect(auditTrail[1].newStock).toBe(148);
      expect(auditTrail[0].previousStock).toBe(148);
      expect(auditTrail[0].newStock).toBe(143);
    });
  });

  describe('Alert Management', () => {
    it('should acknowledge alerts', async () => {
      // Create a low stock situation
      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: -85, // Reduce to 15 (below threshold of 20)
        reason: 'Test low stock',
        type: 'adjustment'
      });

      // Get the alert
      const alerts = await inventoryManager.getActiveStockAlerts();
      const lowStockAlert = alerts.find(alert => 
        alert.productId === testProductId && alert.type === 'low_stock'
      );
      expect(lowStockAlert).toBeDefined();

      // Acknowledge the alert
      await inventoryManager.acknowledgeAlert(lowStockAlert!.id!);

      // Verify alert is no longer active
      const activeAlerts = await inventoryManager.getActiveStockAlerts();
      expect(activeAlerts.some(alert => alert.id === lowStockAlert!.id)).toBe(false);
    });

    it('should not create duplicate alerts for same condition', async () => {
      // Create low stock situation
      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: -85,
        reason: 'First reduction',
        type: 'adjustment'
      });

      // Make another adjustment that keeps it in low stock
      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: -2,
        reason: 'Second reduction',
        type: 'adjustment'
      });

      // Should only have one low stock alert
      const alerts = await inventoryManager.getActiveStockAlerts();
      const lowStockAlerts = alerts.filter(alert => 
        alert.productId === testProductId && alert.type === 'low_stock'
      );
      expect(lowStockAlerts).toHaveLength(1);
    });
  });

  describe('Daily Maintenance', () => {
    it('should run daily maintenance without errors', async () => {
      // Set up some test conditions
      await productRepository.update(testProductId, { 
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      });

      await inventoryManager.adjustStock({
        productId: testProductId,
        quantityChange: -85, // Create low stock
        reason: 'Test setup',
        type: 'adjustment'
      });

      // Run maintenance
      await expect(inventoryManager.runDailyMaintenance()).resolves.not.toThrow();

      // Verify alerts were created
      const alerts = await inventoryManager.getActiveStockAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});