/**
 * TransactionProcessor Service
 * 
 * Integrates audio transcription with amount extraction to process UPI transactions
 */

import { AmountExtractor, AmountExtractionResult } from './AmountExtractor';
import { GeminiTranscription } from './GeminiTranscription';
import type { TransactionResult, Product } from '../types';

export interface ProcessedTransaction {
  amount: number;
  confidence: number;
  platform: string;
  language: string;
  transcription: string;
  suggestedProducts: Product[];
  extractionResult: AmountExtractionResult;
}

export class TransactionProcessor {
  private amountExtractor: AmountExtractor;
  private geminiTranscription: GeminiTranscription;

  constructor() {
    this.amountExtractor = new AmountExtractor();
    this.geminiTranscription = new GeminiTranscription();
  }

  /**
   * Process audio blob to extract transaction information
   */
  async processAudioTransaction(
    audioBlob: Blob, 
    inventory: Product[] = [],
    minConfidence: number = 0.5
  ): Promise<ProcessedTransaction | null> {
    try {
      // Step 1: Transcribe audio using Gemini
      const transcriptionResult = await this.geminiTranscription.transcribeAudio(audioBlob);
      
      if (!transcriptionResult.success || !transcriptionResult.text) {
        console.warn('Failed to transcribe audio:', transcriptionResult.error);
        return null;
      }

      // Step 2: Extract amount from transcription
      const extractionResult = this.amountExtractor.extractAmount(transcriptionResult.text);
      
      // Step 3: Validate extraction meets confidence threshold
      if (!this.amountExtractor.validateExtraction(extractionResult, minConfidence)) {
        console.warn('Amount extraction failed validation:', extractionResult);
        return null;
      }

      // Step 4: Generate product suggestions based on amount
      const suggestedProducts = this.suggestProductsForAmount(
        extractionResult.amount!,
        inventory
      );

      return {
        amount: extractionResult.amount!,
        confidence: extractionResult.confidence,
        platform: extractionResult.platform,
        language: extractionResult.language,
        transcription: transcriptionResult.text,
        suggestedProducts,
        extractionResult
      };

    } catch (error) {
      console.error('Error processing audio transaction:', error);
      return null;
    }
  }

  /**
   * Process text transcription to extract transaction information
   */
  processTextTransaction(
    transcription: string,
    inventory: Product[] = [],
    minConfidence: number = 0.5
  ): ProcessedTransaction | null {
    try {
      // Extract amount from transcription
      const extractionResult = this.amountExtractor.extractAmount(transcription);
      
      // Validate extraction meets confidence threshold
      if (!this.amountExtractor.validateExtraction(extractionResult, minConfidence)) {
        console.warn('Amount extraction failed validation:', extractionResult);
        return null;
      }

      // Generate product suggestions based on amount
      const suggestedProducts = this.suggestProductsForAmount(
        extractionResult.amount!,
        inventory
      );

      return {
        amount: extractionResult.amount!,
        confidence: extractionResult.confidence,
        platform: extractionResult.platform,
        language: extractionResult.language,
        transcription,
        suggestedProducts,
        extractionResult
      };

    } catch (error) {
      console.error('Error processing text transaction:', error);
      return null;
    }
  }

  /**
   * Suggest products based on transaction amount and inventory
   */
  private suggestProductsForAmount(amount: number, inventory: Product[]): Product[] {
    if (!inventory || inventory.length === 0) {
      return [];
    }

    // Simple heuristic-based product suggestion
    // In a real implementation, this could use Gemini API for more intelligent suggestions
    
    // Find products with prices close to the transaction amount
    const suggestions: Array<{ product: Product; score: number }> = [];
    
    for (const product of inventory) {
      if (product.stock <= 0) continue; // Skip out-of-stock items
      
      const priceDiff = Math.abs(product.price - amount);
      const priceRatio = Math.min(product.price, amount) / Math.max(product.price, amount);
      
      // Score based on price similarity (higher score = better match)
      let score = 0;
      
      if (priceDiff === 0) {
        score = 1.0; // Exact match
      } else if (priceRatio >= 0.8) {
        score = 0.9; // Very close match
      } else if (priceRatio >= 0.6) {
        score = 0.7; // Good match
      } else if (priceRatio >= 0.4) {
        score = 0.5; // Fair match
      } else if (product.price <= amount) {
        // Product is cheaper than transaction amount - could be multiple items
        const quantity = Math.floor(amount / product.price);
        if (quantity <= 10) { // Reasonable quantity
          score = 0.6 - (priceDiff / amount) * 0.3;
        }
      }
      
      if (score > 0.3) { // Only include reasonable matches
        suggestions.push({ product, score });
      }
    }
    
    // Sort by score (highest first) and return top 5 suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.product);
  }

  /**
   * Get extraction statistics for debugging/monitoring
   */
  getExtractionStats(transcriptions: string[]): {
    totalProcessed: number;
    successfulExtractions: number;
    platformBreakdown: Record<string, number>;
    languageBreakdown: Record<string, number>;
    averageConfidence: number;
  } {
    const stats = {
      totalProcessed: transcriptions.length,
      successfulExtractions: 0,
      platformBreakdown: {} as Record<string, number>,
      languageBreakdown: {} as Record<string, number>,
      averageConfidence: 0
    };

    let totalConfidence = 0;

    for (const transcription of transcriptions) {
      const result = this.amountExtractor.extractAmount(transcription);
      
      if (result.amount !== null) {
        stats.successfulExtractions++;
        totalConfidence += result.confidence;
        
        // Track platform breakdown
        stats.platformBreakdown[result.platform] = 
          (stats.platformBreakdown[result.platform] || 0) + 1;
        
        // Track language breakdown
        stats.languageBreakdown[result.language] = 
          (stats.languageBreakdown[result.language] || 0) + 1;
      }
    }

    stats.averageConfidence = stats.successfulExtractions > 0 
      ? totalConfidence / stats.successfulExtractions 
      : 0;

    return stats;
  }

  /**
   * Validate transaction amount against business rules
   */
  validateTransactionAmount(amount: number): {
    isValid: boolean;
    reason?: string;
  } {
    if (amount < 1) {
      return { isValid: false, reason: 'Amount too small (minimum ₹1)' };
    }
    
    if (amount > 100000) {
      return { isValid: false, reason: 'Amount too large (maximum ₹1,00,000)' };
    }
    
    // Check for suspicious round numbers that might be false positives
    if (amount >= 1000 && amount % 1000 === 0 && amount <= 10000) {
      return { 
        isValid: true, 
        reason: 'Large round number - please verify manually' 
      };
    }
    
    return { isValid: true };
  }
}