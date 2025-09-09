/**
 * Debug tool to test Product Suggestions
 */

import { productSuggestionService } from '../services/ProductSuggestionService';
import { productRepository } from '../dbs/repo';
import { getGeminiApiKey } from '../config/env';

// Add to window for console testing
declare global {
  interface Window {
    debugProductSuggestions: typeof debugProductSuggestions;
  }
}

const debugProductSuggestions = {
  /**
   * Test product suggestions with detailed logging
   */
  async test(amount: number) {
    console.log(`🧪 Testing Product Suggestions for ₹${amount}`);
    console.log('==================================================');
    
    // Check if Gemini API key is available
    const hasApiKey = !!getGeminiApiKey();
    console.log(`🔑 Gemini API Key Available: ${hasApiKey}`);
    
    // Check available products
    const products = await productRepository.getAll();
    console.log(`📦 Available Products (${products.length}):`);
    products.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.name} - ₹${p.price} (Stock: ${p.stock}) [${p.category}]`);
    });
    
    // Test Gemini connection
    const geminiWorks = await productSuggestionService.testGeminiConnection();
    console.log(`🤖 Gemini Connection Test: ${geminiWorks ? '✅ Working' : '❌ Failed'}`);
    
    // Get suggestions
    console.log(`\n🎯 Getting suggestions for ₹${amount}...`);
    const suggestions = await productSuggestionService.getSuggestions(amount, 5);
    
    console.log(`\n📊 Received ${suggestions.length} suggestions:`);
    suggestions.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.product.name} (${s.suggestedQuantity}x)`);
      console.log(`     💰 ₹${s.product.price} x ${s.suggestedQuantity} = ₹${s.product.price * s.suggestedQuantity}`);
      console.log(`     🎯 Confidence: ${(s.confidence * 100).toFixed(1)}%`);
      console.log(`     💡 Reason: ${s.reason}`);
      console.log('');
    });
    
    return suggestions;
  },

  /**
   * Test with specific combinations
   */
  async testCombinations() {
    console.log('🔄 Testing Common Amount Combinations:');
    const testAmounts = [50, 75, 100, 120, 200];
    
    for (const amount of testAmounts) {
      console.log(`\n--- Testing ₹${amount} ---`);
      const suggestions = await productSuggestionService.getSuggestions(amount, 3);
      
      // Check if combinations are suggested
      let totalSuggestedValue = 0;
      suggestions.forEach(s => {
        totalSuggestedValue += s.product.price * s.suggestedQuantity;
      });
      
      console.log(`Total suggested value: ₹${totalSuggestedValue} vs ₹${amount}`);
      console.log(`Match accuracy: ${((1 - Math.abs(totalSuggestedValue - amount) / amount) * 100).toFixed(1)}%`);
    }
  },

  /**
   * Test with mock transaction history to see if it learns
   */
  async testLearningFromHistory() {
    console.log('📈 Testing Learning from Transaction History');
    
    // Check if there are any transactions
    const { transactionRepository } = await import('../dbs/repo');
    const allTransactions = await transactionRepository.getAll();
    
    console.log(`📊 Total transactions in history: ${allTransactions.length}`);
    
    if (allTransactions.length > 0) {
      // Analyze patterns
      const productFreq = new Map<string, number>();
      allTransactions.forEach(t => {
        t.products.forEach(p => {
          productFreq.set(p.productId, (productFreq.get(p.productId) || 0) + p.quantity);
        });
      });
      
      console.log('🔥 Most popular products:');
      Array.from(productFreq.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([productId, count], i) => {
          console.log(`  ${i+1}. Product ID ${productId}: ${count} units sold`);
        });
    } else {
      console.log('⚠️ No transaction history found - suggestions won\'t learn from patterns');
    }
  },

  /**
   * Test raw Gemini prompt and response
   */
  async testGeminiRaw(amount: number) {
    console.log(`🤖 Testing Raw Gemini Response for ₹${amount}`);
    
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = getGeminiApiKey();
      
      if (!apiKey) {
        console.log('❌ No API key available');
        return;
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const products = await productRepository.getAll();
      
      const prompt = `
You are an AI assistant helping a shopkeeper in India suggest products for a UPI transaction.

TRANSACTION CONTEXT:
- Amount received: ₹${amount}
- Time of day: evening
- Day of week: Friday

AVAILABLE PRODUCTS:
${products.map(p => 
  `- ${p.name}: ₹${p.price} (Stock: ${p.stock}, Category: ${p.category})`
).join('\n')}

TASK:
Suggest product combinations that total ₹${amount}. Consider:
1. MULTIPLE products that add up to the amount
2. Popular combinations (tea + biscuits, rice + dal, etc.)
3. Quantity adjustments to match the amount exactly

Respond in this EXACT JSON format:
{
  "suggestions": [
    {
      "productName": "exact product name",
      "confidence": 0.85,
      "reason": "brief explanation",
      "quantity": 2
    }
  ],
  "reasoning": "why these combinations make sense"
}

IMPORTANT: Suggest multiple products with quantities that add up to ₹${amount}. Don't just suggest single products.
      `;
      
      console.log('📤 Sending prompt to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('📥 Raw Gemini Response:');
      console.log(text);
      
      // Try to parse it
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Parsed JSON:', parsed);
        } catch (e) {
          console.log('❌ Failed to parse JSON:', e);
        }
      }
      
    } catch (error) {
      console.error('❌ Gemini test failed:', error);
    }
  }
};

// Make available globally
window.debugProductSuggestions = debugProductSuggestions;

export default debugProductSuggestions;
