/**
 * Enhanced Product Suggestion Service with Combination Logic
 * Focuses on multi-product combinations that match transaction amounts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../config/env';
import type { Product, Transaction } from '../types';
import { productRepository, transactionRepository } from '../dbs/repo';

export interface EnhancedProductSuggestion {
  products: Array<{
    product: Product;
    quantity: number;
  }>;
  totalAmount: number;
  confidence: number;
  reason: string;
  type: 'combination' | 'single' | 'quantity_adjusted';
}

export interface CombinationContext {
  amount: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  recentTransactions: Transaction[];
  availableProducts: Product[];
  popularCombinations: string[];
}

export class EnhancedProductSuggestionService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor() {
    try {
      const apiKey = getGeminiApiKey();
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.warn('Failed to initialize Gemini API for enhanced suggestions:', error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Get enhanced product suggestions with combinations
   */
  async getSuggestions(amount: number, maxSuggestions: number = 3): Promise<EnhancedProductSuggestion[]> {
    try {
      console.log(`🔄 Getting enhanced suggestions for ₹${amount}`);
