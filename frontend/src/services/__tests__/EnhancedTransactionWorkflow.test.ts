/**
 * Enhanced Transaction Workflow Integration Test
 * 
 * Demonstrates the complete audio-to-transaction pipeline
 * with simplified mocking for reliable testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enhancedTransactionService, type TransactionCreationData, type ProductCreationData } from '../EnhancedTransactionService';
import type { Product, AudioQualityMetrics } from '../../types';

// Mock all external dependencies
vi.mock('../AudioCapture', () => ({
  audioCaptureService: {
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn(),
    onAudioDetected: vi.fn(),
    onPermissionError: vi.fn(),
    onQualityIssue: vi.fn(),
    getStorageDebugInfo: vi.fn().mockReturnValue([]),
    clearStoredAudio: vi.fn(),
    destroy: vi.fn(),
    getStoredAudioCount: vi.fn().mockReturnValue(0)
  }
}));

vi.mock('../TransactionProcessor', () => ({
  TransactionProcessor: vi.fn().mockImplementation(() => ({
    processAudio: vi.fn().mockResolvedValue({
      amount: 50,
      confidence: 0.9,
      suggestedProducts: [],
      transcription: '50 rupees received on PhonePe'
    })
  }))
}));

vi.mock('../ProductSuggestionService', () => ({
  productSuggestionService: {
    getSuggestions: vi.fn().mockResolvedValue([
      {
        product: {
          id: 'product-1',
          name: 'Rice',
          price: 50,
          stock: 100,
          reorderThreshold: 10,
          category: 'Groceries',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        confidence: 0.9,
        reason: 'Price matches transaction amount',
        suggestedQuantity: 1
      }
    ]),
    testGeminiConnection: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../InventoryManager', () => ({
  inventoryManager: {
    updateStock: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi.fn().mockResolvedValue('audit-id')
  }
}));

vi.mock('../NotificationService', () => ({
  notificationService: {
    notifyTransaction: vi.fn()
  }
}));

vi.mock('../../dbs/repo', () => ({
  productRepository: {
    create: vi.fn().mockImplementation((product) => Promise.resolve({
      ...product,
      id: 'new-product-id',
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    getById: vi.fn().mockImplementation((id) => {
      if (id === 'product-1') {
        return Promise.resolve({
          id: 'product-1',
          name: 'Rice',
          price: 50,
          stock: 100,
          reorderThreshold: 10,
          category: 'Groceries',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      return Promise.resolve(null);
    }),
    getAll: vi.fn().mockResolvedValue([])
  },
  transactionRepository: {
    create: vi.fn().mockImplementation((transaction) => Promise.resolve({
      ...transaction,
      id: 'transaction-id'
    })),
    getAll: vi.fn().mockResolvedValue([])
  }
}));

describe('Enhanced Transaction Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Audio-to-Transaction Pipeline', () => {
    it('should handle the complete workflow from audio detection to transaction creation', async () => {
      // 1. Start recording
      await enhancedTransactionService.startRecording();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(true);

      // 2. Create a transaction with valid data
      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: '50 rupees received on PhonePe',
        selectedProducts: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 50
          }
        ],
        paymentType: 'upi',
        confidence: 0.9
      };

      const transaction = await enhancedTransactionService.createTransaction(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe('transaction-id');
      expect(transaction.amount).toBe(50);
      expect(transaction.type).toBe('upi');

      // 3. Stop recording
      await enhancedTransactionService.stopRecording();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(false);
    });

    it('should create new products during transaction flow', async () => {
      const productData: ProductCreationData = {
        name: 'New Product',
        price: 30,
        category: 'New Category',
        initialStock: 10,
        reorderThreshold: 2
      };

      const product = await enhancedTransactionService.addNewProduct(productData);

      expect(product).toBeDefined();
      expect(product.id).toBe('new-product-id');
      expect(product.name).toBe('New Product');
      expect(product.price).toBe(30);
      expect(product.stock).toBe(10);
    });

    it('should export transaction data in different formats', async () => {
      // Test JSON export
      const jsonBlob = await enhancedTransactionService.exportTransactions('json');
      expect(jsonBlob.type).toBe('application/json');

      // Test CSV export
      const csvBlob = await enhancedTransactionService.exportTransactions('csv');
      expect(csvBlob.type).toBe('text/csv');
    });

    it('should test the complete audio pipeline', async () => {
      const pipelineTest = await enhancedTransactionService.testAudioPipeline();
      expect(pipelineTest).toBe(true);
    });

    it('should handle service cleanup properly', () => {
      enhancedTransactionService.clearAudioStorage();
      const storageInfo = enhancedTransactionService.getAudioStorageInfo();
      expect(Array.isArray(storageInfo)).toBe(true);

      enhancedTransactionService.destroy();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(false);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle transaction creation with invalid product', async () => {
      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: 'test',
        selectedProducts: [
          {
            productId: 'non-existent-product',
            quantity: 1,
            unitPrice: 50
          }
        ],
        paymentType: 'upi'
      };

      await expect(enhancedTransactionService.createTransaction(transactionData))
        .rejects.toThrow('Product not found: non-existent-product');
    });

    it('should validate product creation data', async () => {
      const productData: ProductCreationData = {
        name: '  Valid Product  ',
        price: -10, // Negative price should be corrected
        category: '  ',
        initialStock: -5 // Negative stock should be corrected
      };

      const product = await enhancedTransactionService.addNewProduct(productData);

      expect(product.name).toBe('Valid Product'); // Trimmed
      expect(product.price).toBe(0); // Corrected to 0
      expect(product.stock).toBe(0); // Corrected to 0
      expect(product.category).toBe('General'); // Default category
    });
  });

  describe('Transaction Filtering and Search', () => {
    it('should filter transactions by various criteria', async () => {
      const filters = {
        paymentType: 'upi' as const,
        minAmount: 10,
        maxAmount: 100,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      const transactions = await enhancedTransactionService.getTransactionLogs(filters);
      expect(Array.isArray(transactions)).toBe(true);
    });

    it('should get all transactions without filters', async () => {
      const transactions = await enhancedTransactionService.getTransactionLogs();
      expect(Array.isArray(transactions)).toBe(true);
    });
  });
});

// Export for use in other tests
export { enhancedTransactionService };