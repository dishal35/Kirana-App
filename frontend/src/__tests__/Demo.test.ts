import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hackathonDemoService } from '../services/HackathonDemoService';
import { DemoDataService } from '../services/DemoDataService';

// Mock the repositories
vi.mock('../dbs/repo', () => ({
  productRepository: {
    create: vi.fn().mockResolvedValue('mock-product-id'),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  transactionRepository: {
    create: vi.fn().mockResolvedValue('mock-transaction-id'),
    getAll: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  shopRepository: {
    create: vi.fn().mockResolvedValue('mock-shop-id'),
    getAll: vi.fn().mockResolvedValue([])
  }
}));

describe('HackathonDemoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset demo service state
    hackathonDemoService.exitDemoMode();
  });

  describe('Demo Scenarios', () => {
    it('should provide predefined demo scenarios', () => {
      const scenarios = hackathonDemoService.getDemoScenarios();
      
      expect(scenarios).toHaveLength(5);
      expect(scenarios[0]).toMatchObject({
        id: 'scenario_1',
        name: 'Tea Purchase - ₹20',
        expectedAmount: 20,
        suggestedProducts: ['Tea (250g)']
      });
    });

    it('should have realistic demo scenarios with proper structure', () => {
      const scenarios = hackathonDemoService.getDemoScenarios();
      
      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('id');
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('audioBlob');
        expect(scenario).toHaveProperty('expectedAmount');
        expect(scenario).toHaveProperty('expectedTranscription');
        expect(scenario).toHaveProperty('suggestedProducts');
        expect(scenario).toHaveProperty('duration');
        
        expect(scenario.expectedAmount).toBeGreaterThan(0);
        expect(scenario.suggestedProducts).toBeInstanceOf(Array);
        expect(scenario.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Demo Mode Management', () => {
    it('should initialize demo mode successfully', async () => {
      expect(hackathonDemoService.isDemoModeActive()).toBe(false);
      
      await hackathonDemoService.initializeDemoMode();
      
      expect(hackathonDemoService.isDemoModeActive()).toBe(true);
      
      const metrics = hackathonDemoService.getDemoMetrics();
      expect(metrics.totalScenarios).toBe(5);
      expect(metrics.scenariosCompleted).toBe(0);
    });

    it('should exit demo mode properly', async () => {
      await hackathonDemoService.initializeDemoMode();
      expect(hackathonDemoService.isDemoModeActive()).toBe(true);
      
      hackathonDemoService.exitDemoMode();
      expect(hackathonDemoService.isDemoModeActive()).toBe(false);
    });
  });

  describe('Scenario Execution', () => {
    beforeEach(async () => {
      await hackathonDemoService.initializeDemoMode();
    });

    it('should execute individual scenarios successfully', async () => {
      const result = await hackathonDemoService.executeDemoScenario('scenario_1');
      
      expect(result.success).toBe(true);
      expect(result.performance).toHaveProperty('transcriptionTime');
      expect(result.performance).toHaveProperty('suggestionTime');
      expect(result.performance).toHaveProperty('confirmationTime');
      expect(result.performance).toHaveProperty('totalTime');
      expect(result.performance).toHaveProperty('accuracy');
      
      expect(result.performance.totalTime).toBeGreaterThan(0);
      expect(result.performance.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.performance.accuracy).toBeLessThanOrEqual(1);
    });

    it('should handle invalid scenario IDs', async () => {
      await expect(
        hackathonDemoService.executeDemoScenario('invalid-scenario')
      ).rejects.toThrow('Demo scenario invalid-scenario not found');
    });

    it('should update metrics after scenario execution', async () => {
      const initialMetrics = hackathonDemoService.getDemoMetrics();
      expect(initialMetrics.scenariosCompleted).toBe(0);
      
      await hackathonDemoService.executeDemoScenario('scenario_1');
      
      const updatedMetrics = hackathonDemoService.getDemoMetrics();
      expect(updatedMetrics.scenariosCompleted).toBe(1);
      expect(updatedMetrics.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Full Demo Execution', () => {
    it('should run complete demo presentation', async () => {
      const finalMetrics = await hackathonDemoService.runFullDemo();
      
      expect(finalMetrics.scenariosCompleted).toBe(5);
      expect(finalMetrics.totalScenarios).toBe(5);
      expect(finalMetrics.endTime).toBeDefined();
      expect(finalMetrics.averageProcessingTime).toBeGreaterThan(0);
      expect(finalMetrics.successRate).toBeGreaterThanOrEqual(0);
    }, 30000); // Increase timeout for full demo
  });

  describe('Performance Analytics', () => {
    beforeEach(async () => {
      await hackathonDemoService.initializeDemoMode();
    });

    it('should provide performance analytics after scenarios', async () => {
      // Execute a few scenarios
      await hackathonDemoService.executeDemoScenario('scenario_1');
      await hackathonDemoService.executeDemoScenario('scenario_2');
      
      const analytics = hackathonDemoService.getPerformanceAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics?.totalScenarios).toBe(2);
      expect(analytics?.averageTranscriptionTime).toBeGreaterThan(0);
      expect(analytics?.averageSuggestionTime).toBeGreaterThan(0);
      expect(analytics?.averageTotalTime).toBeGreaterThan(0);
      expect(analytics?.averageAccuracy).toBeGreaterThanOrEqual(0);
      expect(analytics?.averageAccuracy).toBeLessThanOrEqual(100);
    }, 10000); // Increase timeout to 10 seconds

    it('should return null analytics when no scenarios executed', () => {
      const analytics = hackathonDemoService.getPerformanceAnalytics();
      expect(analytics).toBeNull();
    });
  });

  describe('Demo Data Reset', () => {
    it('should reset demo data successfully', async () => {
      // Start fresh
      hackathonDemoService.exitDemoMode();
      
      await hackathonDemoService.initializeDemoMode();
      await hackathonDemoService.executeDemoScenario('scenario_1');
      
      const metricsBeforeReset = hackathonDemoService.getDemoMetrics();
      expect(metricsBeforeReset.scenariosCompleted).toBe(1);
      
      await hackathonDemoService.resetDemoData();
      
      const metricsAfterReset = hackathonDemoService.getDemoMetrics();
      expect(metricsAfterReset.scenariosCompleted).toBe(0);
    });
  });

  describe('Demo Script', () => {
    it('should provide comprehensive demo script', () => {
      const script = hackathonDemoService.getDemoScript();
      
      expect(script).toContain('Hackathon Demo Script');
      expect(script).toContain('Introduction');
      expect(script).toContain('Live Demo Scenarios');
      expect(script).toContain('Performance Metrics');
      expect(script).toContain('Total Demo Time');
      
      // Should contain all scenario references
      expect(script).toContain('Tea Purchase');
      expect(script).toContain('Mixed Items');
      expect(script).toContain('Hindi Support');
    });
  });
});

describe('DemoDataService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Demo Shop Data', () => {
    it('should provide comprehensive demo shop data', () => {
      const demoData = DemoDataService.getDemoShopData();
      
      expect(demoData.shopName).toBe('Sharma General Store');
      expect(demoData.shopType).toBe('General Store');
      expect(demoData.products).toHaveLength(33); // 30+ products as specified
      expect(demoData.transactions).toHaveLength(14); // Sample transactions
    });

    it('should have realistic product data', () => {
      const demoData = DemoDataService.getDemoShopData();
      
      demoData.products.forEach(product => {
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('stock');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('reorderThreshold');
        
        expect(product.price).toBeGreaterThan(0);
        expect(product.stock).toBeGreaterThanOrEqual(0);
        expect(product.reorderThreshold).toBeGreaterThan(0);
      });
    });

    it('should have realistic transaction data', () => {
      const demoData = DemoDataService.getDemoShopData();
      
      demoData.transactions.forEach(transaction => {
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('products');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('timestamp');
        
        expect(transaction.amount).toBeGreaterThan(0);
        expect(transaction.products).toBeInstanceOf(Array);
        expect(transaction.products.length).toBeGreaterThan(0);
        expect(['upi', 'cash']).toContain(transaction.type);
      });
    });
  });

  describe('Demo Shop Statistics', () => {
    it('should calculate demo shop statistics correctly', async () => {
      // Mock repository responses
      const mockProducts = [
        { id: '1', name: 'Rice', price: 45, stock: 25, category: 'Staples', reorderThreshold: 5 },
        { id: '2', name: 'Tea', price: 120, stock: 2, category: 'Beverages', reorderThreshold: 3 }
      ];
      const mockTransactions = [
        { id: '1', amount: 45, products: [], type: 'upi', timestamp: new Date() },
        { id: '2', amount: 120, products: [], type: 'cash', timestamp: new Date() }
      ];

      const { productRepository, transactionRepository } = await import('../dbs/repo');
      vi.mocked(productRepository.getAll).mockResolvedValue(mockProducts as any);
      vi.mocked(transactionRepository.getAll).mockResolvedValue(mockTransactions as any);

      const stats = await DemoDataService.getDemoShopStats();
      
      expect(stats).toBeDefined();
      expect(stats?.totalProducts).toBe(2);
      expect(stats?.lowStockProducts).toBe(1); // Tea is below threshold
      expect(stats?.totalTransactions).toBe(2);
      expect(stats?.totalRevenue).toBe(165);
      expect(stats?.averageTransactionValue).toBe(82.5);
    });
  });
});

describe('Demo Component Integration', () => {
  it('should handle demo mode state changes', async () => {
    expect(hackathonDemoService.isDemoModeActive()).toBe(false);
    
    await hackathonDemoService.initializeDemoMode();
    expect(hackathonDemoService.isDemoModeActive()).toBe(true);
    
    hackathonDemoService.exitDemoMode();
    expect(hackathonDemoService.isDemoModeActive()).toBe(false);
  });

  it('should provide consistent metrics throughout demo lifecycle', async () => {
    await hackathonDemoService.initializeDemoMode();
    
    const initialMetrics = hackathonDemoService.getDemoMetrics();
    expect(initialMetrics.scenariosCompleted).toBe(0);
    expect(initialMetrics.totalScenarios).toBe(5);
    
    await hackathonDemoService.executeDemoScenario('scenario_1');
    
    const updatedMetrics = hackathonDemoService.getDemoMetrics();
    expect(updatedMetrics.scenariosCompleted).toBe(1);
    expect(updatedMetrics.totalScenarios).toBe(5);
  });
});

describe('Demo Reliability Tests', () => {
  it('should handle multiple demo resets without errors', async () => {
    for (let i = 0; i < 3; i++) {
      await hackathonDemoService.initializeDemoMode();
      await hackathonDemoService.executeDemoScenario('scenario_1');
      await hackathonDemoService.resetDemoData();
      
      const metrics = hackathonDemoService.getDemoMetrics();
      expect(metrics.scenariosCompleted).toBe(0);
    }
  }, 15000); // Increase timeout to 15 seconds

  it('should maintain performance under rapid scenario execution', async () => {
    await hackathonDemoService.initializeDemoMode();
    
    const scenarios = hackathonDemoService.getDemoScenarios();
    const results = await Promise.all(
      scenarios.slice(0, 3).map(scenario => 
        hackathonDemoService.executeDemoScenario(scenario.id)
      )
    );
    
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.performance.totalTime).toBeGreaterThan(0);
    });
    
    const metrics = hackathonDemoService.getDemoMetrics();
    expect(metrics.scenariosCompleted).toBe(3);
  });
});