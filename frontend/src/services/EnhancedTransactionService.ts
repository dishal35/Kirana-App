/**
 * Enhanced Transaction Service
 * 
 * Integrates all audio workflow components to provide a complete
 * audio-to-transaction pipeline with error handling and product suggestions.
 */

import { audioCaptureService } from './AudioCapture';
import { TransactionProcessor } from './TransactionProcessor';
import { productSuggestionService } from './ProductSuggestionService';
import { inventoryManager } from './InventoryManager';
import { notificationService } from './NotificationService';
import { productRepository, transactionRepository } from '../dbs/repo';
import type { 
  Product, 
  Transaction, 
  TransactionItem, 
  AudioQualityMetrics,
  TransactionResult
} from '../types';

export interface TransactionCreationData {
  amount: number;
  transcription: string;
  selectedProducts: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentType: 'upi' | 'cash';
  confidence?: number;
}

export interface ProductCreationData {
  name: string;
  price: number;
  category: string;
  initialStock: number;
  reorderThreshold?: number;
  imageUrl?: string;
  expiryDate?: Date;
}

export interface TransactionFilters {
  dateRange?: { start: Date; end: Date };
  paymentType?: 'upi' | 'cash';
  minAmount?: number;
  maxAmount?: number;
  productId?: string;
  searchText?: string;
}

export interface AudioProcessingResult {
  success: boolean;
  transactionResult?: TransactionResult;
  error?: string;
  audioQuality?: AudioQualityMetrics;
}

export interface TransactionExportData {
  transactions: Transaction[];
  products: Product[];
  exportDate: Date;
  totalTransactions: number;
  totalAmount: number;
}

export class EnhancedTransactionService {
  private transactionProcessor: TransactionProcessor;
  private isRecording: boolean = false;
  private recordingStartTime: number | null = null;

  // Event handlers
  public onAudioDetected: (result: AudioProcessingResult) => void = () => {};
  public onRecordingStateChanged: (isRecording: boolean) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    this.transactionProcessor = new TransactionProcessor();
    this.setupAudioCaptureHandlers();
  }

  /**
   * Setup audio capture event handlers
   */
  private setupAudioCaptureHandlers(): void {
    // Handle audio detection
    audioCaptureService.onAudioDetected = async (audioBlob: Blob, quality: AudioQualityMetrics) => {
      try {
        console.log('Audio detected, processing...', { quality });
        const result = await this.processAudioBlob(audioBlob, quality);
        this.onAudioDetected(result);
      } catch (error) {
        console.error('Error processing detected audio:', error);
        this.onAudioDetected({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error processing audio',
          audioQuality: quality
        });
      }
    };

    // Handle permission errors
    audioCaptureService.onPermissionError = (error: string) => {
      console.error('Audio permission error:', error);
      this.onError(error);
    };

    // Handle quality issues
    audioCaptureService.onQualityIssue = (issue: string, metrics: AudioQualityMetrics) => {
      console.warn('Audio quality issue:', issue, metrics);
      this.onError(`Audio quality issue: ${issue}`);
    };
  }

  /**
   * Start recording audio for transaction detection
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('Already recording');
      return;
    }

    try {
      await audioCaptureService.startListening();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.onRecordingStateChanged(true);
      console.log('Enhanced transaction service started recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.onError(error instanceof Error ? error.message : 'Failed to start recording');
      throw error;
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      console.log('Not currently recording');
      return;
    }

    try {
      audioCaptureService.stopListening();
      this.isRecording = false;
      this.recordingStartTime = null;
      this.onRecordingStateChanged(false);
      console.log('Enhanced transaction service stopped recording');
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.onError(error instanceof Error ? error.message : 'Error stopping recording');
    }
  }

  /**
   * Process audio blob to extract transaction information
   */
  private async processAudioBlob(audioBlob: Blob, quality: AudioQualityMetrics): Promise<AudioProcessingResult> {
    try {
      // Process audio to get transaction result
      const transactionResult = await this.transactionProcessor.processAudio(audioBlob);
      
      // Get product suggestions based on the extracted amount
      const suggestions = await productSuggestionService.getSuggestions(transactionResult.amount, 3);
      
      // Add suggestions to the result
      transactionResult.suggestedProducts = suggestions.map(s => s.product);

      return {
        success: true,
        transactionResult,
        audioQuality: quality
      };
    } catch (error) {
      console.error('Error processing audio blob:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing audio',
        audioQuality: quality
      };
    }
  }

  /**
   * Create a new transaction with inventory updates
   */
  async createTransaction(data: TransactionCreationData): Promise<Transaction> {
    try {
      // Validate selected products
      const validatedProducts = await this.validateSelectedProducts(data.selectedProducts);
      
      // Create transaction items
      const transactionItems: TransactionItem[] = validatedProducts.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // Calculate actual total from selected products
      const actualTotal = transactionItems.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice), 
        0
      );

      // Create transaction
      const transaction: Omit<Transaction, 'id'> = {
        amount: actualTotal,
        products: transactionItems,
        type: data.paymentType,
        timestamp: new Date(),
        transcription: data.transcription,
        confidence: data.confidence
      };

      // Save transaction
      const savedTransaction = await transactionRepository.create(transaction);

      // Process transaction sale through inventory manager (includes notifications)
      await inventoryManager.processTransactionSale(savedTransaction);

      console.log('Transaction created successfully:', savedTransaction.id);
      return savedTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate selected products and check stock availability
   */
  private async validateSelectedProducts(selectedProducts: TransactionCreationData['selectedProducts']): Promise<TransactionCreationData['selectedProducts']> {
    const validatedProducts = [];

    for (const item of selectedProducts) {
      const product = await productRepository.getById(item.productId);
      
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for ${product.name}: ${item.quantity}`);
      }

      if (item.quantity > product.stock) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      if (item.unitPrice !== product.price) {
        console.warn(`Price mismatch for ${product.name}. Expected: ${product.price}, Provided: ${item.unitPrice}`);
        // Use current product price
        item.unitPrice = product.price;
      }

      validatedProducts.push(item);
    }

    return validatedProducts;
  }

  /**
   * Add a new product to the catalog
   */
  async addNewProduct(productData: ProductCreationData): Promise<Product> {
    try {
      const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: productData.name.trim(),
        price: Math.max(0, productData.price),
        stock: Math.max(0, productData.initialStock),
        reorderThreshold: productData.reorderThreshold || Math.max(1, Math.floor(productData.initialStock * 0.2)),
        category: productData.category?.trim() || 'General',
        imageUrl: productData.imageUrl,
        expiryDate: productData.expiryDate
      };

      const savedProduct = await productRepository.create(product);
      
      // Create inventory audit entry for initial stock
      if (product.stock > 0) {
        await inventoryManager.adjustStock({
          productId: savedProduct.id!,
          type: 'restock',
          quantityChange: product.stock,
          reason: 'Initial stock - Product creation'
        });
      }

      console.log('New product created:', savedProduct.id);
      return savedProduct;
    } catch (error) {
      console.error('Error creating new product:', error);
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction logs with filtering
   */
  async getTransactionLogs(filters?: TransactionFilters): Promise<Transaction[]> {
    try {
      let transactions = await transactionRepository.getAll();

      if (!filters) {
        return transactions;
      }

      // Apply filters
      if (filters.dateRange) {
        transactions = transactions.filter(t => 
          t.timestamp >= filters.dateRange!.start && 
          t.timestamp <= filters.dateRange!.end
        );
      }

      if (filters.paymentType) {
        transactions = transactions.filter(t => t.type === filters.paymentType);
      }

      if (filters.minAmount !== undefined) {
        transactions = transactions.filter(t => t.amount >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        transactions = transactions.filter(t => t.amount <= filters.maxAmount!);
      }

      if (filters.productId) {
        transactions = transactions.filter(t => 
          t.products.some(p => p.productId === filters.productId)
        );
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        transactions = transactions.filter(t => 
          t.transcription?.toLowerCase().includes(searchLower) ||
          t.id?.toLowerCase().includes(searchLower)
        );
      }

      return transactions;
    } catch (error) {
      console.error('Error getting transaction logs:', error);
      throw new Error(`Failed to get transaction logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export transactions in specified format
   */
  async exportTransactions(format: 'csv' | 'json', filters?: TransactionFilters): Promise<Blob> {
    try {
      const transactions = await this.getTransactionLogs(filters);
      const products = await productRepository.getAll();
      
      const exportData: TransactionExportData = {
        transactions,
        products,
        exportDate: new Date(),
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0)
      };

      if (format === 'json') {
        return new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
      } else {
        const csv = this.convertToCSV(exportData);
        return new Blob([csv], { type: 'text/csv' });
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw new Error(`Failed to export transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert transaction data to CSV format
   */
  private convertToCSV(data: TransactionExportData): string {
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'Amount',
      'Payment Type',
      'Products',
      'Quantities',
      'Unit Prices',
      'Transcription',
      'Confidence'
    ];

    const productMap = new Map(data.products.map(p => [p.id!, p]));

    const rows = data.transactions.map(transaction => {
      const productNames = transaction.products.map(p => {
        const product = productMap.get(p.productId);
        return product ? product.name : 'Unknown Product';
      }).join('; ');

      const quantities = transaction.products.map(p => p.quantity).join('; ');
      const unitPrices = transaction.products.map(p => p.unitPrice).join('; ');

      return [
        transaction.id || '',
        transaction.timestamp.toLocaleDateString(),
        transaction.timestamp.toLocaleTimeString(),
        transaction.amount.toFixed(2),
        transaction.type.toUpperCase(),
        productNames,
        quantities,
        unitPrices,
        transaction.transcription || '',
        transaction.confidence?.toFixed(2) || ''
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get recording status
   */
  getRecordingStatus(): { isRecording: boolean; duration: number | null } {
    return {
      isRecording: this.isRecording,
      duration: this.recordingStartTime ? Date.now() - this.recordingStartTime : null
    };
  }

  /**
   * Get audio storage debug information
   */
  getAudioStorageInfo(): any {
    return audioCaptureService.getStorageDebugInfo();
  }

  /**
   * Clear stored audio data
   */
  clearAudioStorage(): void {
    audioCaptureService.clearStoredAudio();
  }

  /**
   * Test the complete audio processing pipeline
   */
  async testAudioPipeline(): Promise<boolean> {
    try {
      // Test Gemini connection
      const geminiTest = await productSuggestionService.testGeminiConnection();
      console.log('Gemini connection test:', geminiTest);
      
      // Test audio capture initialization
      const audioTest = audioCaptureService.getStoredAudioCount() >= 0;
      console.log('Audio capture test:', audioTest);
      
      return geminiTest && audioTest;
    } catch (error) {
      console.error('Audio pipeline test failed:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRecording();
    audioCaptureService.destroy();
  }
}

// Export singleton instance
export const enhancedTransactionService = new EnhancedTransactionService();