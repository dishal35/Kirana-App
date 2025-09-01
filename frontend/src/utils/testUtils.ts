/**
 * Testing utilities for manual verification of app functionality
 */

import { DemoDataService } from '../services/DemoDataService';
import { hackathonDemoService } from '../services/HackathonDemoService';
import { productRepository, transactionRepository, shopRepository } from '../dbs/repo';

// Make testing utilities available globally
declare global {
  interface Window {
    testUtils: {
      verifySetup: () => Promise<void>;
      simulateTransaction: (amount: number, description?: string) => void;
      checkAudioPermissions: () => Promise<boolean>;
      runHealthCheck: () => Promise<any>;
      clearAllData: () => Promise<void>;
      setupTestShop: () => Promise<void>;
    };
  }
}

const testUtils = {
  /**
   * Verify the application setup and core functionality
   */
  async verifySetup() {
    console.log('🔍 Running Application Setup Verification...\n');
    
    try {
      // Check database connectivity
      console.log('📊 Checking database...');
      const shops = await shopRepository.getAll();
      const products = await productRepository.getAll();
      const transactions = await transactionRepository.getAll();
      
      console.log(`✅ Database connected - ${shops.length} shops, ${products.length} products, ${transactions.length} transactions`);
      
      // Check if demo data exists
      const isDemoInitialized = await DemoDataService.isDemoDataInitialized();
      console.log(`${isDemoInitialized ? '✅' : '⚠️'} Demo data ${isDemoInitialized ? 'available' : 'not initialized'}`);
      
      // Check audio permissions
      const hasAudio = await this.checkAudioPermissions();
      console.log(`${hasAudio ? '✅' : '⚠️'} Audio permissions ${hasAudio ? 'granted' : 'not granted'}`);
      
      // Check demo service
      const demoActive = hackathonDemoService.isDemoModeActive();
      console.log(`${demoActive ? '✅' : 'ℹ️'} Demo mode ${demoActive ? 'active' : 'inactive'}`);
      
      console.log('\n🎉 Setup verification complete!');
      
    } catch (error) {
      console.error('❌ Setup verification failed:', error);
    }
  },

  /**
   * Simulate a UPI transaction for testing
   */
  simulateTransaction(amount: number, description: string = 'Test transaction') {
    console.log(`💰 Simulating transaction: ₹${amount} - ${description}`);
    
    const event = new CustomEvent('upi-transaction-detected', {
      detail: {
        amount,
        transcription: `You have received ₹${amount} via UPI - ${description}`,
        confidence: 0.95,
        timestamp: new Date(),
        type: 'upi'
      }
    });
    
    window.dispatchEvent(event);
    console.log('✅ Transaction event dispatched');
  },

  /**
   * Check microphone permissions
   */
  async checkAudioPermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('❌ Media devices not supported');
        return false;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.log('❌ Audio permission denied or not available');
      return false;
    }
  },

  /**
   * Run comprehensive health check
   */
  async runHealthCheck() {
    console.log('🏥 Running Health Check...\n');
    
    const results = {
      database: false,
      audio: false,
      localStorage: false,
      indexedDB: false,
      geminiAPI: false,
      performance: {}
    };
    
    try {
      // Database check
      const startDb = performance.now();
      await productRepository.getAll();
      results.database = true;
      results.performance.database = Math.round(performance.now() - startDb);
      
      // Audio check
      results.audio = await this.checkAudioPermissions();
      
      // Storage checks
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        results.localStorage = true;
      } catch (e) {
        results.localStorage = false;
      }
      
      try {
        // Test IndexedDB
        const request = indexedDB.open('test-db', 1);
        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase('test-db');
            resolve(true);
          };
          request.onerror = () => reject(false);
        });
        results.indexedDB = true;
      } catch (e) {
        results.indexedDB = false;
      }
      
      // Gemini API check (if key available)
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      results.geminiAPI = !!apiKey;
      
      console.log('📊 Health Check Results:');
      console.table(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return results;
    }
  },

  /**
   * Clear all application data
   */
  async clearAllData() {
    if (!confirm('⚠️ This will delete ALL data. Are you sure?')) {
      return;
    }
    
    try {
      console.log('🗑️ Clearing all data...');
      
      // Clear database
      const shops = await shopRepository.getAll();
      const products = await productRepository.getAll();
      const transactions = await transactionRepository.getAll();
      
      for (const transaction of transactions) {
        if (transaction.id) await transactionRepository.delete(transaction.id);
      }
      
      for (const product of products) {
        if (product.id) await productRepository.delete(product.id);
      }
      
      for (const shop of shops) {
        if (shop.id) await shopRepository.delete(shop.id);
      }
      
      // Clear localStorage
      localStorage.clear();
      
      console.log('✅ All data cleared. Refresh the page to restart.');
      
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  },

  /**
   * Force onboarding by clearing app state
   */
  async forceOnboarding() {
    try {
      console.log('🔄 Forcing onboarding mode...');
      
      // Clear all data to trigger first-time user flow
      await this.clearAllData();
      
      // Clear any cached state
      localStorage.removeItem('app-initialized');
      localStorage.removeItem('onboarding-complete');
      
      console.log('✅ Onboarding mode activated. Refresh the page to see onboarding.');
      
    } catch (error) {
      console.error('❌ Failed to force onboarding:', error);
    }
  },

  /**
   * Set up a test shop with sample data
   */
  async setupTestShop() {
    try {
      console.log('🏪 Setting up test shop...');
      
      // Create test shop
      const shopId = await shopRepository.create({
        name: 'Test Kirana Store',
        type: 'General Store',
        ownerId: 'test-user',
        settings: {
          currency: 'INR',
          language: 'en',
          lowStockThreshold: 5,
          autoSuggestEnabled: true
        }
      });
      
      // Add test products
      const testProducts = [
        { name: 'Rice (1kg)', price: 45, stock: 20, category: 'Staples', reorderThreshold: 5 },
        { name: 'Tea (250g)', price: 120, stock: 15, category: 'Beverages', reorderThreshold: 3 },
        { name: 'Biscuits', price: 15, stock: 30, category: 'Snacks', reorderThreshold: 8 },
        { name: 'Milk (1L)', price: 55, stock: 10, category: 'Dairy', reorderThreshold: 5 },
        { name: 'Soap', price: 25, stock: 25, category: 'Personal Care', reorderThreshold: 6 }
      ];
      
      for (const product of testProducts) {
        await productRepository.create(product);
      }
      
      console.log('✅ Test shop created with 5 products');
      console.log('🔄 Refresh the page to see the new shop');
      
    } catch (error) {
      console.error('❌ Failed to setup test shop:', error);
    }
  }
};

// Make utilities available globally
if (typeof window !== 'undefined') {
  window.testUtils = testUtils;
  
  console.log('🧪 Test utilities loaded! Available commands:');
  console.log('• window.testUtils.verifySetup() - Check app setup');
  console.log('• window.testUtils.simulateTransaction(50) - Simulate ₹50 transaction');
  console.log('• window.testUtils.checkAudioPermissions() - Test microphone');
  console.log('• window.testUtils.runHealthCheck() - Full system check');
  console.log('• window.testUtils.clearAllData() - Reset everything');
  console.log('• window.testUtils.forceOnboarding() - Force onboarding mode');
  console.log('• window.testUtils.setupTestShop() - Create test shop');
  
  // Also make individual functions available for convenience
  (window as any).forceOnboarding = testUtils.forceOnboarding;
  (window as any).setupDemoShop = async () => {
    console.log('🏪 Setting up demo shop...');
    await DemoDataService.initializeDemoShop();
    console.log('✅ Demo shop ready! Refresh the page.');
  };
}

export default testUtils;