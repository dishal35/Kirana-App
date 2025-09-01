import { db } from '../dbs/db';
import { shopRepository, productRepository, transactionRepository } from '../dbs/repo';
import type { Product, Transaction, Shop } from '../types';

export class MultiDayDemoService {
  /**
   * Initialize demo shop with multi-day transaction data
   */
  static async initializeDemoShop(): Promise<void> {
    try {
      // Clear existing data
      await db.transaction('rw', db.shops, db.products, db.transactions, db.inventoryAudit, db.stockAlerts, async () => {
        await db.shops.clear();
        await db.products.clear();
        await db.transactions.clear();
        await db.inventoryAudit.clear();
        await db.stockAlerts.clear();
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

      // Create demo products
      const products = await this.createDemoProducts();
      
      // Create multi-day transactions
      await this.createMultiDayTransactions(products);

      console.log('✅ Multi-day demo shop initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize multi-day demo shop:', error);
      throw error;
    }
  }

  /**
   * Create demo products with realistic inventory
   */
  private static async createDemoProducts(): Promise<Product[]> {
    const demoProducts = [
      // Groceries
      { name: 'Basmati Rice (1kg)', price: 120, stock: 25, category: 'Groceries', reorderThreshold: 5 },
      { name: 'Wheat Flour (1kg)', price: 45, stock: 30, category: 'Groceries', reorderThreshold: 8 },
      { name: 'Sugar (1kg)', price: 55, stock: 20, category: 'Groceries', reorderThreshold: 5 },
      { name: 'Cooking Oil (1L)', price: 180, stock: 15, category: 'Groceries', reorderThreshold: 3 },
      { name: 'Tea Powder (250g)', price: 85, stock: 40, category: 'Beverages', reorderThreshold: 10 },
      
      // Dairy & Beverages
      { name: 'Milk (1L)', price: 60, stock: 12, category: 'Dairy', reorderThreshold: 5, expiryDays: 3 },
      { name: 'Yogurt (500g)', price: 45, stock: 8, category: 'Dairy', reorderThreshold: 3, expiryDays: 5 },
      { name: 'Coca Cola (600ml)', price: 40, stock: 24, category: 'Beverages', reorderThreshold: 6 },
      { name: 'Mineral Water (1L)', price: 20, stock: 50, category: 'Beverages', reorderThreshold: 15 },
      
      // Snacks & Confectionery
      { name: 'Parle-G Biscuits', price: 25, stock: 35, category: 'Snacks', reorderThreshold: 10 },
      { name: 'Maggi Noodles', price: 15, stock: 45, category: 'Snacks', reorderThreshold: 15 },
      { name: 'Lays Chips', price: 20, stock: 28, category: 'Snacks', reorderThreshold: 8 },
      { name: 'Dairy Milk Chocolate', price: 35, stock: 20, category: 'Confectionery', reorderThreshold: 5 },
      
      // Personal Care
      { name: 'Colgate Toothpaste', price: 95, stock: 12, category: 'Personal Care', reorderThreshold: 3 },
      { name: 'Dove Soap', price: 65, stock: 18, category: 'Personal Care', reorderThreshold: 5 },
      { name: 'Head & Shoulders Shampoo', price: 180, stock: 8, category: 'Personal Care', reorderThreshold: 2 },
      
      // Household
      { name: 'Surf Excel Detergent', price: 150, stock: 10, category: 'Household', reorderThreshold: 3 },
      { name: 'Vim Dishwash', price: 75, stock: 15, category: 'Household', reorderThreshold: 4 },
      
      // Stationery
      { name: 'Notebook (200 pages)', price: 45, stock: 25, category: 'Stationery', reorderThreshold: 8 },
      { name: 'Ball Pen (Blue)', price: 10, stock: 50, category: 'Stationery', reorderThreshold: 20 },
      { name: 'Pencil Box', price: 85, stock: 12, category: 'Stationery', reorderThreshold: 3 }
    ];

    const products: Product[] = [];
    
    for (const productData of demoProducts) {
      const expiryDate = productData.expiryDays 
        ? new Date(Date.now() + productData.expiryDays * 24 * 60 * 60 * 1000)
        : undefined;

      const product: Product = {
        id: crypto.randomUUID(),
        name: productData.name,
        price: productData.price,
        stock: productData.stock,
        reorderThreshold: productData.reorderThreshold,
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
   * Create transactions across multiple days
   */
  private static async createMultiDayTransactions(products: Product[]): Promise<void> {
    const today = new Date();
    const daysToGenerate = 7; // Generate data for last 7 days

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const transactionDate = new Date(today);
      transactionDate.setDate(today.getDate() - dayOffset);
      
      // Generate different number of transactions per day
      const transactionCount = this.getTransactionCountForDay(dayOffset);
      
      for (let i = 0; i < transactionCount; i++) {
        await this.createRandomTransaction(products, transactionDate, i);
      }
    }
  }

  /**
   * Get realistic transaction count based on day
   */
  private static getTransactionCountForDay(dayOffset: number): number {
    if (dayOffset === 0) return 8; // Today - fewer transactions
    if (dayOffset === 1) return 15; // Yesterday - normal day
    if (dayOffset === 2) return 12; // 2 days ago
    if (dayOffset === 3) return 18; // 3 days ago - busy day
    if (dayOffset === 4) return 10; // 4 days ago
    if (dayOffset === 5) return 6;  // 5 days ago - slow day
    if (dayOffset === 6) return 14; // 6 days ago - weekend
    return 10; // Default
  }

  /**
   * Create a random transaction for a specific day
   */
  private static async createRandomTransaction(
    products: Product[], 
    date: Date, 
    transactionIndex: number
  ): Promise<void> {
    // Random transaction time during business hours (8 AM - 9 PM)
    const hour = 8 + Math.floor(Math.random() * 13);
    const minute = Math.floor(Math.random() * 60);
    const transactionTime = new Date(date);
    transactionTime.setHours(hour, minute, 0, 0);

    // Random number of products (1-4)
    const productCount = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = this.getRandomProducts(products, productCount);
    
    let totalAmount = 0;
    const transactionProducts = selectedProducts.map(product => {
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;
      
      return {
        productId: product.id!,
        quantity,
        unitPrice: product.price
      };
    });

    // Random payment type (80% UPI, 20% cash)
    const paymentType = Math.random() < 0.8 ? 'upi' : 'cash';
    
    // Generate realistic UPI transcription
    const transcription = paymentType === 'upi' 
      ? this.generateUPITranscription(totalAmount)
      : undefined;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount: totalAmount,
      products: transactionProducts,
      type: paymentType,
      timestamp: transactionTime,
      transcription,
      confidence: paymentType === 'upi' ? 0.85 + Math.random() * 0.15 : undefined
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
   * Generate realistic UPI transcription
   */
  private static generateUPITranscription(amount: number): string {
    const upiProviders = ['PhonePe', 'Google Pay', 'Paytm', 'BHIM UPI'];
    const provider = upiProviders[Math.floor(Math.random() * upiProviders.length)];
    
    const templates = [
      `You have received rupees ${amount} on ${provider} from customer`,
      `Payment of rupees ${amount} received via ${provider}`,
      `${provider} payment rupees ${amount} received successfully`,
      `Received ₹${amount} through ${provider} payment`,
      `UPI payment of ₹${amount} credited via ${provider}`
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
   * Get sales summary for a specific date
   */
  static async getSalesSummaryForDate(date: Date): Promise<{
    totalSales: number;
    totalTransactions: number;
    upiTransactions: number;
    cashTransactions: number;
    averageTransaction: number;
  }> {
    const transactions = await this.getTransactionsForDate(date);
    
    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = transactions.length;
    const upiTransactions = transactions.filter(t => t.type === 'upi').length;
    const cashTransactions = transactions.filter(t => t.type === 'cash').length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      totalSales,
      totalTransactions,
      upiTransactions,
      cashTransactions,
      averageTransaction
    };
  }

  /**
   * Get weekly sales data
   */
  static async getWeeklySalesData(): Promise<Array<{
    date: string;
    sales: number;
    transactions: number;
  }>> {
    const today = new Date();
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const summary = await this.getSalesSummaryForDate(date);
      
      weekData.push({
        date: date.toISOString().split('T')[0],
        sales: summary.totalSales,
        transactions: summary.totalTransactions
      });
    }

    return weekData;
  }
}