/**
 * SIMPLIFIED Transaction Service for MVP
 * Keeps the AI product recommendations but simplifies the orchestration
 */

import { geminiTranscriptionService } from './GeminiTranscription';
import { productSuggestionService, type ProductSuggestion } from './ProductSuggestionService';
import { simpleDb, type Product, type Transaction } from './SimpleDatabase';

export interface TransactionFlowResult {
  amount: number;
  transcription: string;
  confidence: number;
  productSuggestions: ProductSuggestion[];
}

export interface TransactionConfirmation {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export class SimpleTransactionService {
  private mediaRecorder: MediaRecorder | null = null;
  private isListening = false;
  
  // Callbacks for UI updates
  onTransactionDetected?: (result: TransactionFlowResult) => void;
  onTransactionConfirmed?: (transaction: Transaction) => void;
  onError?: (error: string) => void;

  /**
   * Start listening for UPI audio
   */
  async startListening(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      const audioChunks: Blob[] = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          await this.processAudioTransaction(audioBlob);
        }
      };

      this.mediaRecorder.start();
      this.isListening = true;
      
      // Auto-stop after 15 seconds
      setTimeout(() => this.stopListening(), 15000);
    } catch (error) {
      this.onError?.('Failed to access microphone. Please check permissions.');
      throw error;
    }
  }

  stopListening(): void {
    if (this.mediaRecorder && this.isListening) {
      this.mediaRecorder.stop();
      this.isListening = false;
    }
  }

  /**
   * Process audio through the AI pipeline: Audio → Transcription → Amount → Product Suggestions
   */
  private async processAudioTransaction(audioBlob: Blob): Promise<void> {
    try {
      // Step 1: Transcribe audio with Gemini
      const transcriptionResult = await geminiTranscriptionService.transcribeAudio(audioBlob);
      
      // Step 2: Extract amount from transcription
      const amount = this.extractAmount(transcriptionResult.text);
      
      if (!amount) {
        this.onError?.('Could not detect transaction amount from audio');
        return;
      }

      // Step 3: Get AI-powered product suggestions
      const productSuggestions = await productSuggestionService.getSuggestions(amount, 3);

      // Step 4: Trigger transaction confirmation UI
      this.onTransactionDetected?.({
        amount,
        transcription: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        productSuggestions
      });

    } catch (error) {
      console.error('Audio transaction processing failed:', error);
      this.onError?.('Failed to process audio transaction');
    }
  }

  /**
   * Simple amount extraction (can be enhanced)
   */
  private extractAmount(text: string): number | null {
    const patterns = [
      /₹\s*(\d+)/,
      /(\d+)\s*rupees?/i,
      /received\s+₹?(\d+)/i,
      /(\d+)\s*received/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseInt(match[1]);
        if (amount > 0 && amount < 10000) { // Reasonable bounds
          return amount;
        }
      }
    }
    return null;
  }

  /**
   * Confirm transaction with selected products
   */
  async confirmTransaction(
    amount: number,
    selections: TransactionConfirmation[],
    transcription?: string
  ): Promise<void> {
    try {
      // Validate total amount matches
      const totalAmount = selections.reduce((sum, sel) => sum + (sel.quantity * sel.unitPrice), 0);
      
      if (Math.abs(totalAmount - amount) > 1) {
        throw new Error('Selected products total does not match transaction amount');
      }

      // Create transaction record
      for (const selection of selections) {
        const transaction: Omit<Transaction, 'id'> = {
          amount: selection.quantity * selection.unitPrice,
          productId: selection.productId,
          quantity: selection.quantity,
          type: 'upi',
          timestamp: new Date(),
          transcription
        };

        // Save transaction
        const transactionId = await simpleDb.addTransaction(transaction);

        // Update inventory
        const product = await simpleDb.getProductById(selection.productId);
        if (product) {
          const newStock = Math.max(0, product.stock - selection.quantity);
          await simpleDb.updateProductStock(selection.productId, newStock);
        }

        // Notify UI
        this.onTransactionConfirmed?.({ ...transaction, id: transactionId });
      }

    } catch (error) {
      console.error('Transaction confirmation failed:', error);
      this.onError?.('Failed to confirm transaction');
      throw error;
    }
  }

  /**
   * Manual transaction entry (fallback when audio fails)
   */
  async addManualTransaction(amount: number, type: 'upi' | 'cash' = 'cash'): Promise<TransactionFlowResult> {
    try {
      // Get product suggestions for manual entry
      const productSuggestions = await productSuggestionService.getSuggestions(amount, 3);

      const result: TransactionFlowResult = {
        amount,
        transcription: `Manual ${type} transaction: ₹${amount}`,
        confidence: 1.0,
        productSuggestions
      };

      this.onTransactionDetected?.(result);
      return result;

    } catch (error) {
      console.error('Manual transaction failed:', error);
      this.onError?.('Failed to process manual transaction');
      throw error;
    }
  }

  /**
   * Get today's transaction summary
   */
  async getTodaysSummary(): Promise<{
    totalRevenue: number;
    transactionCount: number;
    topProduct: string | null;
  }> {
    try {
      const transactions = await simpleDb.getTodaysTransactions();
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Find most sold product
      const productCounts = new Map<number, number>();
      transactions.forEach(t => {
        productCounts.set(t.productId, (productCounts.get(t.productId) || 0) + t.quantity);
      });

      let topProduct: string | null = null;
      if (productCounts.size > 0) {
        const topProductId = Array.from(productCounts.entries())
          .sort(([,a], [,b]) => b - a)[0][0];
        const product = await simpleDb.getProductById(topProductId);
        topProduct = product?.name || null;
      }

      return {
        totalRevenue,
        transactionCount: transactions.length,
        topProduct
      };

    } catch (error) {
      console.error('Failed to get today\'s summary:', error);
      return { totalRevenue: 0, transactionCount: 0, topProduct: null };
    }
  }
}

// Export singleton
export const transactionService = new SimpleTransactionService();
