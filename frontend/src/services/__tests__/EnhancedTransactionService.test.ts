/**
 * Enhanced Transaction Service Unit Tests
 * 
 * Tests individual methods and functionality of the EnhancedTransactionService
 * without external dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedTransactionService, type TransactionCreationData, type ProductCreationData } from '../EnhancedTransactionService';
import type { Product, Transaction } from '../../types';

// Mock all external dependencies
vi.mock('../AudioCapture');
vi.mock('../TransactionProcessor');
vi.mock('../ProductSuggestionService');
vi.mock('../InventoryManager');
vi.mock('../NotificationService');
vi.mock('../../dbs/repo');

describe('EnhancedTransactionService Unit Tests', () => {
  let service: EnhancedTransactionService;
  let mockProductRepository: any;
  let mockTransactionRepository: any;
  let mockInventoryManager: any;
  let mockNotificationService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock repositories
    mockProductRepository = {
      create: vi.fn(),
      getById: vi.fn(),
      getAll: vi.fn()
    };
    
    mockTransactionRepository = {
      create: vi.fn(),
      getAll: vi.fn()
    };
    
    mockInventoryManager = {
      updateStock: vi.fn(),
      createAuditEntry: vi.fn()
    };
    
    mockNotificationService = {
      notifyTransaction: vi.fn()
    };

    service = new EnhancedTransactionService();
    
    // Override the service's dependencies after creation
    (service as any).productRepository = mockProductRepository;
    (service as any).transactionRepository = mockTransactionRepository;
    (service as any).inventoryManager = mockInventoryManager;
    (service as any).notificationService = mockNotificationService;
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default state', () => {
      const status = service.getRecordingStatus();
      expect(status.isRecording).toBe(false);
      expect(status.duration).toBeNull();
    });

    it('should setup event handlers', () => {
      expect(service.onAudioDetected).toBeDefined();
      expect(service.onRecordingStateChanged).toBeDefined();
      expect(service.onError).toBeDefined();
    });
  });

  describe('Transaction Validation', () => {
    let testProduct: Product;

    beforeEach(() => {
      testProduct = {
        id: 'test-product-1',
        name: 'Test Product',
        price: 50,
        stock: 100,
        reorderThreshold: 10,
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should validate selected products successfully', async () => {
      mockProductRepository.getById.mockResolvedValue(testProduct);

      const transactionData: TransactionCreationData = {
        amount: 100,
        transcription: 'test',
        selectedProducts: [
          {
            productId: testProduct.id!,
            quantity: 2,
            unitPrice: testProduct.price
          }
        ],
        paymentType: 'upi'
      };

      // Access private method for testing
      const validateMethod = (service as any).validateSelectedProducts.bind(service);
      const result = await validateMethod(transactionData.selectedProducts);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(testProduct.id);
      expect(result[0].quantity).toBe(2);
      expect(result[0].unitPrice).toBe(50);
    });

    it('should reject invalid quantities', async () => {
      mockProductRepository.getById.mockResolvedValue(testProduct);

      const selectedProducts = [
        {
          productId: testProduct.id!,
          quantity: 0, // Invalid quantity
          unitPrice: testProduct.price
        }
      ];

      const validateMethod = (service as any).validateSelectedProducts.bind(service);
      
      await expect(validateMethod(selectedProducts))
        .rejects.toThrow('Invalid quantity for Test Product: 0');
    });

    it('should reject insufficient stock', async () => {
      mockProductRepository.getById.mockResolvedValue(testProduct);

      const selectedProducts = [
        {
          productId: testProduct.id!,
          quantity: 150, // More than available stock
          unitPrice: testProduct.price
        }
      ];

      const validateMethod = (service as any).validateSelectedProducts.bind(service);
      
      await expect(validateMethod(selectedProducts))
        .rejects.toThrow('Insufficient stock for Test Product');
    });

    it('should reject non-existent products', async () => {
      mockProductRepository.getById.mockResolvedValue(null);

      const selectedProducts = [
        {
          productId: 'non-existent',
          quantity: 1,
          unitPrice: 50
        }
      ];

      const validateMethod = (service as any).validateSelectedProducts.bind(service);
      
      await expect(validateMethod(selectedProducts))
        .rejects.toThrow('Product not found: non-existent');
    });

    it('should correct price mismatches', async () => {
      mockProductRepository.getById.mockResolvedValue(testProduct);

      const selectedProducts = [
        {
          productId: testProduct.id!,
          quantity: 1,
          unitPrice: 60 // Wrong price
        }
      ];

      const validateMethod = (service as any).validateSelectedProducts.bind(service);
      const result = await validateMethod(selectedProducts);

      expect(result[0].unitPrice).toBe(50); // Corrected to actual price
    });
  });

  describe('CSV Export Functionality', () => {
    it('should convert transaction data to CSV format', () => {
      const testData = {
        transactions: [
          {
            id: 'txn-1',
            amount: 100,
            products: [
              { productId: 'prod-1', quantity: 2, unitPrice: 50 }
            ],
            type: 'upi' as const,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            transcription: 'Test transcription',
            confidence: 0.9
          }
        ],
        products: [
          {
            id: 'prod-1',
            name: 'Test Product',
            price: 50,
            stock: 100,
            reorderThreshold: 10,
            category: 'Test',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        exportDate: new Date('2024-01-01T12:00:00Z'),
        totalTransactions: 1,
        totalAmount: 100
      };

      // Access private method for testing
      const convertMethod = (service as any).convertToCSV.bind(service);
      const csv = convertMethod(testData);

      expect(csv).toContain('Transaction ID');
      expect(csv).toContain('Date');
      expect(csv).toContain('Amount');
      expect(csv).toContain('txn-1');
      expect(csv).toContain('100.00');
      expect(csv).toContain('Test Product');
      expect(csv).toContain('Test transcription');
    });

    it('should handle multiple products in CSV export', () => {
      const testData = {
        transactions: [
          {
            id: 'txn-1',
            amount: 150,
            products: [
              { productId: 'prod-1', quantity: 2, unitPrice: 50 },
              { productId: 'prod-2', quantity: 1, unitPrice: 50 }
            ],
            type: 'cash' as const,
            timestamp: new Date('2024-01-01T10:00:00Z')
          }
        ],
        products: [
          {
            id: 'prod-1',
            name: 'Product One',
            price: 50,
            stock: 100,
            reorderThreshold: 10,
            category: 'Test',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'prod-2',
            name: 'Product Two',
            price: 50,
            stock: 50,
            reorderThreshold: 5,
            category: 'Test',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        exportDate: new Date(),
        totalTransactions: 1,
        totalAmount: 150
      };

      const convertMethod = (service as any).convertToCSV.bind(service);
      const csv = convertMethod(testData);

      expect(csv).toContain('Product One; Product Two');
      expect(csv).toContain('2; 1'); // Quantities
      expect(csv).toContain('50; 50'); // Unit prices
    });
  });

  describe('Product Creation Validation', () => {
    it('should create product with valid data', async () => {
      const mockProduct: Product = {
        id: 'new-product-1',
        name: 'New Product',
        price: 75,
        stock: 20,
        reorderThreshold: 5,
        category: 'New Category',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProductRepository.create.mockResolvedValue(mockProduct);
      mockInventoryManager.createAuditEntry.mockResolvedValue('audit-1');

      const productData: ProductCreationData = {
        name: 'New Product',
        price: 75,
        category: 'New Category',
        initialStock: 20,
        reorderThreshold: 5
      };

      const result = await service.addNewProduct(productData);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'New Product',
        price: 75,
        stock: 20,
        reorderThreshold: 5,
        category: 'New Category',
        imageUrl: undefined,
        expiryDate: undefined
      });
      expect(mockInventoryManager.createAuditEntry).toHaveBeenCalledWith({
        productId: 'new-product-1',
        type: 'restock',
        quantityChange: 20,
        previousStock: 0,
        newStock: 20,
        reason: 'Initial stock - Product creation'
      });
    });

    it('should handle product creation with minimal data', async () => {
      const mockProduct: Product = {
        id: 'minimal-product',
        name: 'Minimal Product',
        price: 10,
        stock: 0,
        reorderThreshold: 1,
        category: 'General',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProductRepository.create.mockResolvedValue(mockProduct);

      const productData: ProductCreationData = {
        name: '  Minimal Product  ',
        price: 10,
        category: '  ',
        initialStock: 0
      };

      const result = await service.addNewProduct(productData);

      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'Minimal Product',
        price: 10,
        stock: 0,
        reorderThreshold: 1,
        category: 'General',
        imageUrl: undefined,
        expiryDate: undefined
      });

      // No audit entry for zero stock
      expect(mockInventoryManager.createAuditEntry).not.toHaveBeenCalled();
    });

    it('should handle negative values in product creation', async () => {
      const mockProduct: Product = {
        id: 'corrected-product',
        name: 'Corrected Product',
        price: 0,
        stock: 0,
        reorderThreshold: 1,
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProductRepository.create.mockResolvedValue(mockProduct);

      const productData: ProductCreationData = {
        name: 'Corrected Product',
        price: -10, // Negative price should be corrected
        category: 'Test',
        initialStock: -5 // Negative stock should be corrected
      };

      await service.addNewProduct(productData);

      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'Corrected Product',
        price: 0, // Corrected to 0
        stock: 0, // Corrected to 0
        reorderThreshold: 1, // Default minimum
        category: 'Test',
        imageUrl: undefined,
        expiryDate: undefined
      });
    });
  });

  describe('Recording Status Management', () => {
    it('should track recording state correctly', () => {
      // Initial state
      let status = service.getRecordingStatus();
      expect(status.isRecording).toBe(false);
      expect(status.duration).toBeNull();

      // Simulate recording start
      (service as any).isRecording = true;
      (service as any).recordingStartTime = Date.now() - 5000; // 5 seconds ago

      status = service.getRecordingStatus();
      expect(status.isRecording).toBe(true);
      expect(status.duration).toBeGreaterThan(4000);
      expect(status.duration).toBeLessThan(6000);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors in transaction creation', async () => {
      mockProductRepository.getById.mockRejectedValue(new Error('Database error'));

      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: 'test',
        selectedProducts: [
          {
            productId: 'test-id',
            quantity: 1,
            unitPrice: 50
          }
        ],
        paymentType: 'upi'
      };

      await expect(service.createTransaction(transactionData))
        .rejects.toThrow('Failed to create transaction');
    });

    it('should handle repository errors in product creation', async () => {
      mockProductRepository.create.mockRejectedValue(new Error('Database error'));

      const productData: ProductCreationData = {
        name: 'Test Product',
        price: 50,
        category: 'Test',
        initialStock: 10
      };

      await expect(service.addNewProduct(productData))
        .rejects.toThrow('Failed to create product');
    });

    it('should handle export errors gracefully', async () => {
      mockTransactionRepository.getAll.mockRejectedValue(new Error('Database error'));

      await expect(service.exportTransactions('json'))
        .rejects.toThrow('Failed to export transactions');
    });
  });
});