import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../config/env';
import type { Product, Transaction } from '../types';
import { productRepository, transactionRepository } from '../dbs/repo';

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

export class ProductSuggestionService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor() {
    try {
      const apiKey = getGeminiApiKey();
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.warn('Failed to initialize Gemini API for product suggestions:', error);
      // Service will fall back to rule-based suggestions
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Get product suggestions for a given transaction amount
   */
  async getSuggestions(amount: number, maxSuggestions: number = 3): Promise<ProductSuggestion[]> {
    try {
      // Build context for suggestions
      const context = await this.buildSuggestionContext(amount);
      
      // Try Gemini-powered suggestions first
      if (this.model) {
        try {
          const geminiSuggestions = await this.getGeminiSuggestions(context);
          if (geminiSuggestions.length > 0) {
            return geminiSuggestions.slice(0, maxSuggestions);
          }
        } catch (error) {
          console.warn('Gemini suggestions failed, falling back to rule-based:', error);
        }
      }

      // Fallback to rule-based suggestions
      return this.getFallbackSuggestions(context, maxSuggestions);
    } catch (error) {
      console.error('Error getting product suggestions:', error);
      return [];
    }
  }

  /**
   * Build context for product suggestions
   */
  private async buildSuggestionContext(amount: number): Promise<SuggestionContext> {
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = await transactionRepository.getTransactionsByDateRange(thirtyDaysAgo, now);

    // Get available products
    const availableProducts = await productRepository.getAll();

    return {
      amount,
      timeOfDay,
      dayOfWeek,
      recentTransactions,
      availableProducts: availableProducts.filter(p => p.stock > 0)
    };
  }

  /**
   * Get suggestions using Gemini API
   */
  private async getGeminiSuggestions(context: SuggestionContext): Promise<ProductSuggestion[]> {
    const prompt = this.buildGeminiPrompt(context);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseGeminiResponse(text, context.availableProducts);
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for Gemini API
   */
  private buildGeminiPrompt(context: SuggestionContext): string {
    const { amount, timeOfDay, dayOfWeek, recentTransactions, availableProducts } = context;

    // Analyze recent transaction patterns
    const transactionAnalysis = this.analyzeTransactionPatterns(recentTransactions, availableProducts);
    
    const prompt = `
You are an AI assistant helping a shopkeeper in India suggest products for a UPI transaction.

TRANSACTION CONTEXT:
- Amount received: ₹${amount}
- Time of day: ${timeOfDay}
- Day of week: ${dayOfWeek}

AVAILABLE PRODUCTS:
${availableProducts.map(p => 
  `- ${p.name}: ₹${p.price} (Stock: ${p.stock}, Category: ${p.category})`
).join('\n')}

RECENT SALES PATTERNS:
${transactionAnalysis}

TASK:
Suggest the most likely products for this ₹${amount} transaction. Consider:
1. Products that match or are close to the transaction amount
2. Popular items based on recent sales
3. Time-appropriate products (e.g., breakfast items in morning)
4. Typical Indian shopping patterns

Respond in this EXACT JSON format:
{
  "suggestions": [
    {
      "productName": "exact product name from available products",
      "confidence": 0.85,
      "reason": "brief explanation",
      "quantity": 1
    }
  ],
  "reasoning": "overall analysis of why these suggestions make sense"
}

Provide 1-3 suggestions, ordered by confidence (highest first).
Only suggest products from the available products list.
Confidence should be between 0.1 and 1.0.
`;

    return prompt;
  }

  /**
   * Analyze transaction patterns for context
   */
  private analyzeTransactionPatterns(transactions: Transaction[], products: Product[]): string {
    if (transactions.length === 0) {
      return "No recent transaction history available.";
    }

    // Create product lookup map
    const productMap = new Map(products.map(p => [p.id!, p]));

    // Analyze popular products
    const productSales = new Map<string, { count: number; totalAmount: number; product: Product }>();
    
    transactions.forEach(transaction => {
      transaction.products.forEach(item => {
        const product = productMap.get(item.productId);
        if (product) {
          const existing = productSales.get(item.productId) || { count: 0, totalAmount: 0, product };
          existing.count += item.quantity;
          existing.totalAmount += item.quantity * item.unitPrice;
          productSales.set(item.productId, existing);
        }
      });
    });

    // Get top 5 products by sales count
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topProducts.length === 0) {
      return "No product sales data available.";
    }

    return `Top selling products (last 30 days):
${topProducts.map((item, index) => 
  `${index + 1}. ${item.product.name}: ${item.count} units sold, ₹${item.totalAmount.toFixed(2)} revenue`
).join('\n')}`;
  }

  /**
   * Parse Gemini API response
   */
  private parseGeminiResponse(responseText: string, availableProducts: Product[]): ProductSuggestion[] {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed: GeminiSuggestionResponse = JSON.parse(jsonMatch[0]);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format');
      }

      // Map suggestions to products
      const productMap = new Map(availableProducts.map(p => [p.name.toLowerCase(), p]));
      
      return parsed.suggestions
        .map(suggestion => {
          const product = productMap.get(suggestion.productName.toLowerCase());
          if (!product) {
            return null;
          }

          return {
            product,
            confidence: Math.max(0.1, Math.min(1.0, suggestion.confidence)),
            reason: suggestion.reason || 'Gemini AI suggestion',
            suggestedQuantity: Math.max(1, Math.floor(suggestion.quantity || 1))
          };
        })
        .filter((suggestion): suggestion is ProductSuggestion => suggestion !== null)
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      throw new Error('Invalid Gemini response format');
    }
  }

  /**
   * Fallback rule-based suggestions when Gemini is unavailable
   */
  private getFallbackSuggestions(context: SuggestionContext, maxSuggestions: number): ProductSuggestion[] {
    const { amount, availableProducts, recentTransactions } = context;
    
    // Calculate product scores based on multiple factors
    const scoredProducts = availableProducts.map(product => {
      let score = 0;
      let reason = '';

      // Price matching (highest weight)
      const priceDiff = Math.abs(product.price - amount);
      const priceScore = Math.max(0, 1 - (priceDiff / amount));
      score += priceScore * 0.4;
      
      if (priceDiff <= product.price * 0.1) {
        reason = `Price matches transaction amount (₹${product.price})`;
      } else if (priceDiff <= amount * 0.2) {
        reason = `Price close to transaction amount`;
      }

      // Historical popularity
      const productSales = this.getProductSalesCount(product.id!, recentTransactions);
      const popularityScore = Math.min(1, productSales / 10); // Normalize to max 10 sales
      score += popularityScore * 0.3;
      
      if (productSales > 0 && !reason) {
        reason = `Popular item (${productSales} recent sales)`;
      }

      // Stock availability
      const stockScore = Math.min(1, product.stock / 10); // Normalize to max 10 stock
      score += stockScore * 0.2;

      // Time-based suggestions
      const timeScore = this.getTimeBasedScore(product, context.timeOfDay);
      score += timeScore * 0.1;
      
      if (timeScore > 0.5 && !reason) {
        reason = `Good for ${context.timeOfDay} time`;
      }

      if (!reason) {
        reason = 'Available product match';
      }

      // Calculate suggested quantity based on amount
      const suggestedQuantity = Math.max(1, Math.floor(amount / product.price));

      return {
        product,
        confidence: Math.max(0.1, Math.min(0.9, score)), // Cap fallback confidence at 0.9
        reason,
        suggestedQuantity: Math.min(suggestedQuantity, product.stock)
      };
    });

    // Sort by confidence and return top suggestions
    return scoredProducts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }

  /**
   * Get sales count for a specific product
   */
  private getProductSalesCount(productId: string, transactions: Transaction[]): number {
    return transactions.reduce((count, transaction) => {
      const productItem = transaction.products.find(item => item.productId === productId);
      return count + (productItem?.quantity || 0);
    }, 0);
  }

  /**
   * Get time-based scoring for products
   */
  private getTimeBasedScore(product: Product, timeOfDay: string): number {
    const category = product.category.toLowerCase();
    
    switch (timeOfDay) {
      case 'morning':
        if (category.includes('breakfast') || category.includes('tea') || category.includes('coffee') || 
            category.includes('milk') || category.includes('bread')) {
          return 0.8;
        }
        break;
      case 'afternoon':
        if (category.includes('lunch') || category.includes('snack') || category.includes('drink')) {
          return 0.7;
        }
        break;
      case 'evening':
        if (category.includes('snack') || category.includes('tea') || category.includes('biscuit')) {
          return 0.8;
        }
        break;
      case 'night':
        if (category.includes('dinner') || category.includes('rice') || category.includes('dal')) {
          return 0.7;
        }
        break;
    }
    
    return 0.3; // Default score for non-time-specific items
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Test the Gemini connection for product suggestions
   */
  async testGeminiConnection(): Promise<boolean> {
    if (!this.model) return false;
    
    try {
      const testPrompt = `
        Suggest a product for ₹50 transaction from these options:
        - Rice: ₹45
        - Tea: ₹20
        - Biscuits: ₹30
        
        Respond in JSON format with one suggestion.
      `;
      
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      return text.includes('Rice') || text.includes('Tea') || text.includes('Biscuits');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const productSuggestionService = new ProductSuggestionService();