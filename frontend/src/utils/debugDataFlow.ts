/**
 * Deep debug to trace data flow from service to modal
 */

// Add to window for console testing
declare global {
  interface Window {
    debugDataFlow: typeof debugDataFlow;
  }
}

const debugDataFlow = {
  /**
   * Intercept and log what the IntegratedTransactionService is actually sending
   */
  async interceptTransactionService() {
    console.log('🔍 Setting up IntegratedTransactionService interception...');
    
    try {
      // Import the service
      const { IntegratedTransactionService } = await import('../services/IntegratedTransactionService');
      
      // Override the processAudioTransaction method to log data
      const originalConstructor = IntegratedTransactionService.prototype.constructor;
      
      // We'll monkey-patch the onTransactionDetected callback instead
      console.log('✅ IntegratedTransactionService imported for debugging');
      
      // Create a test service to see what it produces
      let capturedResult: any = null;
      
      const testConfig = {
        onTransactionDetected: (result: any) => {
          capturedResult = result;
          console.log('📦 CAPTURED TransactionResult:', result);
          console.log('   Amount:', result.amount);
          console.log('   SuggestedProducts:', result.suggestedProducts?.length || 0);
          console.log('   SuggestedProductsWithQuantities:', result.suggestedProductsWithQuantities?.length || 0);
          
          if (result.suggestedProductsWithQuantities) {
            console.log('   🎯 Exact match data:', result.suggestedProductsWithQuantities);
          } else {
            console.log('   ❌ NO exact match data found');
          }
        },
        onError: (error: string) => console.log('❌ Error:', error),
        onStatusChange: (status: string) => console.log('📊 Status:', status),
        products: [],
        autoSuggestEnabled: true
      };
      
      const testService = new IntegratedTransactionService(testConfig);
      console.log('✅ Test service created');
      
      return { testService, getCapturedResult: () => capturedResult };
      
    } catch (error) {
      console.error('❌ Failed to set up interception:', error);
    }
  },

  /**
   * Check what the AppContext state actually contains
   */
  async checkAppContextState() {
    console.log('🔍 Checking AppContext state...');
    
    // This is tricky without React DevTools, but let's try to access the app state
    try {
      // Look for React elements in the DOM
      const appRoot = document.getElementById('root');
      if (appRoot) {
        console.log('✅ Found app root element');
        
        // Try to find React Fiber data (this might not work in production builds)
        const reactKey = Object.keys(appRoot).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'));
        if (reactKey) {
          console.log('✅ Found React internal data');
        } else {
          console.log('⚠️ No React internal data found (production build?)');
        }
      }
      
      console.log('💡 To check state, open React DevTools and look at AppContext');
      console.log('   Or add console.log statements to AppContext.tsx');
      
    } catch (error) {
      console.error('❌ Failed to check app context:', error);
    }
  },

  /**
   * Monitor the modal component directly
   */
  async monitorModal() {
    console.log('🔍 Setting up modal monitoring...');
    
    // We'll intercept the LazyComponents props
    try {
      const { TransactionConfirmationModal } = await import('../components/LazyComponents');
      console.log('✅ LazyComponents imported');
      
      console.log('💡 Modal monitoring setup - watch for console logs when modal opens');
      console.log('   Look for: "🎯 Auto-selecting exact match products"');
      
    } catch (error) {
      console.error('❌ Failed to monitor modal:', error);
    }
  },

  /**
   * Simulate transaction and trace all the way through
   */
  async traceFullFlow(amount: number = 200) {
    console.log(`🔄 Tracing full flow for ₹${amount}...`);
    console.log('============================================');
    
    // Step 1: Test the ProductSuggestionService directly
    console.log('1️⃣ Testing ProductSuggestionService...');
    try {
      const { productSuggestionService } = await import('../services/ProductSuggestionService');
      const suggestions = await productSuggestionService.getSuggestions(amount, 3);
      console.log(`   ✅ Got ${suggestions.length} suggestions from service`);
      
      if (suggestions.length > 0) {
        suggestions.forEach((s, i) => {
          console.log(`      ${i+1}. ${s.product.name} (${s.suggestedQuantity}x) = ₹${s.product.price * s.suggestedQuantity}`);
        });
      }
    } catch (error) {
      console.log('   ❌ ProductSuggestionService failed:', error);
    }
    
    // Step 2: Create a mock IntegratedTransactionService to see what it produces
    console.log('\n2️⃣ Testing IntegratedTransactionService...');
    const interceptResult = await this.interceptTransactionService();
    
    if (interceptResult) {
      // Simulate the transaction processing
      console.log('   🎯 Simulating audio transaction processing...');
      
      // We can't easily trigger the real audio flow, so let's create a mock transaction result
      const mockTransactionResult = {
        amount: amount,
        confidence: 0.95,
        transcription: `₹${amount} received on PhonePe`,
        suggestedProducts: [],
        suggestedProductsWithQuantities: []
      };
      
      // Trigger the onTransactionDetected callback
      setTimeout(() => {
        console.log('   📤 Triggering mock transaction...');
        // This would normally be called by the service
        // interceptResult.testService.config.onTransactionDetected(mockTransactionResult);
      }, 100);
    }
    
    // Step 3: Trigger the actual UI flow
    console.log('\n3️⃣ Triggering UI transaction...');
    const event = new CustomEvent('upi-transaction', {
      detail: {
        amount: amount,
        transcription: `₹${amount} received on PhonePe`,
        confidence: 0.95
      }
    });
    window.dispatchEvent(event);
    
    console.log('\n👀 Now watch the modal that appears and check:');
    console.log('   - Is the header green (exact matches) or blue (no matches)?');
    console.log('   - What products are auto-selected?');
    console.log('   - Do the quantities match the exact combinations?');
    console.log('\n🔍 Also check browser console for:');
    console.log('   - "🎯 Auto-selecting exact match products" logs');
    console.log('   - "📦 CAPTURED TransactionResult" logs');
  }
};

// Make available globally
window.debugDataFlow = debugDataFlow;

export default debugDataFlow;
