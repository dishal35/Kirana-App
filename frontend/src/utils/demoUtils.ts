import { hackathonDemoService } from '../services/HackathonDemoService';
import { DemoDataService } from '../services/DemoDataService';

/**
 * Demo utilities for console access during presentations
 */

// Make demo functions available globally for console access
declare global {
  interface Window {
    demoUtils: {
      initDemo: () => Promise<void>;
      runFullDemo: () => Promise<void>;
      resetDemo: () => Promise<void>;
      executeScenario: (scenarioId: string) => Promise<void>;
      getMetrics: () => any;
      getScenarios: () => any[];
      getScript: () => string;
      exitDemo: () => void;
      initDemoData: () => Promise<void>;
      getDemoStats: () => Promise<any>;
    };
  }
}

const demoUtils = {
  /**
   * Initialize demo mode
   */
  async initDemo() {
    try {
      console.log('🚀 Initializing demo mode...');
      await hackathonDemoService.initializeDemoMode();
      console.log('✅ Demo mode initialized successfully');
      return hackathonDemoService.getDemoMetrics();
    } catch (error) {
      console.error('❌ Failed to initialize demo:', error);
      throw error;
    }
  },

  /**
   * Run complete demo presentation
   */
  async runFullDemo() {
    try {
      console.log('🎬 Starting full demo presentation...');
      const metrics = await hackathonDemoService.runFullDemo();
      console.log('🎉 Demo completed successfully!');
      console.log('📊 Final metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  },

  /**
   * Reset demo data
   */
  async resetDemo() {
    try {
      console.log('🔄 Resetting demo data...');
      await hackathonDemoService.resetDemoData();
      console.log('✅ Demo data reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset demo:', error);
      throw error;
    }
  },

  /**
   * Execute specific scenario
   */
  async executeScenario(scenarioId: string) {
    try {
      console.log(`🎯 Executing scenario: ${scenarioId}`);
      const result = await hackathonDemoService.executeDemoScenario(scenarioId);
      
      if (result.success) {
        console.log(`✅ Scenario completed in ${result.performance.totalTime}ms`);
        console.log(`📊 Performance:`, result.performance);
      } else {
        console.error(`❌ Scenario failed:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to execute scenario:', error);
      throw error;
    }
  },

  /**
   * Get current demo metrics
   */
  getMetrics() {
    const metrics = hackathonDemoService.getDemoMetrics();
    const analytics = hackathonDemoService.getPerformanceAnalytics();
    
    console.log('📊 Demo Metrics:', metrics);
    if (analytics) {
      console.log('📈 Performance Analytics:', analytics);
    }
    
    return { metrics, analytics };
  },

  /**
   * Get available demo scenarios
   */
  getScenarios() {
    const scenarios = hackathonDemoService.getDemoScenarios();
    console.log('🎬 Available Scenarios:');
    scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.name} (${scenario.id})`);
      console.log(`   💰 Amount: ₹${scenario.expectedAmount}`);
      console.log(`   ⏱️ Duration: ~${scenario.duration}s`);
      console.log(`   🛍️ Products: ${scenario.suggestedProducts.join(', ')}`);
      console.log('');
    });
    return scenarios;
  },

  /**
   * Get demo presentation script
   */
  getScript() {
    const script = hackathonDemoService.getDemoScript();
    console.log('📝 Demo Script:');
    console.log(script);
    return script;
  },

  /**
   * Exit demo mode
   */
  exitDemo() {
    hackathonDemoService.exitDemoMode();
    console.log('🏁 Exited demo mode');
  },

  /**
   * Initialize demo data (legacy function)
   */
  async initDemoData() {
    try {
      console.log('📦 Initializing demo data...');
      
      const isInitialized = await DemoDataService.isDemoDataInitialized();
      if (isInitialized) {
        console.log('ℹ️ Demo data already exists');
        return;
      }
      
      await DemoDataService.initializeDemoShop();
      console.log('✅ Demo data initialized successfully!');
      
      const stats = await DemoDataService.getDemoShopStats();
      console.log('📊 Demo shop stats:', stats);
      
    } catch (error) {
      console.error('❌ Failed to initialize demo data:', error);
      throw error;
    }
  },

  /**
   * Get demo shop statistics
   */
  async getDemoStats() {
    try {
      const stats = await DemoDataService.getDemoShopStats();
      console.log('📊 Demo Shop Statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get demo stats:', error);
      throw error;
    }
  }
};

// Make utilities available globally
if (typeof window !== 'undefined') {
  window.demoUtils = demoUtils;
  
  // Also make individual functions available for convenience
  (window as any).initDemo = demoUtils.initDemo;
  (window as any).runFullDemo = demoUtils.runFullDemo;
  (window as any).resetDemo = demoUtils.resetDemo;
  (window as any).executeScenario = demoUtils.executeScenario;
  (window as any).getDemoMetrics = demoUtils.getMetrics;
  (window as any).getDemoScenarios = demoUtils.getScenarios;
  (window as any).getDemoScript = demoUtils.getScript;
  (window as any).exitDemo = demoUtils.exitDemo;
  
  console.log('🎯 Demo utilities loaded! Available commands:');
  console.log('• window.demoUtils.initDemo() - Initialize demo mode');
  console.log('• window.demoUtils.runFullDemo() - Run complete presentation');
  console.log('• window.demoUtils.executeScenario(id) - Execute specific scenario');
  console.log('• window.demoUtils.getScenarios() - List all scenarios');
  console.log('• window.demoUtils.getMetrics() - Show current metrics');
  console.log('• window.demoUtils.resetDemo() - Reset demo data');
  console.log('• window.demoUtils.getScript() - Show presentation script');
  console.log('• window.demoUtils.exitDemo() - Exit demo mode');
}

export default demoUtils;