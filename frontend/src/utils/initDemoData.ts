import { DemoDataService } from '../services/DemoDataService';

/**
 * Initialize demo data for testing purposes
 * This can be called from the browser console or used in development
 */
export const initDemoData = async () => {
  try {
    console.log('Initializing demo data...');
    
    // Check if demo data already exists
    const isInitialized = await DemoDataService.isDemoDataInitialized();
    
    if (isInitialized) {
      console.log('Demo data already exists');
      return;
    }
    
    // Initialize demo shop
    await DemoDataService.initializeDemoShop();
    
    console.log('Demo data initialized successfully!');
    
    // Get stats
    const stats = await DemoDataService.getDemoShopStats();
    console.log('Demo shop stats:', stats);
    
    // Reload the page to reflect changes
    window.location.reload();
    
  } catch (error) {
    console.error('Failed to initialize demo data:', error);
  }
};

// Make it available globally for console access
(window as any).initDemoData = initDemoData;