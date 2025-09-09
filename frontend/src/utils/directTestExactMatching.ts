/**
 * Direct test to verify exact matching is working in frontend
 */

// Add to window for console testing
declare global {
  interface Window {
    directTestExactMatching: typeof directTestExactMatching;
  }
}

const directTestExactMatching = {
  /**
   * Test exactly what the IntegratedTransactionService is doing
   */
  async testIntegratedService(amount: number = 200) {
    console.log(`🧪 Direct test of IntegratedTransactionService for ₹${amount}`);
    console.log('================================================================');
    
    try {
      // Import services directly
      const { productSuggestionService } = await import('../services/ProductSuggestionService');
      console.log('✅ ProductSuggestionService imported');
      
      // Test the service directly
      const suggestions = await productSuggestionService.getSuggestions(amount, 3);
      console.log(`📦 ProductSuggestionService returned: ${suggestions.length} suggestions`);
      
      if (suggestions.length > 0) {
        console.log('🔍 Suggestions details:');
        suggestions.forEach((s, i) => {
          const total = s.product.price * s.suggestedQuantity;
          console.log(`  ${i+1}. ${s.product.name} (${s.suggestedQuantity}x) = ₹${total}`);
          console.log(`     Reason: ${s.reason}`);
          console.log(`     Confidence: ${(s.confidence * 100).toFixed(1)}%`);
          
          // Check if this is exact matching
          if (total === amount) {
            console.log(`     ✅ EXACT MATCH for ₹${amount}`);
          } else {
            console.log(`     ❌ NOT exact match (₹${total} ≠ ₹${amount})`);
          }
        });
      } else {
        console.log('⚠️ No suggestions returned - this would be correct for exact matching if no combinations exist');
      }
      
      // Test if exact combinations exist for this amount
      const { exactMatchProductSuggestionService } = await import('../services/ExactMatchProductSuggestionService');
      const exactResults = await exactMatchProductSuggestionService.getExactCombinations(amount, 3);
      console.log(`🎯 ExactMatchService found: ${exactResults.length} exact combinations`);
      
      if (exactResults.length > 0) {
        console.log('✅ Exact combinations available:');
        exactResults.forEach((combo, i) => {
          console.log(`  ${i+1}. ${combo.products.map(p => `${p.quantity}x${p.product.name}`).join(' + ')} = ₹${combo.totalAmount}`);
        });
      }
      
      // Compare results
      if (suggestions.length > 0 && exactResults.length > 0) {
        console.log('❌ PROBLEM: ProductSuggestionService is NOT using exact matching!');
        console.log('   - ExactMatchService found exact combinations');
        console.log('   - But ProductSuggestionService returned non-exact suggestions');
      } else if (suggestions.length === 0 && exactResults.length === 0) {
        console.log('✅ CORRECT: Both services agree - no exact combinations for ₹' + amount);
      } else if (suggestions.length === 0 && exactResults.length > 0) {
        console.log('❌ PROBLEM: ExactMatchService found combinations but ProductSuggestionService returned none');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  },

  /**
   * Test the actual transaction simulation
   */
  async testTransactionSimulation(amount: number = 200) {
    console.log(`🎯 Testing transaction simulation for ₹${amount}`);
    console.log('=============================================');
    
    // Simulate what happens in the real app
    const event = new CustomEvent('upi-transaction', {
      detail: {
        amount: amount,
        transcription: `₹${amount} received on PhonePe`,
        confidence: 0.95
      }
    });
    
    console.log(`🚀 Dispatching UPI transaction event for ₹${amount}...`);
    window.dispatchEvent(event);
    
    console.log('👀 Check the modal that appears:');
    console.log('   - Does it show "Exact Matches Found!" in green header?');
    console.log('   - Do the suggested products total exactly ₹' + amount + '?');
    console.log('   - Or does it show approximate matches?');
  },

  /**
   * Check what version of ProductSuggestionService is actually loaded
   */
  async checkServiceVersion() {
    console.log('🔍 Checking which ProductSuggestionService is loaded...');
    console.log('====================================================');
    
    try {
      const { productSuggestionService } = await import('../services/ProductSuggestionService');
      
      // Check if it has exact matching methods
      const hasExactCombinations = typeof productSuggestionService.getExactCombinations === 'function';
      console.log(`${hasExactCombinations ? '✅' : '❌'} Has getExactCombinations method: ${hasExactCombinations}`);
      
      // Check constructor message
      console.log('🎯 Creating new instance to check constructor message...');
      const { ProductSuggestionService } = await import('../services/ProductSuggestionService');
      const testInstance = new ProductSuggestionService();
      
      // Test with a simple amount
      const testSuggestions = await testInstance.getSuggestions(50, 1);
      console.log(`📊 Test instance returned ${testSuggestions.length} suggestions for ₹50`);
      
      if (testSuggestions.length > 0) {
        const firstSuggestion = testSuggestions[0];
        console.log('First suggestion reason:', firstSuggestion.reason);
        
        if (firstSuggestion.reason.includes('exact match') || firstSuggestion.reason.includes('Total:')) {
          console.log('✅ Service is using exact matching logic');
        } else {
          console.log('❌ Service is using OLD approximate matching logic');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to check service version:', error);
    }
  }
};

// Make available globally
window.directTestExactMatching = directTestExactMatching;

export default directTestExactMatching;
