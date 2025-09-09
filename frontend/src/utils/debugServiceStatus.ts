/**
 * Debug tool to verify which services are loaded and working
 */

// Add to window for console testing
declare global {
  interface Window {
    debugServiceStatus: typeof debugServiceStatus;
  }
}

const debugServiceStatus = {
  /**
   * Check which services are available and their versions
   */
  async checkServices() {
    console.log('🔍 Checking Service Status...');
    console.log('================================');
    
    try {
      // Check ProductSuggestionService
      const { productSuggestionService } = await import('../services/ProductSuggestionService');
      console.log('✅ ProductSuggestionService: Loaded');
      
      // Test if it has the new exact matching methods
      const hasExactCombinations = typeof productSuggestionService.getExactCombinations === 'function';
      console.log(`${hasExactCombinations ? '✅' : '❌'} Has getExactCombinations method: ${hasExactCombinations}`);
      
      // Check ExactMatchProductSuggestionService  
      try {
        const { exactMatchProductSuggestionService } = await import('../services/ExactMatchProductSuggestionService');
        console.log('✅ ExactMatchProductSuggestionService: Loaded');
        
        // Test a simple call
        const testResult = await exactMatchProductSuggestionService.getExactCombinations(50, 1);
        console.log(`✅ Exact matching works: Found ${testResult.length} combinations for ₹50`);
        
      } catch (error) {
        console.log('❌ ExactMatchProductSuggestionService: Failed to load', error);
      }
      
      // Test the ProductSuggestionService with a known amount
      console.log('\n🧪 Testing ProductSuggestionService with ₹50...');
      const suggestions = await productSuggestionService.getSuggestions(50, 3);
      console.log(`Result: ${suggestions.length} suggestions found`);
      
      if (suggestions.length > 0) {
        console.log('First suggestion:', suggestions[0].product.name, `(${suggestions[0].suggestedQuantity}x ₹${suggestions[0].product.price})`);
        console.log('Reason:', suggestions[0].reason);
        
        // Check if this looks like exact matching
        const isExactMatching = suggestions[0].reason.includes('exact match') || suggestions[0].reason.includes('Total:');
        console.log(`${isExactMatching ? '✅' : '❌'} Using exact matching logic: ${isExactMatching}`);
      } else {
        console.log('⚠️ No suggestions found - this could be correct if no exact matches exist');
      }
      
    } catch (error) {
      console.error('❌ Error checking services:', error);
    }
    
    console.log('\n🔍 Browser Cache Status:');
    console.log('- Try: Ctrl+F5 (hard refresh)');
    console.log('- Or: Clear browser cache for this site');
    console.log('- Or: Open in incognito/private mode');
  },

  /**
   * Test the transaction flow end-to-end
   */
  async testTransactionFlow(amount: number = 50) {
    console.log(`🎯 Testing Transaction Flow for ₹${amount}...`);
    console.log('=========================================');
    
    try {
      // Import the transaction service
      const { IntegratedTransactionService } = await import('../services/IntegratedTransactionService');
      
      let transactionDetected = false;
      let detectedResult = null;
      
      const mockConfig = {
        onTransactionDetected: (result: any) => {
          transactionDetected = true;
          detectedResult = result;
          console.log('📦 Transaction detected:', result);
          console.log(`   Amount: ₹${result.amount}`);
          console.log(`   Suggested products: ${result.suggestedProducts?.length || 0}`);
          
          if (result.suggestedProducts && result.suggestedProducts.length > 0) {
            console.log('   Products:', result.suggestedProducts.map((p: any) => p.name));
          } else {
            console.log('   ⚠️ No suggested products (could be correct for no exact matches)');
          }
        },
        onError: (error: string) => {
          console.log('❌ Transaction error:', error);
        },
        onStatusChange: (status: string) => {
          console.log('📊 Status change:', status);
        },
        products: [],
        autoSuggestEnabled: true
      };
      
      const service = new IntegratedTransactionService(mockConfig);
      console.log('✅ IntegratedTransactionService created');
      
      // Simulate audio processing (without actually processing audio)
      console.log(`🎤 Simulating UPI transaction: "₹${amount} received on PhonePe"`);
      
      // We can't easily test the full audio flow here, but we can test the components
      console.log('✅ Transaction flow components are loaded');
      
    } catch (error) {
      console.error('❌ Error testing transaction flow:', error);
    }
  }
};

// Make available globally
window.debugServiceStatus = debugServiceStatus;

export default debugServiceStatus;
