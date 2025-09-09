/**
 * Debug tool for exact match product suggestions
 */

import { exactMatchProductSuggestionService } from '../services/ExactMatchProductSuggestionService';
import { productRepository } from '../dbs/repo';

// Add to window for console testing
declare global {
  interface Window {
    debugExactMatching: typeof debugExactMatching;
  }
}

const debugExactMatching = {
  /**
   * Test exact matching for a specific amount
   */
  async test(amount: number) {
    console.log(`🎯 Testing EXACT matching for ₹${amount}`);
    console.log('===========================================');
    
    // Get all products for reference
    const products = await productRepository.getAll();
    console.log(`📦 Available products: ${products.length}`);
    
    // Find exact combinations
    const combinations = await exactMatchProductSuggestionService.getExactCombinations(amount, 5);
    
    if (combinations.length === 0) {
      console.log(`❌ NO EXACT COMBINATIONS FOUND for ₹${amount}`);
      console.log(`💡 This is correct behavior - only exact matches should be shown!`);
      return [];
    }
    
    console.log(`✅ Found ${combinations.length} exact combinations:`);
    console.log('');
    
    combinations.forEach((combo, i) => {
      console.log(`${i + 1}. COMBINATION (${combo.type}):`);
      
      let calculatedTotal = 0;
      combo.products.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        calculatedTotal += itemTotal;
        console.log(`   • ${item.quantity}x ${item.product.name} = ₹${itemTotal} (₹${item.product.price} each)`);
      });
      
      console.log(`   📊 TOTAL: ₹${calculatedTotal} ${calculatedTotal === amount ? '✅' : '❌'}`);
      console.log(`   🎯 Confidence: ${(combo.confidence * 100).toFixed(1)}%`);
      console.log(`   💡 Reason: ${combo.reason}`);
      console.log('');
    });
    
    return combinations;
  },

  /**
   * Test a range of amounts to see hit rate
   */
  async testRange(startAmount: number = 10, endAmount: number = 200, step: number = 5) {
    console.log(`📊 Testing exact matching for ₹${startAmount} to ₹${endAmount} (step: ₹${step})`);
    console.log('================================================================');
    
    const results = [];
    let foundCount = 0;
    let totalTests = 0;
    
    for (let amount = startAmount; amount <= endAmount; amount += step) {
      totalTests++;
      const combinations = await exactMatchProductSuggestionService.getExactCombinations(amount, 1);
      
      if (combinations.length > 0) {
        foundCount++;
        console.log(`✅ ₹${amount}: ${combinations.length} exact combination(s) found`);
        results.push({ amount, found: true, combinations: combinations.length });
      } else {
        console.log(`❌ ₹${amount}: No exact combinations`);
        results.push({ amount, found: false, combinations: 0 });
      }
    }
    
    console.log('');
    console.log(`📈 SUMMARY:`);
    console.log(`   Total amounts tested: ${totalTests}`);
    console.log(`   Exact matches found: ${foundCount}`);
    console.log(`   Hit rate: ${((foundCount / totalTests) * 100).toFixed(1)}%`);
    console.log('');
    
    // Show amounts with most combinations
    const withCombinations = results.filter(r => r.found).sort((a, b) => b.combinations - a.combinations);
    if (withCombinations.length > 0) {
      console.log(`🏆 Amounts with most combinations:`);
      withCombinations.slice(0, 10).forEach((r, i) => {
        console.log(`   ${i + 1}. ₹${r.amount}: ${r.combinations} combinations`);
      });
    }
    
    return results;
  },

  /**
   * Test specific common Indian transaction amounts
   */
  async testCommonAmounts() {
    const commonAmounts = [
      10, 15, 20, 25, 30, 35, 40, 45, 50, // Small purchases
      60, 75, 80, 100, 120, 150, 180, 200, // Medium purchases
      250, 300, 350, 400, 500 // Larger purchases
    ];
    
    console.log('💰 Testing common Indian transaction amounts:');
    console.log('=============================================');
    
    const successfulAmounts = [];
    
    for (const amount of commonAmounts) {
      console.log(`\n--- Testing ₹${amount} ---`);
      const combinations = await exactMatchProductSuggestionService.getExactCombinations(amount, 3);
      
      if (combinations.length > 0) {
        successfulAmounts.push(amount);
        console.log(`✅ ${combinations.length} exact combination(s):`);
        
        combinations.forEach((combo, i) => {
          const productSummary = combo.products.map(p => `${p.quantity}x${p.product.name}`).join(' + ');
          console.log(`   ${i + 1}. ${productSummary} = ₹${combo.totalAmount}`);
        });
      } else {
        console.log(`❌ No exact combinations found`);
      }
    }
    
    console.log(`\n🎯 EXACT MATCHES FOUND FOR: ₹${successfulAmounts.join(', ₹')}`);
    console.log(`📊 Success rate: ${successfulAmounts.length}/${commonAmounts.length} (${((successfulAmounts.length / commonAmounts.length) * 100).toFixed(1)}%)`);
    
    return successfulAmounts;
  },

  /**
   * Suggest what product prices to add for better coverage
   */
  async suggestProductsForBetterCoverage() {
    console.log('💡 Analyzing product price gaps and suggesting improvements...');
    
    const products = await productRepository.getAll();
    const prices = products.map(p => p.price).sort((a, b) => a - b);
    
    console.log(`Current product prices: ₹${prices.join(', ₹')}`);
    
    // Find gaps in common amounts
    const commonTargets = [10, 20, 30, 50, 75, 100, 150, 200];
    const suggestions = [];
    
    for (const target of commonTargets) {
      const combinations = await exactMatchProductSuggestionService.getExactCombinations(target, 1);
      if (combinations.length === 0) {
        // Suggest a product price that would enable this amount
        const suggestedPrice = target / 2; // Simple heuristic
        if (!prices.includes(suggestedPrice)) {
          suggestions.push(`Add product at ₹${suggestedPrice} to enable ₹${target} combinations`);
        }
      }
    }
    
    if (suggestions.length > 0) {
      console.log('\n📋 SUGGESTIONS for better coverage:');
      suggestions.forEach((s, i) => console.log(`${i + 1}. ${s}`));
    } else {
      console.log('\n✅ Good coverage for common amounts!');
    }
    
    return suggestions;
  }
};

// Make available globally
window.debugExactMatching = debugExactMatching;

export default debugExactMatching;
