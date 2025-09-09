import { audioCaptureService, type AudioCaptureService, type AudioQualityMetrics } from './AudioCapture';
import { TransactionProcessor } from './TransactionProcessor';
import { productSuggestionService } from './ProductSuggestionService';
import type { Product, TransactionResult } from '../types';

export interface TransactionServiceConfig {
  onTransactionDetected: (result: TransactionResult) => void;
  onError: (error: string) => void;
  onStatusChange: (status: 'idle' | 'listening' | 'processing' | 'error') => void;
  products: Product[];
  autoSuggestEnabled: boolean;
}

export class IntegratedTransactionService {
  private audioCapture: AudioCaptureService;
  private transactionProcessor: TransactionProcessor;
  private config: TransactionServiceConfig;
  private isActive = false;
  private status: 'idle' | 'listening' | 'processing' | 'error' = 'idle';

  constructor(config: TransactionServiceConfig) {
    this.config = config;
    
    // Initialize services
    this.audioCapture = audioCaptureService;
    this.transactionProcessor = new TransactionProcessor();
    // Use singleton instance with exact matching
    console.log('🎯 IntegratedTransactionService using exact matching ProductSuggestionService');

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Audio capture events
    this.audioCapture.onAudioDetected = async (audioBlob: Blob, quality: AudioQualityMetrics) => {
      await this.processAudioTransaction(audioBlob);
    };

    this.audioCapture.onPermissionError = (error: string) => {
      this.setStatus('error');
      this.config.onError(`Audio permission error: ${error}`);
    };

    this.audioCapture.onQualityIssue = (issue: string, metrics: AudioQualityMetrics) => {
      console.warn('Audio quality issue:', issue, metrics);
      // Don't set error status for quality issues, just log them
    };

    // Handle simulated transaction events for testing
    this.handleSimulatedTransactionEvent = this.handleSimulatedTransactionEvent.bind(this);
    window.addEventListener('upi-transaction-detected', this.handleSimulatedTransactionEvent);
  }

  private setStatus(status: 'idle' | 'listening' | 'processing' | 'error') {
    this.status = status;
    this.config.onStatusChange(status);
  }

  private async handleSimulatedTransactionEvent(event: CustomEvent) {
    console.log('🧪 IntegratedTransactionService handling simulated transaction event:', event.detail);
    try {
      this.setStatus('processing');

      // Create transaction result from simulated event
      const transactionResult: TransactionResult = {
        amount: event.detail.amount,
        transcription: event.detail.transcription,
        confidence: event.detail.confidence || 0.95,
        timestamp: event.detail.timestamp || new Date(),
        type: event.detail.type || 'upi',
        suggestedProducts: [],
        suggestedProductsWithQuantities: []
      };

      if (transactionResult.amount > 0) {
        // Get exact product suggestions if enabled
        if (this.config.autoSuggestEnabled) {
          const suggestions = await productSuggestionService.getSuggestions(
            transactionResult.amount,
            3 // Max suggestions
          );
          
          if (suggestions.length > 0) {
            // Keep both formats for backward compatibility and exact matching
            transactionResult.suggestedProducts = suggestions.map(s => s.product);
            transactionResult.suggestedProductsWithQuantities = suggestions.map(s => ({
              product: s.product,
              quantity: s.suggestedQuantity,
              reason: s.reason,
              confidence: s.confidence
            }));
            console.log(`🎯 Found ${suggestions.length} exact product matches for simulated ₹${transactionResult.amount}`);
            console.log('   Exact combinations:', suggestions.map(s => `${s.suggestedQuantity}x ${s.product.name} = ₹${s.product.price * s.suggestedQuantity}`).join(', '));
          } else {
            // No exact combinations found
            transactionResult.suggestedProducts = [];
            transactionResult.suggestedProductsWithQuantities = [];
            console.log(`⚠️ No exact combinations found for simulated ₹${transactionResult.amount}`);
          }
        }

        // Notify the application about the detected transaction
        console.log('🚀 IntegratedTransactionService sending simulated transaction to App:', transactionResult);
        console.log('   - suggestedProducts:', transactionResult.suggestedProducts?.length || 0);
        console.log('   - suggestedProductsWithQuantities:', transactionResult.suggestedProductsWithQuantities?.length || 0);
        if (transactionResult.suggestedProductsWithQuantities?.length > 0) {
          console.log('   - Exact combinations:', transactionResult.suggestedProductsWithQuantities.map(s => `${s.quantity}x ${s.product.name}`));
        }
        this.config.onTransactionDetected(transactionResult);
      }

      this.setStatus('listening'); // Return to listening state
    } catch (error) {
      console.error('Error processing simulated transaction:', error);
      this.setStatus('error');
      this.config.onError(
        error instanceof Error ? error.message : 'Failed to process simulated transaction'
      );
    }
  }

  private async processAudioTransaction(audioBlob: Blob) {
    try {
      this.setStatus('processing');

      // Process the audio through the transaction processor
      const transactionResult = await this.transactionProcessor.processAudio(audioBlob);

      if (transactionResult.amount > 0) {
        // Get exact product suggestions if enabled
        if (this.config.autoSuggestEnabled) {
          const suggestions = await productSuggestionService.getSuggestions(
            transactionResult.amount,
            3 // Max suggestions
          );
          
          if (suggestions.length > 0) {
            // Keep both formats for backward compatibility and exact matching
            transactionResult.suggestedProducts = suggestions.map(s => s.product);
            transactionResult.suggestedProductsWithQuantities = suggestions.map(s => ({
              product: s.product,
              quantity: s.suggestedQuantity,
              reason: s.reason,
              confidence: s.confidence
            }));
            console.log(`🎯 Found ${suggestions.length} exact product matches for ₹${transactionResult.amount}`);
            console.log('   Exact combinations:', suggestions.map(s => `${s.suggestedQuantity}x ${s.product.name} = ₹${s.product.price * s.suggestedQuantity}`).join(', '));
          } else {
            // No exact combinations found
            transactionResult.suggestedProducts = [];
            transactionResult.suggestedProductsWithQuantities = [];
            console.log(`⚠️ No exact combinations found for ₹${transactionResult.amount}`);
          }
        }

        // Notify the application about the detected transaction
        console.log('🚀 IntegratedTransactionService sending to App:', transactionResult);
        console.log('   - suggestedProducts:', transactionResult.suggestedProducts?.length || 0);
        console.log('   - suggestedProductsWithQuantities:', transactionResult.suggestedProductsWithQuantities?.length || 0);
        if (transactionResult.suggestedProductsWithQuantities?.length > 0) {
          console.log('   - Exact combinations:', transactionResult.suggestedProductsWithQuantities.map(s => `${s.quantity}x ${s.product.name}`));
        }
        this.config.onTransactionDetected(transactionResult);
      }

      this.setStatus('listening'); // Return to listening state
    } catch (error) {
      // Don't treat non-UPI audio as an error, just log it
      if (error instanceof Error && error.message.includes('No UPI payment detected')) {
        console.log('Audio processed but no UPI payment found - continuing to listen');
        this.setStatus('listening');
      } else {
        console.error('Error processing audio transaction:', error);
        this.setStatus('error');
        this.config.onError(
          error instanceof Error ? error.message : 'Failed to process audio transaction'
        );
      }
    }
  }

  // Public methods
  async startListening(): Promise<void> {
    if (this.isActive) {
      console.warn('Transaction service is already active');
      return;
    }

    try {
      this.isActive = true;
      await this.audioCapture.startListening();
      this.setStatus('listening');
      console.log('Integrated transaction service started');
    } catch (error) {
      this.isActive = false;
      this.setStatus('error');
      throw error;
    }
  }

  stopListening(): void {
    if (!this.isActive) {
      return;
    }

    this.audioCapture.stopListening();
    this.isActive = false;
    this.setStatus('idle');
    console.log('Integrated transaction service stopped');
  }

  updateConfig(updates: Partial<TransactionServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  isListening(): boolean {
    return this.isActive && this.audioCapture.isListening;
  }

  getStatus(): 'idle' | 'listening' | 'processing' | 'error' {
    return this.status;
  }

  // Test method for manual audio processing
  async processTestAudio(audioBlob: Blob): Promise<TransactionResult> {
    this.setStatus('processing');
    try {
      const result = await this.processAudioTransaction(audioBlob);
      this.setStatus('idle');
      return result as TransactionResult;
    } catch (error) {
      this.setStatus('error');
      throw error;
    }
  }

  // Cleanup method
  destroy(): void {
    this.stopListening();
    // Remove event listener for simulated transactions
    window.removeEventListener('upi-transaction-detected', this.handleSimulatedTransactionEvent);
    // The audio service is a singleton, so we don't destroy it
    // Just clear any stored audio if needed
    this.audioCapture.clearStoredAudio();
  }
}

// Factory function for creating the service
export const createIntegratedTransactionService = (
  config: TransactionServiceConfig
): IntegratedTransactionService => {
  return new IntegratedTransactionService(config);
};