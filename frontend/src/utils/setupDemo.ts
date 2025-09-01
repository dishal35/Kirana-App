import { SimpleDemoService } from '../services/SimpleDemoService';

/**
 * Setup simple demo environment with basic data
 */
export const setupSimpleDemo = async (): Promise<void> => {
  try {
    console.log('🚀 Setting up simple demo environment...');
    
    // Initialize demo shop with basic transactions
    await SimpleDemoService.initializeSimpleDemoShop();
    
    // Set demo mode in localStorage
    localStorage.setItem('kirana-demo-mode', 'true');
    localStorage.setItem('kirana-onboarding-complete', 'true');
    
    console.log('✅ Simple demo environment setup complete!');
    console.log('📊 Features available:');
    console.log('  • 10 Essential Products');
    console.log('  • 12 transactions across 3 days');
    console.log('  • Date navigation for historical data');
    console.log('  • Click-to-speak audio transaction entry');
    console.log('  • Account switching between Demo & New Shop');
    console.log('  • Add more transactions by speaking!');
    
  } catch (error) {
    console.error('❌ Failed to setup demo environment:', error);
    throw error;
  }
};

/**
 * Quick demo data verification
 */
export const verifyDemoData = async (): Promise<void> => {
  try {
    const today = new Date();
    const todayTransactions = await SimpleDemoService.getTransactionsForDate(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayTransactions = await SimpleDemoService.getTransactionsForDate(yesterday);
    
    console.log('📈 Simple Demo Data Summary:');
    console.log(`Today's Transactions: ${todayTransactions.length} (₹${todayTransactions.reduce((sum, t) => sum + t.amount, 0)})`);
    console.log(`Yesterday's Transactions: ${yesterdayTransactions.length} (₹${yesterdayTransactions.reduce((sum, t) => sum + t.amount, 0)})`);
    console.log('🎤 Try speaking: "You received 100 rupees on PhonePe" to add more!');
    
  } catch (error) {
    console.error('❌ Failed to verify demo data:', error);
  }
};

// Make functions available globally for testing
declare global {
  interface Window {
    setupSimpleDemo: () => Promise<void>;
    verifyDemoData: () => Promise<void>;
  }
}

window.setupSimpleDemo = setupSimpleDemo;
window.verifyDemoData = verifyDemoData;