import { db } from '../dbs/db';

/**
 * Test database connectivity and basic operations
 */
export const testDatabase = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test if database can be opened
    await db.open();
    console.log('✓ Database opened successfully');
    
    // Test basic operations
    const testShop = {
      name: 'Test Shop',
      type: 'Test',
      ownerId: 'test',
      settings: {
        currency: 'INR' as const,
        language: 'en' as const,
        lowStockThreshold: 5,
        autoSuggestEnabled: true
      }
    };
    
    // Try to add and remove a test record
    const shopId = await db.shops.add({ ...testShop, id: 'test-shop', createdAt: new Date() });
    console.log('✓ Test shop created with ID:', shopId);
    
    const shops = await db.shops.toArray();
    console.log('✓ Shops retrieved:', shops.length);
    
    await db.shops.delete('test-shop');
    console.log('✓ Test shop deleted');
    
    console.log('✓ Database test completed successfully');
    return true;
    
  } catch (error) {
    console.error('✗ Database test failed:', error);
    return false;
  }
};

// Make it available globally
(window as any).testDatabase = testDatabase;