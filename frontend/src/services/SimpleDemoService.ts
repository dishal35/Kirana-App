import { db } from '../dbs/db';
import { shopRepository, productRepository, transactionRepository } from '../dbs/repo';
import type { Product, Transaction, Shop } from '../types';

export class SimpleDemoService {
  /**
   * Initialize simple demo shop with basic data
   */
  static async initializeSimpleDemoShop(): Promise<void> {
    try {
      // Clear existing data
      await db.transaction('rw', db.shops, db.products, db.transactions, async () => {
        await db.shops.clear();
        await db.products.clear();
        await db.transactions.clear();
      });

      // Create demo shop
      const shop: Shop = {
        id: 'demo-shop',
        name: 'Sharma General Store',
        type: 'General Store',
        ownerId: 'demo-user',
        createdAt: new Date(),
        settings: {
          currency: 'INR',
          language: 'en',
          lowStockThreshold: 5,
          autoSuggestEnabled: true
        }
      };

      await shopRepository.create(shop);

      // Create basic products
      const products = await this.createBasicProducts();
      
      // Create a few transactions across different days
      await this.createBasicTransactions(products);

      console.log('✅ Simple demo shop initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize simple demo shop:', error);
      throw error;
    }
  }

  /**
   * Create basic products for testing
   */
  private static async createBasicProducts(): Promise<Product[]> {
    const basicProducts = [
      // Essential items for testing
      { name: 'Basmati Rice (1kg)', price: 120, stock: 25, category: 'Groceries' },
      { name: 'Milk (1L)', price: 60, stock: 12, category: 'Dairy', expiryDays: 3 },
      { name: 'Bread', price: 30, stock: 15, category: 'Bakery', expiryDays: 2 },
      { name: 'Tea Powder (250g)', price: 85, stock: 20, category: 'Beverages' },
      { name: 'Sugar (1kg)', price: 55, stock: 18, category: 'Groceries' },
      { name: 'Cooking Oil (1L)', price: 180, stock: 8, category: 'Groceries' },
      { name: 'Parle-G Biscuits', price: 25, stock: 30, category: 'Snacks' },
      { name: 'Maggi Noodles', price: 15, stock: 40, category: 'Snacks' },
      { name: 'Coca Cola (600ml)', price: 40, stock: 20, category: 'Beverages' },
      { name: 'Colgate Toothpaste', price: 95, stock: 10, category: 'Personal Care' }
    ];

    const products: Product[] = [];
    
    for (const productData of basicProducts) {
      const expiryDate = productData.expiryDays 
        ? new Date(Date.now() + productData.expiryDays * 24 * 60 * 60 * 1000)
        : undefined;

      const product: Product = {
        id: crypto.randomUUID(),
        name: productData.name,
        price: productData.price,
        stock: productData.stock,
        reorderThreshold: 5,
        category: productData.category,
        expiryDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await productRepository.create(product);
      products.push(product);
    }

    return products;
  }

  /**
   * Create basic transactions across a few days
   */
  private static async createBasicTransactions(products: Product[]): Promise<void> {
    const today = new Date();
    
    // Create transactions for today, yesterday, and 2 days ago
    const transactionDays = [
      { offset: 0, count: 3 }, // Today - 3 transactions
      { offset: 1, count: 5 }, // Yesterday - 5 transactions  
      { offset: 2, count: 4 }  // 2 days ago - 4 transactions
    ];

    for (const day of transactionDays) {
      const transactionDate = new Date(today);
      transactionDate.setDate(today.getDate() - day.offset);
      
      for (let i = 0; i < day.count; i++) {
        await this.createSimpleTransaction(products, transactionDate, i);
      }
    }
  }

  /**
   * Create a simple transaction
   */
  private static async createSimpleTransaction(
    products: Product[], 
    date: Date, 
    index: number
  ): Promise<void> {
    // Random transaction time during business hours (9 AM - 7 PM)
    const hour = 9 + Math.floor(Math.random() * 10);
    const minute = Math.floor(Math.random() * 60);
    const transactionTime = new Date(date);
    transactionTime.setHours(hour, minute, 0, 0);

    // Select 1-2 random products
    const productCount = Math.floor(Math.random() * 2) + 1;
    const selectedProducts = this.getRandomProducts(products, productCount);
    
    let totalAmount = 0;
    const transactionProducts = selectedProducts.map(product => {
      const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 items
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;
      
      return {
        productId: product.id!,
        quantity,
        unitPrice: product.price
      };
    });

    // 70% UPI, 30% cash for variety
    const paymentType = Math.random() < 0.7 ? 'upi' : 'cash';
    
    // Generate UPI transcription if UPI payment
    const transcription = paymentType === 'upi' 
      ? this.generateSimpleUPITranscription(totalAmount)
      : undefined;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount: totalAmount,
      products: transactionProducts,
      type: paymentType,
      timestamp: transactionTime,
      transcription,
      confidence: paymentType === 'upi' ? 0.9 : undefined
    };

    await transactionRepository.create(transaction);
  }

  /**
   * Get random products from the list
   */
  private static getRandomProducts(products: Product[], count: number): Product[] {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Generate simple UPI transcription
   */
  private static generateSimpleUPITranscription(amount: number): string {
    const templates = [
      `You have received rupees ${amount} on PhonePe`,
      `Payment of rupees ${amount} received via Google Pay`,
      `UPI payment rupees ${amount} received successfully`,
      `Received ₹${amount} through PhonePe payment`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get transactions for a specific date
   */
  static async getTransactionsForDate(date: Date): Promise<Transaction[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const allTransactions = await transactionRepository.getAll();
    
    return allTransactions.filter(transaction => 
      transaction.timestamp >= startOfDay && transaction.timestamp <= endOfDay
    );
  }

  /**
   * Add a new transaction manually
   */
  static async addManualTransaction(
    amount: number, 
    transcription: string, 
    productSelections: { productId: string; quantity: number }[]
  ): Promise<void> {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount,
      products: productSelections.map(selection => ({
        productId: selection.productId,
        quantity: selection.quantity,
        unitPrice: amount / productSelections.reduce((sum, p) => sum + p.quantity, 0) // Simple average
      })),
      type: 'upi',
      timestamp: new Date(),
      transcription,
      confidence: 0.95
    };

    await transactionRepository.create(transaction);
    
    // Update inventory
    for (const selection of productSelections) {
      const product = await productRepository.getById(selection.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - selection.quantity);
        await productRepository.updateStock(selection.productId, newStock);
      }
    }
  }
}