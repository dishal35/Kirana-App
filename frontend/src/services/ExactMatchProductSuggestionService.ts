/**
 * Exact Match Product Suggestion Service
 * Finds product combinations that match transaction amount exactly
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../config/env';
import type { Product, Transaction } from '../types';
import { productRepository, transactionRepository } from '../dbs/repo';

export interface ExactProductCombination {
  products: Array<{
    product: Product;
    quantity: number;
  }>;
  totalAmount: number;
  confidence: number;
  reason: string;
  type: 'exact_match' | 'ai_suggested';
}

export class ExactMatchProductSuggestionService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor() {
    try {
      const apiKey = getGeminiApiKey();
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.warn('Failed to initialize Gemini API for exact matching:', error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Get exact match product combinations for a given amount
   */
  async getExactCombinations(amount: number, maxCombinations: number = 3): Promise<ExactProductCombination[]> {
    console.log(`🎯 Finding exact combinations for ₹${amount}`);
    
    try {
      const availableProducts = await productRepository.getAll();
      const inStockProducts = availableProducts.filter(p => p.stock > 0);
      
      console.log(`📦 Checking ${inStockProducts.length} products for combinations`);
      
      // Step 1: Find mathematical exact matches
      const exactMatches = this.findExactMathematicalCombinations(amount, inStockProducts, maxCombinations);
      
      // Step 2: If we have good exact matches, return them
      if (exactMatches.length > 0) {
        console.log(`✅ Found ${exactMatches.length} exact mathematical combinations`);
        return exactMatches;
      }
      
      // Step 3: Try AI-assisted exact matching
      if (this.model) {
        console.log(`🤖 Trying AI-assisted exact matching...`);
        const aiCombinations = await this.getAIExactCombinations(amount, inStockProducts);
        if (aiCombinations.length > 0) {
          return aiCombinations;
        }
      }
      
      // Step 4: No exact matches found
      console.log(`❌ No exact combinations found for ₹${amount}`);
      return [];
      
    } catch (error) {
      console.error('Error finding exact combinations:', error);
      return [];
    }
  }

  /**
   * Find exact mathematical combinations using algorithm
   */
  private findExactMathematicalCombinations(
    targetAmount: number, 
    products: Product[], 
    maxCombinations: number
  ): ExactProductCombination[] {
    const exactCombinations: ExactProductCombination[] = [];
    
    console.log(`🔢 Running mathematical combination search for ₹${targetAmount}`);
    
    // Try single products with quantity adjustments
    for (const product of products) {
      if (targetAmount % product.price === 0) {
        const quantity = targetAmount / product.price;
        if (quantity <= product.stock && quantity <= 10) { // Reasonable quantity limit
          exactCombinations.push({
            products: [{ product, quantity }],
            totalAmount: targetAmount,
            confidence: 0.95,
            reason: `${quantity}x ${product.name} = ₹${targetAmount} (exact match)`,
            type: 'exact_match'
          });
        }
      }
    }
    
    // Try 2-product combinations
    for (let i = 0; i < products.length && exactCombinations.length < maxCombinations; i++) {
      for (let j = i + 1; j < products.length && exactCombinations.length < maxCombinations; j++) {
        const product1 = products[i];
        const product2 = products[j];
        
        // Try different quantity combinations
        for (let q1 = 1; q1 <= Math.min(5, product1.stock); q1++) {
          for (let q2 = 1; q2 <= Math.min(5, product2.stock); q2++) {
            const total = (product1.price * q1) + (product2.price * q2);
            
            if (total === targetAmount) {
              exactCombinations.push({
                products: [
                  { product: product1, quantity: q1 },
                  { product: product2, quantity: q2 }
                ],
                totalAmount: targetAmount,
                confidence: 0.90,
                reason: `${q1}x ${product1.name} + ${q2}x ${product2.name} = ₹${targetAmount}`,
                type: 'exact_match'
              });
            }
          }
        }
      }
    }
    
    // Try 3-product combinations (limited to prevent performance issues)
    if (exactCombinations.length < maxCombinations && products.length >= 3) {
      for (let i = 0; i < Math.min(products.length, 10) && exactCombinations.length < maxCombinations; i++) {
        for (let j = i + 1; j < Math.min(products.length, 10) && exactCombinations.length < maxCombinations; j++) {
          for (let k = j + 1; k < Math.min(products.length, 10) && exactCombinations.length < maxCombinations; k++) {
            const product1 = products[i];
            const product2 = products[j];
            const product3 = products[k];
            
            // Try limited quantity combinations for 3 products
            for (let q1 = 1; q1 <= Math.min(3, product1.stock); q1++) {
              for (let q2 = 1; q2 <= Math.min(3, product2.stock); q2++) {
                for (let q3 = 1; q3 <= Math.min(3, product3.stock); q3++) {
                  const total = (product1.price * q1) + (product2.price * q2) + (product3.price * q3);
                  
                  if (total === targetAmount) {
                    exactCombinations.push({
                      products: [
                        { product: product1, quantity: q1 },
                        { product: product2, quantity: q2 },
                        { product: product3, quantity: q3 }
                      ],
                      totalAmount: targetAmount,
                      confidence: 0.85,
                      reason: `${q1}x ${product1.name} + ${q2}x ${product2.name} + ${q3}x ${product3.name} = ₹${targetAmount}`,
                      type: 'exact_match'
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Sort by confidence and preference (fewer products = better)
    return exactCombinations
      .sort((a, b) => {
        // First by confidence
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        // Then by fewer products (simpler combinations preferred)
        return a.products.length - b.products.length;
      })
      .slice(0, maxCombinations);
  }

  /**
   * Use AI to find exact combinations with context
   */
  private async getAIExactCombinations(
    targetAmount: number, 
    products: Product[]
  ): Promise<ExactProductCombination[]> {
    if (!this.model) return [];
    
    try {
      // Get transaction context
      const recentTransactions = await transactionRepository.getTransactionsByDateRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      );
      
      const prompt = this.buildExactMatchPrompt(targetAmount, products, recentTransactions);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 AI Response:', text);
      
      return this.parseAIExactResponse(text, products, targetAmount);
      
    } catch (error) {
      console.error('AI exact matching failed:', error);
      return [];
    }
  }

  /**
   * Build prompt for AI exact matching
   */
  private buildExactMatchPrompt(targetAmount: number, products: Product[], recentTransactions: Transaction[]): string {
    const popularProducts = this.getPopularProducts(recentTransactions, products);
    
    return `
You are a mathematician helping find EXACT product combinations for a ₹${targetAmount} UPI payment.

AVAILABLE PRODUCTS:
${products.map(p => 
  `- ${p.name}: ₹${p.price} (Stock: ${p.stock}) [${p.category}]`
).join('\n')}

POPULAR PRODUCTS (based on recent sales):
${popularProducts}

TASK: Find combinations where (price × quantity) totals EXACTLY ₹${targetAmount}

STRICT RULES:
1. Total must equal ₹${targetAmount} EXACTLY - no approximations
2. Only use products from the available list above
3. Quantities must not exceed stock levels
4. Maximum 10 units of any single product
5. Prefer simpler combinations (fewer products)
6. Consider popular Indian shopping patterns

Mathematical examples:
- If Tea = ₹25, then 2×Tea = ₹50 (exact match for ₹50)  
- If Biscuits = ₹10 and Tea = ₹25, then 1×Tea + 2×Biscuits + 1×Noodles(₹15) = ₹60 (exact match for ₹60)

Respond in EXACT JSON format:
{
  "exactCombinations": [
    {
      "products": [
        {"productName": "exact name", "quantity": 2}
      ],
      "totalAmount": ${targetAmount},
      "reasoning": "calculation explanation"
    }
  ]
}

If NO exact combinations are mathematically possible, respond:
{
  "exactCombinations": [],
  "message": "No exact combinations found for ₹${targetAmount}"
}

IMPORTANT: Only return combinations that total EXACTLY ₹${targetAmount}. Verify your math!
`;
  }

  /**
   * Parse AI response for exact combinations
   */
  private parseAIExactResponse(
    responseText: string, 
    products: Product[], 
    targetAmount: number
  ): ExactProductCombination[] {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.exactCombinations || parsed.exactCombinations.length === 0) {
        console.log('🤖 AI found no exact combinations');
        return [];
      }

      const productMap = new Map(products.map(p => [p.name.toLowerCase(), p]));
      const validCombinations: ExactProductCombination[] = [];

      for (const combo of parsed.exactCombinations) {
        const combinationProducts = [];
        let calculatedTotal = 0;

        for (const item of combo.products) {
          const product = productMap.get(item.productName.toLowerCase());
          if (product && item.quantity <= product.stock) {
            combinationProducts.push({
              product,
              quantity: item.quantity
            });
            calculatedTotal += product.price * item.quantity;
          }
        }

        // Verify it's an exact match
        if (calculatedTotal === targetAmount && combinationProducts.length > 0) {
          validCombinations.push({
            products: combinationProducts,
            totalAmount: calculatedTotal,
            confidence: 0.88,
            reason: combo.reasoning || `AI-suggested exact match: ₹${calculatedTotal}`,
            type: 'ai_suggested'
          });
        }
      }

      return validCombinations;

    } catch (error) {
      console.error('Failed to parse AI exact response:', error);
      return [];
    }
  }

  /**
   * Get popular products analysis
   */
  private getPopularProducts(transactions: Transaction[], products: Product[]): string {
    if (transactions.length === 0) return "No recent sales data available.";

    const productSales = new Map<string, number>();
    const productMap = new Map(products.map(p => [p.id!, p]));

    transactions.forEach(t => {
      t.products.forEach(item => {
        productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity);
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([id, count]) => ({ product: productMap.get(id), count }))
      .filter(item => item.product)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topProducts.length === 0) return "No popular products identified.";

    return topProducts.map((item, i) => 
      `${i + 1}. ${item.product!.name}: ${item.count} units sold (₹${item.product!.price} each)`
    ).join('\n');
  }
}

// Export singleton instance
export const exactMatchProductSuggestionService = new ExactMatchProductSuggestionService();
