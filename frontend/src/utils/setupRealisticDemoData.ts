/**
 * Setup Realistic Demo Data for Indian Kirana Store
 */

import { productRepository, shopRepository } from '../dbs/repo';
import type { Product, Shop } from '../types';

// Add to window for console testing
declare global {
  interface Window {
    setupRealisticDemoData: typeof setupRealisticDemoData;
  }
}

const setupRealisticDemoData = {
  /**
   * Create realistic products for a typical Indian kirana store
   */
  async createProducts() {
    console.log('🏪 Setting up realistic kirana store products...');
    
    // Clear existing products first
    const existingProducts = await productRepository.getAll();
    for (const product of existingProducts) {
      if (product.id) {
        await productRepository.delete(product.id);
      }
    }
    
    const products = [
      // Beverages & Tea
      { name: 'Tata Tea Gold', price: 25, stock: 50, reorderThreshold: 10, category: 'Beverages' },
      { name: 'Lipton Tea Bags', price: 35, stock: 30, reorderThreshold: 5, category: 'Beverages' },
      { name: 'Coffee Powder', price: 45, stock: 20, reorderThreshold: 5, category: 'Beverages' },
      { name: 'Bournvita', price: 180, stock: 15, reorderThreshold: 3, category: 'Beverages' },
      
      // Snacks & Biscuits  
      { name: 'Parle-G Biscuits', price: 10, stock: 100, reorderThreshold: 20, category: 'Snacks' },
      { name: 'Britannia Good Day', price: 20, stock: 60, reorderThreshold: 15, category: 'Snacks' },
      { name: 'Monaco Biscuits', price: 15, stock: 40, reorderThreshold: 10, category: 'Snacks' },
      { name: 'Kurkure', price: 20, stock: 50, reorderThreshold: 10, category: 'Snacks' },
      { name: 'Lays Chips', price: 30, stock: 30, reorderThreshold: 8, category: 'Snacks' },
      
      // Staples & Groceries
      { name: 'Basmati Rice 1kg', price: 120, stock: 25, reorderThreshold: 5, category: 'Groceries' },
      { name: 'Toor Dal 500g', price: 80, stock: 20, reorderThreshold: 5, category: 'Groceries' },
      { name: 'Wheat Flour 1kg', price: 45, stock: 30, reorderThreshold: 8, category: 'Groceries' },
      { name: 'Sugar 1kg', price: 55, stock: 25, reorderThreshold: 5, category: 'Groceries' },
      { name: 'Tata Salt', price: 25, stock: 40, reorderThreshold: 10, category: 'Groceries' },
      
      // Instant Food
      { name: 'Maggi Noodles', price: 15, stock: 80, reorderThreshold: 20, category: 'Instant Food' },
      { name: 'Yippee Noodles', price: 12, stock: 60, reorderThreshold: 15, category: 'Instant Food' },
      { name: 'MTR Ready Mix', price: 35, stock: 20, reorderThreshold: 5, category: 'Instant Food' },
      
      // Personal Care
      { name: 'Colgate Toothpaste', price: 85, stock: 25, reorderThreshold: 5, category: 'Personal Care' },
      { name: 'Lux Soap', price: 35, stock: 30, reorderThreshold: 8, category: 'Personal Care' },
      { name: 'Clinic Plus Shampoo', price: 95, stock: 15, reorderThreshold: 3, category: 'Personal Care' },
      
      // Dairy & Milk
      { name: 'Amul Milk 500ml', price: 30, stock: 40, reorderThreshold: 10, category: 'Dairy' },
      { name: 'Amul Butter', price: 55, stock: 20, reorderThreshold: 5, category: 'Dairy' },
      { name: 'Nestle Curd', price: 25, stock: 25, reorderThreshold: 8, category: 'Dairy' },
      
      // Household
      { name: 'Surf Excel', price: 135, stock: 15, reorderThreshold: 3, category: 'Household' },
      { name: 'Vim Dishwash', price: 45, stock: 20, reorderThreshold: 5, category: 'Household' },
      { name: 'Good Knight Coil', price: 25, stock: 35, reorderThreshold: 10, category: 'Household' }
    ];
    
    console.log(`📦 Creating ${products.length} products...`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        await productRepository.create(product);
        console.log(`✅ Created: ${product.name} - ₹${product.price}`);
      } catch (error) {
        console.error(`❌ Failed to create ${product.name}:`, error);
      }
    }
    
    console.log('🎉 All products created successfully!');
    return products;
  },

  /**
   * Create sample shop
   */
  async createShop() {
    console.log('🏪 Setting up demo shop...');
    
    // Clear existing shops
    const existingShops = await shopRepository.getAll();
    for (const shop of existingShops) {
      if (shop.id) {
        // Note: Add delete method if needed
        console.log('Existing shop found:', shop.name);
      }
    }
    
    const shopData = {
      name: 'Sharma General Store',
      type: 'General Store',
      ownerId: 'demo-owner',
      settings: {
        currency: 'INR' as const,
        language: 'en' as const,
        lowStockThreshold: 10,
        autoSuggestEnabled: true
      }
    };
    
    try {
      await shopRepository.create(shopData);
      console.log('✅ Demo shop created: Sharma General Store');
    } catch (error) {
      console.error('❌ Failed to create shop:', error);
    }
  },

  /**
   * Setup complete realistic demo
   */
  async setup() {
    console.log('🚀 Setting up complete realistic demo data...');
    console.log('==========================================');
    
    await this.createShop();
    await this.createProducts();
    
    console.log('✅ Demo setup complete! Refresh the page to see new products.');
    console.log('🧪 Now test again with: await window.debugProductSuggestions.test(50)');
  },

  /**
   * Test common transaction amounts with new products
   */
  async testCommonAmounts() {
    const testAmounts = [20, 35, 50, 75, 100, 150];
    
    console.log('💰 Testing common transaction amounts:');
    
    for (const amount of testAmounts) {
      console.log(`\n--- Testing ₹${amount} ---`);
      
      // Import at runtime to avoid circular dependency
      const { productSuggestionService } = await import('../services/ProductSuggestionService');
      const suggestions = await productSuggestionService.getSuggestions(amount, 3);
      
      console.log(`Suggestions received: ${suggestions.length}`);
      suggestions.forEach((s, i) => {
        const total = s.product.price * s.suggestedQuantity;
        console.log(`  ${i+1}. ${s.product.name} (${s.suggestedQuantity}x) = ₹${total} [${(s.confidence*100).toFixed(1)}%]`);
      });
    }
  }
};

// Make available globally
window.setupRealisticDemoData = setupRealisticDemoData;

export default setupRealisticDemoData;
