/**
 * Performance Tests for 8GB RAM Compatibility
 * 
 * These tests validate that the application performs well on systems
 * with limited memory resources.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { memoryManager, type MemoryMetrics } from '../utils/MemoryManager';
import { ImageOptimizer } from '../utils/ImageOptimizer';
import { optimizedDb } from '../dbs/optimizedDb';

// Mock performance.memory for testing
const mockMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 60 * 1024 * 1024, // 60MB
  jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  writable: true,
});

describe('Memory Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    memoryManager.clearAudioCache();
  });

  it('should detect memory metrics correctly', () => {
    const metrics = memoryManager.getMemoryMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics?.usedJSHeapSize).toBe(50 * 1024 * 1024);
    expect(metrics?.usedPercentage).toBe(50);
    expect(metrics?.isMemoryPressure).toBe(false);
  });

  it('should detect memory pressure when usage is high', () => {
    // Simulate high memory usage
    mockMemory.usedJSHeapSize = 80 * 1024 * 1024; // 80MB
    
    const metrics = memoryManager.getMemoryMetrics();
    
    expect(metrics?.usedPercentage).toBe(80);
    expect(metrics?.isMemoryPressure).toBe(true);
  });

  it('should manage audio buffer cache efficiently', () => {
    const testBuffer = new ArrayBuffer(1024); // 1KB buffer
    
    // Cache some buffers
    memoryManager.cacheAudioBuffer('test1', testBuffer);
    memoryManager.cacheAudioBuffer('test2', testBuffer);
    
    const stats = memoryManager.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.totalMemoryUsage).toBe(2048); // 2KB total
    
    // Retrieve cached buffer
    const cached = memoryManager.getCachedAudioBuffer('test1');
    expect(cached).toBeDefined();
    expect(cached?.byteLength).toBe(1024);
  });

  it('should limit cache size to prevent memory issues', () => {
    const testBuffer = new ArrayBuffer(1024);
    
    // Add more than the limit (assuming limit is 50)
    for (let i = 0; i < 60; i++) {
      memoryManager.cacheAudioBuffer(`test${i}`, testBuffer);
    }
    
    const stats = memoryManager.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(50);
  });

  it('should clear expired cache entries', async () => {
    const testBuffer = new ArrayBuffer(1024);
    
    // Cache a buffer
    memoryManager.cacheAudioBuffer('test', testBuffer);
    
    // Verify it exists
    expect(memoryManager.getCachedAudioBuffer('test')).toBeDefined();
    
    // Mock time passage (simulate 10 minutes)
    const originalNow = Date.now;
    Date.now = vi.fn(() => originalNow() + 10 * 60 * 1000);
    
    // Try to get expired cache entry
    expect(memoryManager.getCachedAudioBuffer('test')).toBeNull();
    
    // Restore Date.now
    Date.now = originalNow;
  });
});

describe('Image Optimization', () => {
  // Mock Canvas for testing environment
  const mockCanvas = {
    getContext: vi.fn(() => ({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: vi.fn(),
    })),
    width: 0,
    height: 0,
    toDataURL: vi.fn(() => 'data:image/webp;base64,test'),
    toBlob: vi.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/webp' }));
    }),
  };

  beforeEach(() => {
    // Mock document.createElement for canvas
    Object.defineProperty(document, 'createElement', {
      value: vi.fn((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return {};
      }),
      writable: true,
    });
  });

  it('should calculate optimal dimensions correctly', () => {
    const imageOptimizer = new ImageOptimizer();
    
    // Test landscape image
    const { width, height } = (imageOptimizer as any).calculateDimensions(
      1920, 1080, 800, 600
    );
    
    expect(width).toBeLessThanOrEqual(800);
    expect(height).toBeLessThanOrEqual(600);
    expect(width / height).toBeCloseTo(1920 / 1080, 2);
  });

  it('should not upscale small images', () => {
    const imageOptimizer = new ImageOptimizer();
    
    const { width, height } = (imageOptimizer as any).calculateDimensions(
      400, 300, 800, 600
    );
    
    expect(width).toBe(400);
    expect(height).toBe(300);
  });

  it('should validate image files correctly', () => {
    // Valid image file
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    
    const validResult = ImageOptimizer.validateImageFile(validFile);
    expect(validResult.valid).toBe(true);
    
    // Invalid file type
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    const invalidResult = ImageOptimizer.validateImageFile(invalidFile);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('not an image');
    
    // File too large
    const largeFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 20 * 1024 * 1024 }); // 20MB
    
    const largeResult = ImageOptimizer.validateImageFile(largeFile);
    expect(largeResult.valid).toBe(false);
    expect(largeResult.error).toContain('too large');
  });

  it('should estimate memory usage correctly', () => {
    const memoryUsage = ImageOptimizer.estimateMemoryUsage(800, 600);
    expect(memoryUsage).toBe(800 * 600 * 4); // 4 bytes per pixel
  });
});

describe('Database Performance', () => {
  beforeEach(async () => {
    // Clear database before each test
    await optimizedDb.delete();
    await optimizedDb.open();
  });

  afterEach(async () => {
    await optimizedDb.close();
  });

  it('should perform efficient low stock queries', async () => {
    // Add test products
    await optimizedDb.products.bulkAdd([
      {
        id: '1',
        name: 'Product 1',
        price: 10,
        stock: 5,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Product 2',
        price: 20,
        stock: 15,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const startTime = performance.now();
    const lowStockProducts = await optimizedDb.getLowStockProducts();
    const queryTime = performance.now() - startTime;

    expect(lowStockProducts).toHaveLength(1);
    expect(lowStockProducts[0].name).toBe('Product 1');
    expect(queryTime).toBeLessThan(50); // Should complete in less than 50ms
  });

  it('should perform efficient date range queries', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Add test transactions
    await optimizedDb.transactions.bulkAdd([
      {
        id: '1',
        amount: 100,
        products: [],
        type: 'upi',
        timestamp: today,
      },
      {
        id: '2',
        amount: 200,
        products: [],
        type: 'cash',
        timestamp: yesterday,
      },
    ]);

    const startTime = performance.now();
    const todaysTransactions = await optimizedDb.getTodaysTransactions();
    const queryTime = performance.now() - startTime;

    expect(todaysTransactions).toHaveLength(1);
    expect(todaysTransactions[0].amount).toBe(100);
    expect(queryTime).toBeLessThan(50); // Should complete in less than 50ms
  });

  it('should handle batch operations efficiently', async () => {
    // Add test products
    await optimizedDb.products.bulkAdd([
      {
        id: '1',
        name: 'Product 1',
        price: 10,
        stock: 100,
        reorderThreshold: 10,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Product 2',
        price: 20,
        stock: 200,
        reorderThreshold: 20,
        category: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const updates = [
      { productId: '1', newStock: 50 },
      { productId: '2', newStock: 150 },
    ];

    const startTime = performance.now();
    await optimizedDb.batchUpdateStock(updates);
    const updateTime = performance.now() - startTime;

    expect(updateTime).toBeLessThan(100); // Should complete in less than 100ms

    // Verify updates
    const product1 = await optimizedDb.products.get('1');
    const product2 = await optimizedDb.products.get('2');
    
    expect(product1?.stock).toBe(50);
    expect(product2?.stock).toBe(150);
  });

  it('should provide database statistics', async () => {
    // Add some test data
    await optimizedDb.products.add({
      id: '1',
      name: 'Test Product',
      price: 10,
      stock: 100,
      reorderThreshold: 10,
      category: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const stats = await optimizedDb.getDatabaseStats();
    
    expect(stats.products).toBe(1);
    expect(stats.transactions).toBe(0);
    expect(stats.totalSize).toBeGreaterThan(0);
  });
});

describe('Performance Benchmarks', () => {
  it('should load components within acceptable time limits', async () => {
    // Test lazy component loading time
    const startTime = performance.now();
    
    // Simulate component import
    const component = await import('../components/dashboard/BusinessDashboard');
    
    const loadTime = performance.now() - startTime;
    
    expect(component).toBeDefined();
    expect(loadTime).toBeLessThan(1000); // Should load in less than 1 second
  });

  it('should handle multiple concurrent operations efficiently', async () => {
    const operations = [];
    
    // Simulate concurrent operations
    for (let i = 0; i < 10; i++) {
      operations.push(
        new Promise(resolve => {
          setTimeout(() => {
            const testBuffer = new ArrayBuffer(1024);
            memoryManager.cacheAudioBuffer(`concurrent${i}`, testBuffer);
            resolve(true);
          }, Math.random() * 100);
        })
      );
    }

    const startTime = performance.now();
    await Promise.all(operations);
    const totalTime = performance.now() - startTime;

    expect(totalTime).toBeLessThan(500); // Should complete in less than 500ms
    
    const stats = memoryManager.getCacheStats();
    expect(stats.size).toBe(10);
  });

  it('should maintain performance under memory pressure', () => {
    // Simulate memory pressure
    mockMemory.usedJSHeapSize = 90 * 1024 * 1024; // 90MB (90% usage)
    
    const metrics = memoryManager.getMemoryMetrics();
    expect(metrics?.isMemoryPressure).toBe(true);
    
    // Test that memory pressure callback is triggered
    let callbackTriggered = false;
    memoryManager.onMemoryPressure(() => {
      callbackTriggered = true;
    });
    
    // Simulate memory pressure handling
    (memoryManager as any).handleMemoryPressure();
    
    expect(callbackTriggered).toBe(true);
  });
});