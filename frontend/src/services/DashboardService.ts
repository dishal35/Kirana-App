import { transactionRepository, productRepository } from '../dbs/repo';
import type { Transaction, Product } from '../types';

export interface DashboardMetrics {
  dailySales: {
    total: number;
    transactionCount: number;
    averageTransaction: number;
  };
  topSellingProduct: {
    product: Product | null;
    quantitySold: number;
    revenue: number;
  };
  lowStockAlerts: {
    count: number;
    products: Product[];
  };
  revenueChart: {
    dates: string[];
    amounts: number[];
  };
}

export interface TopSellingProductData {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export class DashboardService {
  /**
   * Get today's sales metrics
   */
  async getDailySalesMetrics(): Promise<DashboardMetrics['dailySales']> {
    const todaysTransactions = await transactionRepository.getTodaysTransactions();
    
    const total = todaysTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const transactionCount = todaysTransactions.length;
    const averageTransaction = transactionCount > 0 ? total / transactionCount : 0;

    return {
      total,
      transactionCount,
      averageTransaction
    };
  }

  /**
   * Get top selling product for today
   */
  async getTopSellingProduct(): Promise<DashboardMetrics['topSellingProduct']> {
    const todaysTransactions = await transactionRepository.getTodaysTransactions();
    const allProducts = await productRepository.getAll();
    
    // Create a map to track product sales
    const productSales = new Map<string, { quantitySold: number; revenue: number }>();
    
    // Calculate sales for each product (only for products that exist in catalog)
    todaysTransactions.forEach(transaction => {
      transaction.products.forEach(item => {
        // Only count sales for products that exist in the catalog
        const productExists = allProducts.find(p => p.id === item.productId);
        if (productExists) {
          const existing = productSales.get(item.productId) || { quantitySold: 0, revenue: 0 };
          productSales.set(item.productId, {
            quantitySold: existing.quantitySold + item.quantity,
            revenue: existing.revenue + (item.quantity * item.unitPrice)
          });
        }
      });
    });

    // Find the top selling product by quantity
    let topProductId: string | null = null;
    let maxQuantity = 0;
    let maxRevenue = 0;

    productSales.forEach((sales, productId) => {
      if (sales.quantitySold > maxQuantity) {
        maxQuantity = sales.quantitySold;
        maxRevenue = sales.revenue;
        topProductId = productId;
      }
    });

    // Get the product details
    const topProduct = topProductId ? allProducts.find(p => p.id === topProductId) || null : null;

    return {
      product: topProduct,
      quantitySold: maxQuantity,
      revenue: maxRevenue
    };
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<DashboardMetrics['lowStockAlerts']> {
    const lowStockProducts = await productRepository.getLowStockProducts();
    
    return {
      count: lowStockProducts.length,
      products: lowStockProducts
    };
  }

  /**
   * Get revenue chart data for the last 7 days
   */
  async getRevenueChart(days: number = 7): Promise<DashboardMetrics['revenueChart']> {
    const dates: string[] = [];
    const amounts: number[] = [];
    
    // Generate date range
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Get transactions for this day
      const dayTransactions = await transactionRepository.getTransactionsByDateRange(date, nextDate);
      const dayTotal = dayTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      dates.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
      amounts.push(dayTotal);
    }
    
    return { dates, amounts };
  }

  /**
   * Get all dashboard metrics at once
   */
  async getAllMetrics(): Promise<DashboardMetrics> {
    const [dailySales, topSellingProduct, lowStockAlerts, revenueChart] = await Promise.all([
      this.getDailySalesMetrics(),
      this.getTopSellingProduct(),
      this.getLowStockAlerts(),
      this.getRevenueChart()
    ]);

    return {
      dailySales,
      topSellingProduct,
      lowStockAlerts,
      revenueChart
    };
  }

  /**
   * Get detailed top selling products list
   */
  async getTopSellingProducts(limit: number = 5): Promise<TopSellingProductData[]> {
    const todaysTransactions = await transactionRepository.getTodaysTransactions();
    const allProducts = await productRepository.getAll();
    
    // Create a map to track product sales
    const productSales = new Map<string, { quantitySold: number; revenue: number }>();
    
    // Calculate sales for each product (only for products that exist in catalog)
    todaysTransactions.forEach(transaction => {
      transaction.products.forEach(item => {
        // Only count sales for products that exist in the catalog
        const productExists = allProducts.find(p => p.id === item.productId);
        if (productExists) {
          const existing = productSales.get(item.productId) || { quantitySold: 0, revenue: 0 };
          productSales.set(item.productId, {
            quantitySold: existing.quantitySold + item.quantity,
            revenue: existing.revenue + (item.quantity * item.unitPrice)
          });
        }
      });
    });

    // Convert to array and sort by quantity sold
    const topProducts: TopSellingProductData[] = [];
    
    productSales.forEach((sales, productId) => {
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        topProducts.push({
          productId,
          productName: product.name,
          quantitySold: sales.quantitySold,
          revenue: sales.revenue
        });
      }
    });

    // Sort by quantity sold (descending) and limit results
    return topProducts
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();