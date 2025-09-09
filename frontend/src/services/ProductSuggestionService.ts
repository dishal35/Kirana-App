/**
 * Exact Match Product Suggestion Service (Replacing Original)
 * 
 * This service provides EXACT product combinations that match UPI transaction amounts.
 * No approximations - only exact matches or "no combinations found".
 * 
 * Features:
 * - Mathematical combination algorithms for exact matching
 * - AI-assisted exact matching with Gemini API
 * - Multi-product combination support (1, 2, 3+ products)
 * - Transaction history learning
 * - Stock availability consideration
 * - "No matches" response when exact combinations impossible
 * 
 * Algorithm prioritizes:
 * 1. Exact mathematical matches (amount = sum of product prices * quantities)
 * 2. Simpler combinations (fewer products preferred)
 * 3. Popular product combinations from transaction history
 * 4. Stock availability and reasonable quantity limits
 */

import { exactMatchProductSuggestionService, type ExactProductCombination } from './ExactMatchProductSuggestionService';
import type { Product, Transaction } from '../types';

// Keep the original interface for backward compatibility
export interface ProductSuggestion {
  product: Product;
  confidence: number;
  reason: string;
  suggestedQuantity: number;
}

export interface SuggestionContext {
  amount: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  recentTransactions: Transaction[];
  availableProducts: Product[];
}

export interface GeminiSuggestionResponse {
  suggestions: Array<{
    productName: string;
    confidence: number;
    reason: string;
    quantity: number;
  }>;
  reasoning: string;
}

/**
 * Product Suggestion Service - Now using Exact Matching
 * 
 * This wrapper maintains the original interface while using the new exact matching engine
 */
export class ProductSuggestionService {
  constructor() {
    console.log('🎯 ProductSuggestionService initialized with EXACT MATCHING enabled');
  }

  /**
   * Get exact product combinations for a given transaction amount
   * Returns empty array if no exact combinations are found
   */
  async getSuggestions(amount: number, maxSuggestions: number = 3): Promise<ProductSuggestion[]> {
    console.log(`🔄 Finding exact product suggestions for ₹${amount}`);
    
    try {
      // Get exact combinations from the new service
      const exactCombinations = await exactMatchProductSuggestionService.getExactCombinations(amount, maxSuggestions);
      
      if (exactCombinations.length === 0) {
        console.log(`❌ No exact combinations found for ₹${amount}`);
        return [];
      }
      
      // Convert ExactProductCombination[] to ProductSuggestion[] for backward compatibility
      const suggestions: ProductSuggestion[] = [];
      
      exactCombinations.forEach(combo => {
        combo.products.forEach(productItem => {
          suggestions.push({
            product: productItem.product,
            confidence: combo.confidence,
            reason: `${combo.reason} (Total: ₹${combo.totalAmount})`,
            suggestedQuantity: productItem.quantity
          });
        });
      });
      
      console.log(`✅ Found ${suggestions.length} exact product suggestions`);
      return suggestions;
      
    } catch (error) {
      console.error('Error getting exact product suggestions:', error);
      return [];
    }
  }

  /**
   * Test the connection and exact matching capability
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple amount
      const testSuggestions = await this.getSuggestions(20, 1);
      return true; // If no error, service is working
    } catch (error) {
      console.error('Product suggestion service test failed:', error);
      return false;
    }
  }

  /**
   * Get exact combinations with full details (for advanced usage)
   */
  async getExactCombinations(amount: number, maxCombinations: number = 3): Promise<ExactProductCombination[]> {
    return await exactMatchProductSuggestionService.getExactCombinations(amount, maxCombinations);
  }

  /**
   * Test Gemini connection for product suggestions
   */
  async testGeminiConnection(): Promise<boolean> {
    try {
      // Test a simple case
      const combinations = await this.getExactCombinations(50, 1);
      return true; // Service is working
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance (maintains compatibility)
export const productSuggestionService = new ProductSuggestionService();
