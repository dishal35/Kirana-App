// Database migration utilities for IndexedDB schema changes

import { db } from './db';
import type { Product, Transaction, Shop } from '../types';

export interface MigrationResult {
  success: boolean;
  error?: string;
  migratedRecords?: number;
}

// Initialize database with default data
export const initializeDatabase = async (): Promise<MigrationResult> => {
  try {
    // Check if database is already initialized
    const shopCount = await db.shops.count();
    
    if (shopCount > 0) {
      return { success: true, migratedRecords: 0 };
    }

    // Create default shop settings
    const defaultShop: Shop = {
      name: 'My Shop',
      type: 'General Store',
      ownerId: 'default-owner',
      createdAt: new Date(),
      settings: {
        currency: 'INR',
        language: 'en',
        lowStockThreshold: 5,
        autoSuggestEnabled: true
      }
    };

    await db.shops.add(defaultShop);

    return { success: true, migratedRecords: 1 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during initialization' 
    };
  }
};
//None of these functions are used in the app
// Clear all data (useful for testing and demo reset)
// export const clearAllData = async (): Promise<MigrationResult> => {
//   try {
//     await db.transaction('rw', [db.products, db.transactions, db.shops], async () => {
//       await db.products.clear();
//       await db.transactions.clear();
//       await db.shops.clear();
//     });

//     return { success: true, migratedRecords: 0 };
//   } catch (error) {
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : 'Failed to clear data' 
//     };
//   }
// };

// // Seed database with sample data for demo
// // export const seedDemoData = async (): Promise<MigrationResult> => {
// //   try {
// //     // Clear existing data first
// //     await clearAllData();

// //     let recordCount = 0;

// //     // Create demo shop
// //     const demoShop: Shop = {
// //       name: 'Raj General Store',
// //       type: 'General Store',
// //       ownerId: 'demo-owner',
// //       createdAt: new Date(),
// //       settings: {
// //         currency: 'INR',
// //         language: 'en',
// //         lowStockThreshold: 5,
// //         autoSuggestEnabled: true
// //       }
// //     };

// //     await db.shops.add(demoShop);
// //     recordCount++;

// //     // Create demo products
// //     const demoProducts: Product[] = [
// //       {
// //         name: 'Parle-G Biscuits',
// //         price: 10,
// //         stock: 50,
// //         reorderThreshold: 10,
// //         category: 'Snacks',
// //         createdAt: new Date(),
// //         updatedAt: new Date()
// //       },
// //       {
// //         name: 'Maggi Noodles',
// //         price: 15,
// //         stock: 30,
// //         reorderThreshold: 8,
// //         category: 'Instant Food',
// //         createdAt: new Date(),
// //         updatedAt: new Date()
// //       },
// //       {
// //         name: 'Tata Salt',
// //         price: 25,
// //         stock: 20,
// //         reorderThreshold: 5,
// //         category: 'Groceries',
// //         createdAt: new Date(),
// //         updatedAt: new Date()
// //       }
// //     ];

// //     const productIds = await db.products.bulkAdd(demoProducts, { allKeys: true });
// //     recordCount += demoProducts.length;

// //     // Create demo transactions
// //     const today = new Date();
// //     const yesterday = new Date(today);
// //     yesterday.setDate(yesterday.getDate() - 1);

// //     const demoTransactions: Transaction[] = [
// //       {
// //         amount: 30,
// //         products: [
// //           { productId: productIds[0].toString(), quantity: 2, unitPrice: 10 },
// //           { productId: productIds[1].toString(), quantity: 1, unitPrice: 15 }
// //         ],
// //         type: 'upi',
// //         timestamp: today,
// //         transcription: '₹30 received on PhonePe',
// //         confidence: 0.95
// //       },
// //       {
// //         amount: 25,
// //         products: [
// //           { productId: productIds[2].toString(), quantity: 1, unitPrice: 25 }
// //         ],
// //         type: 'cash',
// //         timestamp: yesterday
// //       }
// //     ];

// //     await db.transactions.bulkAdd(demoTransactions);
// //     recordCount += demoTransactions.length;

// //     return { success: true, migratedRecords: recordCount };
// //   } catch (error) {
// //     return { 
// //       success: false, 
// //       error: error instanceof Error ? error.message : 'Failed to seed demo data' 
// //     };
// //   }
// // };

// // Export data for backup
// export const exportData = async (): Promise<{ products: Product[], transactions: Transaction[], shops: Shop[] }> => {
//   const [products, transactions, shops] = await Promise.all([
//     db.products.toArray(),
//     db.transactions.toArray(),
//     db.shops.toArray()
//   ]);

//   return { products, transactions, shops };
// };

// // Import data from backup
// export const importData = async (data: { 
//   products: Product[], 
//   transactions: Transaction[], 
//   shops: Shop[] 
// }): Promise<MigrationResult> => {
//   try {
//     await db.transaction('rw', [db.products, db.transactions, db.shops], async () => {
//       // Clear existing data
//       await db.products.clear();
//       await db.transactions.clear();
//       await db.shops.clear();

//       // Import new data
//       await db.products.bulkAdd(data.products);
//       await db.transactions.bulkAdd(data.transactions);
//       await db.shops.bulkAdd(data.shops);
//     });

//     const totalRecords = data.products.length + data.transactions.length + data.shops.length;
//     return { success: true, migratedRecords: totalRecords };
//   } catch (error) {
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : 'Failed to import data' 
//     };
//   }
// };

// // Check database health and integrity
// export const checkDatabaseHealth = async (): Promise<{
//   isHealthy: boolean;
//   issues: string[];
//   stats: { products: number; transactions: number; shops: number };
// }> => {
//   const issues: string[] = [];

//   try {
//     const [productCount, transactionCount, shopCount] = await Promise.all([
//       db.products.count(),
//       db.transactions.count(),
//       db.shops.count()
//     ]);

//     // Check for orphaned transactions (transactions with invalid product IDs)
//     const transactions = await db.transactions.toArray();
//     const productIds = new Set((await db.products.toArray()).map(p => p.id?.toString()));

//     for (const transaction of transactions) {
//       for (const item of transaction.products) {
//         if (!productIds.has(item.productId)) {
//           issues.push(`Transaction ${transaction.id} references non-existent product ${item.productId}`);
//         }
//       }
//     }

//     // Check for products with negative stock
//     const negativeStockProducts = await db.products.where('stock').below(0).count();
//     if (negativeStockProducts > 0) {
//       issues.push(`${negativeStockProducts} products have negative stock`);
//     }

//     return {
//       isHealthy: issues.length === 0,
//       issues,
//       stats: { products: productCount, transactions: transactionCount, shops: shopCount }
//     };
//   } catch (error) {
//     return {
//       isHealthy: false,
//       issues: [error instanceof Error ? error.message : 'Database health check failed'],
//       stats: { products: 0, transactions: 0, shops: 0 }
//     };
//   }
// };