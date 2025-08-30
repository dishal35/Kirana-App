import { productRepository, transactionRepository, shopRepository } from '../dbs/repo';
import type { Product, Transaction } from '../types';

export interface DemoShopData {
  shopName: string;
  shopType: string;
  products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[];
  transactions: Omit<Transaction, 'id'>[];
}

export class DemoDataService {
  /**
   * Get comprehensive demo shop data with 25+ products
   */
  static getDemoShopData(): DemoShopData {
    return {
      shopName: "Sharma General Store",
      shopType: "General Store",
      products: [
        // Staples & Grains
        { name: 'Rice (1kg)', price: 45, stock: 25, category: 'Staples', reorderThreshold: 5 },
        { name: 'Wheat Flour (1kg)', price: 35, stock: 20, category: 'Staples', reorderThreshold: 5 },
        { name: 'Sugar (1kg)', price: 50, stock: 15, category: 'Staples', reorderThreshold: 3 },
        { name: 'Salt (1kg)', price: 20, stock: 30, category: 'Staples', reorderThreshold: 5 },
        { name: 'Toor Dal (500g)', price: 85, stock: 12, category: 'Staples', reorderThreshold: 3 },
        { name: 'Moong Dal (500g)', price: 90, stock: 10, category: 'Staples', reorderThreshold: 3 },
        
        // Beverages
        { name: 'Tea (250g)', price: 120, stock: 18, category: 'Beverages', reorderThreshold: 3 },
        { name: 'Coffee (200g)', price: 180, stock: 8, category: 'Beverages', reorderThreshold: 2 },
        { name: 'Milk (1L)', price: 55, stock: 12, category: 'Dairy', reorderThreshold: 5 },
        { name: 'Soft Drink (500ml)', price: 25, stock: 24, category: 'Beverages', reorderThreshold: 6 },
        { name: 'Mineral Water (1L)', price: 20, stock: 30, category: 'Beverages', reorderThreshold: 8 },
        
        // Snacks & Biscuits
        { name: 'Parle-G Biscuits', price: 10, stock: 40, category: 'Snacks', reorderThreshold: 10 },
        { name: 'Marie Biscuits', price: 15, stock: 25, category: 'Snacks', reorderThreshold: 8 },
        { name: 'Chips (50g)', price: 20, stock: 35, category: 'Snacks', reorderThreshold: 10 },
        { name: 'Namkeen (100g)', price: 30, stock: 20, category: 'Snacks', reorderThreshold: 5 },
        { name: 'Chocolate Bar', price: 45, stock: 15, category: 'Snacks', reorderThreshold: 5 },
        
        // Cooking Essentials
        { name: 'Cooking Oil (1L)', price: 120, stock: 15, category: 'Cooking', reorderThreshold: 3 },
        { name: 'Ghee (500ml)', price: 280, stock: 8, category: 'Cooking', reorderThreshold: 2 },
        { name: 'Turmeric Powder (100g)', price: 25, stock: 20, category: 'Spices', reorderThreshold: 5 },
        { name: 'Red Chili Powder (100g)', price: 30, stock: 18, category: 'Spices', reorderThreshold: 5 },
        { name: 'Garam Masala (50g)', price: 35, stock: 15, category: 'Spices', reorderThreshold: 3 },
        
        // Personal Care
        { name: 'Soap Bar', price: 25, stock: 30, category: 'Personal Care', reorderThreshold: 8 },
        { name: 'Shampoo (200ml)', price: 85, stock: 12, category: 'Personal Care', reorderThreshold: 3 },
        { name: 'Toothpaste (100g)', price: 45, stock: 20, category: 'Personal Care', reorderThreshold: 5 },
        { name: 'Toothbrush', price: 15, stock: 25, category: 'Personal Care', reorderThreshold: 8 },
        
        // Household Items
        { name: 'Detergent Powder (1kg)', price: 150, stock: 10, category: 'Household', reorderThreshold: 2 },
        { name: 'Dishwash Liquid (500ml)', price: 65, stock: 15, category: 'Household', reorderThreshold: 3 },
        { name: 'Toilet Paper (4 rolls)', price: 80, stock: 12, category: 'Household', reorderThreshold: 3 },
        { name: 'Matchbox', price: 5, stock: 50, category: 'Household', reorderThreshold: 15 },
        
        // Bakery & Fresh
        { name: 'Bread (400g)', price: 25, stock: 8, category: 'Bakery', reorderThreshold: 3 },
        { name: 'Eggs (12 pcs)', price: 60, stock: 15, category: 'Fresh', reorderThreshold: 5 },
        
        // Stationery
        { name: 'Notebook', price: 15, stock: 20, category: 'Stationery', reorderThreshold: 5 },
        { name: 'Pen', price: 10, stock: 30, category: 'Stationery', reorderThreshold: 10 },
      ],
      transactions: [
        // Recent transactions for the last 7 days
        {
          amount: 45,
          products: [{ productId: '1', quantity: 1, unitPrice: 45 }], // Rice
          type: 'upi',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          amount: 120,
          products: [{ productId: '7', quantity: 1, unitPrice: 120 }], // Tea
          type: 'upi',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 40,
          products: [{ productId: '12', quantity: 4, unitPrice: 10 }], // Parle-G
          type: 'cash',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          amount: 55,
          products: [{ productId: '9', quantity: 1, unitPrice: 55 }], // Milk
          type: 'upi',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 75,
          products: [
            { productId: '11', quantity: 2, unitPrice: 20 }, // Water
            { productId: '3', quantity: 1, unitPrice: 35 }   // Wheat flour
          ],
          type: 'upi',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
        {
          amount: 150,
          products: [{ productId: '26', quantity: 1, unitPrice: 150 }], // Detergent
          type: 'upi',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 85,
          products: [{ productId: '5', quantity: 1, unitPrice: 85 }], // Toor Dal
          type: 'cash',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        },
        {
          amount: 50,
          products: [
            { productId: '10', quantity: 2, unitPrice: 25 } // Soft drinks
          ],
          type: 'upi',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 95,
          products: [
            { productId: '22', quantity: 1, unitPrice: 25 }, // Soap
            { productId: '3', quantity: 2, unitPrice: 35 }   // Wheat flour
          ],
          type: 'upi',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          amount: 280,
          products: [{ productId: '18', quantity: 1, unitPrice: 280 }], // Ghee
          type: 'upi',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 60,
          products: [{ productId: '31', quantity: 1, unitPrice: 60 }], // Eggs
          type: 'cash',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        },
        {
          amount: 120,
          products: [{ productId: '17', quantity: 1, unitPrice: 120 }], // Cooking Oil
          type: 'upi',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        {
          amount: 90,
          products: [
            { productId: '24', quantity: 2, unitPrice: 45 } // Toothpaste
          ],
          type: 'upi',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
        {
          amount: 180,
          products: [{ productId: '8', quantity: 1, unitPrice: 180 }], // Coffee
          type: 'upi',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ]
    };
  }

  /**
   * Initialize demo shop with comprehensive data
   */
  static async initializeDemoShop(): Promise<void> {
    try {
      const demoData = this.getDemoShopData();

      // Create demo shop
      await shopRepository.create({
        name: demoData.shopName,
        type: demoData.shopType,
        ownerId: 'demo-user',
        settings: {
          currency: 'INR',
          language: 'en',
          lowStockThreshold: 5,
          autoSuggestEnabled: true
        }
      });

      // Create products and collect their IDs
      const productIds: string[] = [];
      for (const product of demoData.products) {
        const productId = await productRepository.create(product);
        productIds.push(productId);
      }

      // Create transactions with correct product IDs
      for (const transaction of demoData.transactions) {
        // Map the placeholder productIds to actual IDs
        const updatedProducts = transaction.products.map(item => ({
          ...item,
          productId: productIds[parseInt(item.productId) - 1] || productIds[0]
        }));

        await transactionRepository.create({
          ...transaction,
          products: updatedProducts
        });
      }

      console.log('Demo shop initialized successfully with', demoData.products.length, 'products and', demoData.transactions.length, 'transactions');
    } catch (error) {
      console.error('Failed to initialize demo shop:', error);
      throw error;
    }
  }

  /**
   * Check if demo data already exists
   */
  static async isDemoDataInitialized(): Promise<boolean> {
    try {
      const shops = await shopRepository.getAll();
      return shops.some(shop => shop.name === "Sharma General Store");
    } catch (error) {
      console.error('Failed to check demo data:', error);
      return false;
    }
  }

  /**
   * Clear all demo data
   */
  static async clearDemoData(): Promise<void> {
    try {
      // Note: This is a simple implementation. In a real app, you'd want more sophisticated cleanup
      const shops = await shopRepository.getAll();
      const demoShop = shops.find(shop => shop.name === "Sharma General Store");
      
      if (demoShop?.id) {
        // In a real implementation, you'd delete the shop and cascade delete related data
        console.log('Demo data cleanup would happen here');
      }
    } catch (error) {
      console.error('Failed to clear demo data:', error);
      throw error;
    }
  }

  /**
   * Get demo shop statistics
   */
  static async getDemoShopStats() {
    try {
      const products = await productRepository.getAll();
      const transactions = await transactionRepository.getAll();
      
      const totalProducts = products.length;
      const lowStockProducts = products.filter(p => p.stock <= p.reorderThreshold).length;
      const totalTransactions = transactions.length;
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      const categories = [...new Set(products.map(p => p.category))];
      const categoryStats = categories.map(category => ({
        category,
        count: products.filter(p => p.category === category).length,
        totalValue: products
          .filter(p => p.category === category)
          .reduce((sum, p) => sum + (p.price * p.stock), 0)
      }));

      return {
        totalProducts,
        lowStockProducts,
        totalTransactions,
        totalRevenue,
        categories: categoryStats,
        averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
      };
    } catch (error) {
      console.error('Failed to get demo shop stats:', error);
      return null;
    }
  }
}

export const demoDataService = new DemoDataService();