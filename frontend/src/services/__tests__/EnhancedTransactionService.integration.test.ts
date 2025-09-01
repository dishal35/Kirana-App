/**
 * Enhanced Transaction Service Integration Tests
 * 
 * Tests the complete audio-to-transaction pipeline including:
 * - Audio processing workflow
 * - Product suggestion integration
 * - Transaction creation with inventory updates
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { enhancedTransactionService, type TransactionCreationData, type ProductCreationData } from '../EnhancedTransactionService';
import { audioCaptureService } from '../AudioCapture';
import { productSuggestionService } from '../ProductSuggestionService';
import { inventoryManager } from '../InventoryManager';
import { notificationService } from '../NotificationService';
import { productRepository, transactionRepository } from '../../dbs/repo';
// Remove database setup - using mocks instead
import type { Product, Transaction, AudioQualityMetrics } from '../../types';

// Mock external services
vi.mock('../AudioCapture');
vi.mock('../ProductSuggestionService');
vi.mock('../InventoryManager');
vi.mock('../NotificationService');
vi.mock('../../dbs/repo');

const mockAudioCaptureService = audioCaptureService as any;
const mockProductSuggestionService = productSuggestionService as any;
const mockInventoryManager = inventoryManager as any;
const mockNotificationService = notificationService as any;
const mockProductRepository = productRepository as any;
const mockTransactionRepository = transactionRepository as any;

describe('EnhancedTransactionService Integration Tests', () => {
  let testProducts: Product[];
  let mockAudioBlob: Blob;
  let mockAudioQuality: AudioQualityMetrics;

  beforeEach(async () => {
    // Create test products
    testProducts = [
      {
        id: 'test-rice-1',
        name: 'Test Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 10,
        category: 'Groceries',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'test-tea-1',
        name: 'Test Tea',
        price: 20,
        stock: 50,
        reorderThreshold: 5,
        category: 'Beverages',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'test-biscuits-1',
        name: 'Test Biscuits',
        price: 30,
        stock: 25,
        reorderThreshold: 5,
        category: 'Snacks',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Setup mock audio data
    mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
    mockAudioQuality = {
      volume: 0.8,
      noiseLevel: 0.2,
      clarity: 0.9,
      isAcceptable: true
    };

    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockAudioCaptureService.startListening = vi.fn().mockResolvedValue(undefined);
    mockAudioCaptureService.stopListening = vi.fn();
    mockAudioCaptureService.getStorageDebugInfo = vi.fn().mockReturnValue([]);
    mockAudioCaptureService.clearStoredAudio = vi.fn();
    mockAudioCaptureService.destroy = vi.fn();
    
    mockProductSuggestionService.getSuggestions = vi.fn().mockResolvedValue([
      {
        product: testProducts[0],
        confidence: 0.9,
        reason: 'Price matches transaction amount',
        suggestedQuantity: 1
      }
    ]);
    mockProductSuggestionService.testGeminiConnection = vi.fn().mockResolvedValue(true);
    
    mockInventoryManager.updateStock = vi.fn().mockResolvedValue(undefined);
    mockInventoryManager.createAuditEntry = vi.fn().mockResolvedValue('audit-id');
    
    mockNotificationService.notifyTransaction = vi.fn();
    
    // Setup repository mocks
    mockProductRepository.create = vi.fn();
    mockProductRepository.getById = vi.fn();
    mockProductRepository.getAll = vi.fn().mockResolvedValue(testProducts);
    
    mockTransactionRepository.create = vi.fn();
    mockTransactionRepository.getAll = vi.fn().mockResolvedValue([]);
  });

  afterEach(async () => {
    enhancedTransactionService.destroy();
  });

  describe('Audio Recording Workflow', () => {
    it('should start and stop recording successfully', async () => {
      await enhancedTransactionService.startRecording();
      
      expect(mockAudioCaptureService.startListening).toHaveBeenCalledOnce();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(true);
      
      await enhancedTransactionService.stopRecording();
      
      expect(mockAudioCaptureService.stopListening).toHaveBeenCalledOnce();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(false);
    });

    it('should handle recording errors gracefully', async () => {
      const mockError = new Error('Microphone access denied');
      mockAudioCaptureService.startListening.mockRejectedValue(mockError);
      
      const errorHandler = vi.fn();
      enhancedTransactionService.onError = errorHandler;
      
      await expect(enhancedTransactionService.startRecording()).rejects.toThrow('Microphone access denied');
      expect(errorHandler).toHaveBeenCalledWith('Microphone access denied');
    });

    it('should not start recording if already recording', async () => {
      await enhancedTransactionService.startRecording();
      await enhancedTransactionService.startRecording(); // Second call
      
      expect(mockAudioCaptureService.startListening).toHaveBeenCalledOnce();
    });
  });

  describe('Audio Processing Pipeline', () => {
    it('should process audio and trigger product suggestions', async () => {
      const mockTransactionProcessor = {
        processAudio: vi.fn().mockResolvedValue({
          amount: 50,
          confidence: 0.85,
          suggestedProducts: [],
          transcription: '50 rupees received on PhonePe'
        })
      };

      // Mock the transaction processor
      (enhancedTransactionService as any).transactionProcessor = mockTransactionProcessor;

      const audioDetectedHandler = vi.fn();
      enhancedTransactionService.onAudioDetected = audioDetectedHandler;

      // Simulate audio detection
      await mockAudioCaptureService.onAudioDetected(mockAudioBlob, mockAudioQuality);

      expect(mockTransactionProcessor.processAudio).toHaveBeenCalledWith(mockAudioBlob);
      expect(mockProductSuggestionService.getSuggestions).toHaveBeenCalledWith(50, 3);
      expect(audioDetectedHandler).toHaveBeenCalledWith({
        success: true,
        transactionResult: expect.objectContaining({
          amount: 50,
          confidence: 0.85,
          transcription: '50 rupees received on PhonePe',
          suggestedProducts: [testProducts[0]]
        }),
        audioQuality: mockAudioQuality
      });
    });

    it('should handle audio processing errors', async () => {
      const mockTransactionProcessor = {
        processAudio: vi.fn().mockRejectedValue(new Error('Transcription failed'))
      };

      (enhancedTransactionService as any).transactionProcessor = mockTransactionProcessor;

      const audioDetectedHandler = vi.fn();
      enhancedTransactionService.onAudioDetected = audioDetectedHandler;

      await mockAudioCaptureService.onAudioDetected(mockAudioBlob, mockAudioQuality);

      expect(audioDetectedHandler).toHaveBeenCalledWith({
        success: false,
        error: 'Transcription failed',
        audioQuality: mockAudioQuality
      });
    });
  });

  describe('Transaction Creation', () => {
    it('should create transaction with inventory updates', async () => {
      const transactionData: TransactionCreationData = {
        amount: 100,
        transcription: '100 rupees received on PhonePe',
        selectedProducts: [
          {
            productId: testProducts[0].id!,
            quantity: 2,
            unitPrice: testProducts[0].price
          }
        ],
        paymentType: 'upi',
        confidence: 0.9
      };

      const transaction = await enhancedTransactionService.createTransaction(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.amount).toBe(100);
      expect(transaction.type).toBe('upi');
      expect(transaction.products).toHaveLength(1);
      expect(transaction.products[0].productId).toBe(testProducts[0].id);
      expect(transaction.products[0].quantity).toBe(2);

      // Verify inventory update
      expect(mockInventoryManager.updateStock).toHaveBeenCalledWith(
        testProducts[0].id,
        -2,
        `Sale - Transaction ${transaction.id}`
      );

      // Verify notification
      expect(mockNotificationService.notifyTransaction).toHaveBeenCalledWith(transaction);
    });

    it('should validate product availability before creating transaction', async () => {
      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: '50 rupees received',
        selectedProducts: [
          {
            productId: testProducts[0].id!,
            quantity: 200, // More than available stock (100)
            unitPrice: testProducts[0].price
          }
        ],
        paymentType: 'cash'
      };

      await expect(enhancedTransactionService.createTransaction(transactionData))
        .rejects.toThrow('Insufficient stock for Test Rice');
    });

    it('should handle non-existent products', async () => {
      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: '50 rupees received',
        selectedProducts: [
          {
            productId: 'non-existent-id',
            quantity: 1,
            unitPrice: 50
          }
        ],
        paymentType: 'cash'
      };

      await expect(enhancedTransactionService.createTransaction(transactionData))
        .rejects.toThrow('Product not found: non-existent-id');
    });

    it('should correct price mismatches', async () => {
      const transactionData: TransactionCreationData = {
        amount: 60,
        transcription: '60 rupees received',
        selectedProducts: [
          {
            productId: testProducts[0].id!,
            quantity: 1,
            unitPrice: 60 // Wrong price, should be corrected to 50
          }
        ],
        paymentType: 'upi'
      };

      const transaction = await enhancedTransactionService.createTransaction(transactionData);

      expect(transaction.amount).toBe(50); // Corrected to actual product price
      expect(transaction.products[0].unitPrice).toBe(50);
    });
  });

  describe('Product Creation', () => {
    it('should create new product with audit trail', async () => {
      const productData: ProductCreationData = {
        name: 'New Test Product',
        price: 75,
        category: 'Test Category',
        initialStock: 20,
        reorderThreshold: 5
      };

      const product = await enhancedTransactionService.addNewProduct(productData);

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('New Test Product');
      expect(product.price).toBe(75);
      expect(product.stock).toBe(20);
      expect(product.reorderThreshold).toBe(5);
      expect(product.category).toBe('Test Category');

      // Verify audit entry for initial stock
      expect(mockInventoryManager.createAuditEntry).toHaveBeenCalledWith({
        productId: product.id,
        type: 'restock',
        quantityChange: 20,
        previousStock: 0,
        newStock: 20,
        reason: 'Initial stock - Product creation'
      });
    });

    it('should handle product creation with minimal data', async () => {
      const productData: ProductCreationData = {
        name: '  Minimal Product  ', // Test trimming
        price: 10,
        category: '  ', // Empty category should default
        initialStock: 0 // Zero stock
      };

      const product = await enhancedTransactionService.addNewProduct(productData);

      expect(product.name).toBe('Minimal Product');
      expect(product.category).toBe('General');
      expect(product.stock).toBe(0);
      expect(product.reorderThreshold).toBe(1); // Default minimum

      // No audit entry for zero stock
      expect(mockInventoryManager.createAuditEntry).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Logs and Export', () => {
    let testTransactions: Transaction[];

    beforeEach(async () => {
      // Create test transactions
      testTransactions = [
        await transactionRepository.create({
          amount: 50,
          products: [{ productId: testProducts[0].id!, quantity: 1, unitPrice: 50 }],
          type: 'upi',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          transcription: '50 rupees received on PhonePe'
        }),
        await transactionRepository.create({
          amount: 40,
          products: [{ productId: testProducts[1].id!, quantity: 2, unitPrice: 20 }],
          type: 'cash',
          timestamp: new Date('2024-01-02T14:00:00Z')
        })
      ];
    });

    it('should get all transaction logs', async () => {
      const logs = await enhancedTransactionService.getTransactionLogs();
      
      expect(logs).toHaveLength(2);
      expect(logs[0].amount).toBe(40); // Most recent first
      expect(logs[1].amount).toBe(50);
    });

    it('should filter transactions by date range', async () => {
      const filters = {
        dateRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z')
        }
      };

      const logs = await enhancedTransactionService.getTransactionLogs(filters);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].amount).toBe(50);
    });

    it('should filter transactions by payment type', async () => {
      const filters = { paymentType: 'upi' as const };
      const logs = await enhancedTransactionService.getTransactionLogs(filters);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('upi');
    });

    it('should filter transactions by amount range', async () => {
      const filters = { minAmount: 45, maxAmount: 55 };
      const logs = await enhancedTransactionService.getTransactionLogs(filters);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].amount).toBe(50);
    });

    it('should export transactions as JSON', async () => {
      const blob = await enhancedTransactionService.exportTransactions('json');
      
      expect(blob.type).toBe('application/json');
      
      const text = await blob.text();
      const data = JSON.parse(text);
      
      expect(data.transactions).toHaveLength(2);
      expect(data.totalTransactions).toBe(2);
      expect(data.totalAmount).toBe(90);
      expect(data.exportDate).toBeDefined();
    });

    it('should export transactions as CSV', async () => {
      const blob = await enhancedTransactionService.exportTransactions('csv');
      
      expect(blob.type).toBe('text/csv');
      
      const text = await blob.text();
      const lines = text.split('\n');
      
      expect(lines[0]).toContain('Transaction ID'); // Header
      expect(lines).toHaveLength(3); // Header + 2 transactions
    });
  });

  describe('Service Integration', () => {
    it('should test complete audio pipeline', async () => {
      const pipelineTest = await enhancedTransactionService.testAudioPipeline();
      
      expect(mockProductSuggestionService.testGeminiConnection).toHaveBeenCalled();
      expect(pipelineTest).toBe(true);
    });

    it('should handle pipeline test failures', async () => {
      mockProductSuggestionService.testGeminiConnection.mockResolvedValue(false);
      
      const pipelineTest = await enhancedTransactionService.testAudioPipeline();
      
      expect(pipelineTest).toBe(false);
    });

    it('should manage audio storage', () => {
      enhancedTransactionService.clearAudioStorage();
      expect(mockAudioCaptureService.clearStoredAudio).toHaveBeenCalled();
      
      enhancedTransactionService.getAudioStorageInfo();
      expect(mockAudioCaptureService.getStorageDebugInfo).toHaveBeenCalled();
    });

    it('should cleanup resources on destroy', () => {
      enhancedTransactionService.destroy();
      
      expect(mockAudioCaptureService.destroy).toHaveBeenCalled();
      expect(enhancedTransactionService.getRecordingStatus().isRecording).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle inventory update failures', async () => {
      mockInventoryManager.updateStock.mockRejectedValue(new Error('Database error'));
      
      const transactionData: TransactionCreationData = {
        amount: 50,
        transcription: '50 rupees received',
        selectedProducts: [
          {
            productId: testProducts[0].id!,
            quantity: 1,
            unitPrice: 50
          }
        ],
        paymentType: 'upi'
      };

      await expect(enhancedTransactionService.createTransaction(transactionData))
        .rejects.toThrow('Failed to create transaction');
    });

    it('should handle product suggestion failures gracefully', async () => {
      mockProductSuggestionService.getSuggestions.mockRejectedValue(new Error('API error'));
      
      const mockTransactionProcessor = {
        processAudio: vi.fn().mockResolvedValue({
          amount: 50,
          confidence: 0.85,
          suggestedProducts: [],
          transcription: '50 rupees received'
        })
      };

      (enhancedTransactionService as any).transactionProcessor = mockTransactionProcessor;

      const audioDetectedHandler = vi.fn();
      enhancedTransactionService.onAudioDetected = audioDetectedHandler;

      await mockAudioCaptureService.onAudioDetected(mockAudioBlob, mockAudioQuality);

      // Should still succeed with empty suggestions
      expect(audioDetectedHandler).toHaveBeenCalledWith({
        success: true,
        transactionResult: expect.objectContaining({
          amount: 50,
          suggestedProducts: []
        }),
        audioQuality: mockAudioQuality
      });
    });
  });
});