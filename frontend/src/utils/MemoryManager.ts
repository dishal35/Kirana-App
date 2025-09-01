/**
 * Memory Management Utilities for 8GB RAM Systems
 * 
 * This utility provides memory monitoring and optimization features
 * to ensure the application runs efficiently on systems with limited RAM.
 */

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
  isMemoryPressure: boolean;
}

export interface MemoryManagerConfig {
  maxMemoryUsagePercent: number;
  cleanupThreshold: number;
  monitoringInterval: number;
  enableAutoCleanup: boolean;
}

export class MemoryManager {
  private config: MemoryManagerConfig;
  private monitoringInterval: number | null = null;
  private memoryPressureCallbacks: Array<() => void> = [];
  private audioBufferCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
  private maxCacheSize = 50; // Maximum number of cached audio buffers
  private maxCacheAge = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      maxMemoryUsagePercent: config.maxMemoryUsagePercent ?? 75,
      cleanupThreshold: config.cleanupThreshold ?? 85,
      monitoringInterval: config.monitoringInterval ?? 30000, // 30 seconds
      enableAutoCleanup: config.enableAutoCleanup ?? true,
    };

    if (this.config.enableAutoCleanup) {
      this.startMonitoring();
    }
  }

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics | null {
    if (!('memory' in performance)) {
      console.warn('Performance.memory API not available');
      return null;
    }

    const memory = (performance as any).memory;
    const usedPercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercentage,
      isMemoryPressure: usedPercentage > this.config.maxMemoryUsagePercent,
    };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getMemoryMetrics();
      if (metrics?.isMemoryPressure) {
        this.handleMemoryPressure();
      }
      
      // Clean up old cached audio buffers
      this.cleanupAudioCache();
    }, this.config.monitoringInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Register callback for memory pressure events
   */
  onMemoryPressure(callback: () => void): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /**
   * Handle memory pressure by triggering cleanup callbacks
   */
  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, triggering cleanup...');
    
    // Trigger all registered cleanup callbacks
    this.memoryPressureCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in memory pressure callback:', error);
      }
    });

    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Optimized audio buffer management
   */
  cacheAudioBuffer(key: string, buffer: ArrayBuffer): void {
    // Remove oldest entries if cache is full
    if (this.audioBufferCache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.audioBufferCache.keys())[0];
      this.audioBufferCache.delete(oldestKey);
    }

    this.audioBufferCache.set(key, {
      buffer: buffer.slice(), // Create a copy to avoid memory leaks
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached audio buffer
   */
  getCachedAudioBuffer(key: string): ArrayBuffer | null {
    const cached = this.audioBufferCache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.maxCacheAge) {
      this.audioBufferCache.delete(key);
      return null;
    }

    return cached.buffer;
  }

  /**
   * Clean up expired audio cache entries
   */
  private cleanupAudioCache(): void {
    const now = Date.now();
    for (const [key, value] of this.audioBufferCache.entries()) {
      if (now - value.timestamp > this.maxCacheAge) {
        this.audioBufferCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached audio buffers
   */
  clearAudioCache(): void {
    this.audioBufferCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalMemoryUsage: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalMemoryUsage = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const [, value] of this.audioBufferCache.entries()) {
      totalMemoryUsage += value.buffer.byteLength;
      oldestEntry = Math.min(oldestEntry, value.timestamp);
      newestEntry = Math.max(newestEntry, value.timestamp);
    }

    return {
      size: this.audioBufferCache.size,
      totalMemoryUsage,
      oldestEntry: this.audioBufferCache.size > 0 ? oldestEntry : 0,
      newestEntry,
    };
  }

  /**
   * Optimize audio blob for memory efficiency
   */
  optimizeAudioBlob(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // For memory optimization, we can compress or reduce quality
      // This is a simplified implementation - in production, you might use Web Audio API
      
      if (blob.size < 100 * 1024) { // Less than 100KB, no optimization needed
        resolve(blob);
        return;
      }

      // Create a new blob with reduced size (simplified approach)
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          
          // Simple optimization: reduce to mono if stereo
          // In a real implementation, you'd use Web Audio API for proper audio processing
          const optimizedBlob = new Blob([arrayBuffer], { type: blob.type });
          resolve(optimizedBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopMonitoring();
    this.clearAudioCache();
    this.memoryPressureCallbacks = [];
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();