/**
 * Application verification utilities to ensure all components are working
 */

import { DemoDataService } from '../services/DemoDataService';
import { hackathonDemoService } from '../services/HackathonDemoService';
import { productRepository, transactionRepository, shopRepository } from '../dbs/repo';
import { audioCaptureService } from '../services/AudioCapture';
import { geminiTranscriptionService } from '../services/GeminiTranscription';

export interface VerificationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export class AppVerification {
  private results: VerificationResult[] = [];

  /**
   * Run complete application verification
   */
  async runFullVerification(): Promise<VerificationResult[]> {
    this.results = [];
    
    console.log('🔍 Starting Application Verification...\n');
    
    await this.verifyDatabase();
    await this.verifyAudioServices();
    await this.verifyDemoServices();
    await this.verifyAPIServices();
    await this.verifyBrowserSupport();
    
    this.printResults();
    return this.results;
  }

  private async verifyDatabase() {
    try {
      // Test database connectivity
      const shops = await shopRepository.getAll();
      const products = await productRepository.getAll();
      const transactions = await transactionRepository.getAll();
      
      this.addResult('Database', 'pass', 
        `Connected successfully - ${shops.length} shops, ${products.length} products, ${transactions.length} transactions`);
      
      // Test CRUD operations
      const testProduct = {
        name: 'Test Product',
        price: 10,
        stock: 5,
        category: 'Test',
        reorderThreshold: 2
      };
      
      const productId = await productRepository.create(testProduct);
      const retrieved = await productRepository.getById(productId);
      await productRepository.delete(productId);
      
      if (retrieved?.name === testProduct.name) {
        this.addResult('Database CRUD', 'pass', 'Create, read, delete operations working');
      } else {
        this.addResult('Database CRUD', 'fail', 'CRUD operations failed');
      }
      
    } catch (error) {
      this.addResult('Database', 'fail', `Database error: ${error}`);
    }
  }

  private async verifyAudioServices() {
    try {
      // Check audio permissions
      const hasPermission = await this.checkAudioPermission();
      if (hasPermission) {
        this.addResult('Audio Permissions', 'pass', 'Microphone access granted');
      } else {
        this.addResult('Audio Permissions', 'warning', 'Microphone access not granted - required for UPI detection');
      }
      
      // Check audio capture service
      if (audioCaptureService) {
        this.addResult('Audio Capture Service', 'pass', 'Service initialized');
      } else {
        this.addResult('Audio Capture Service', 'fail', 'Service not available');
      }
      
      // Check transcription service
      if (geminiTranscriptionService) {
        this.addResult('Transcription Service', 'pass', 'Service initialized');
      } else {
        this.addResult('Transcription Service', 'fail', 'Service not available');
      }
      
    } catch (error) {
      this.addResult('Audio Services', 'fail', `Audio services error: ${error}`);
    }
  }

  private async verifyDemoServices() {
    try {
      // Check demo data service
      const isDemoInitialized = await DemoDataService.isDemoDataInitialized();
      this.addResult('Demo Data', isDemoInitialized ? 'pass' : 'warning', 
        isDemoInitialized ? 'Demo data available' : 'Demo data not initialized');
      
      // Check hackathon demo service
      const scenarios = hackathonDemoService.getDemoScenarios();
      if (scenarios.length > 0) {
        this.addResult('Demo Scenarios', 'pass', `${scenarios.length} demo scenarios available`);
      } else {
        this.addResult('Demo Scenarios', 'fail', 'No demo scenarios found');
      }
      
    } catch (error) {
      this.addResult('Demo Services', 'fail', `Demo services error: ${error}`);
    }
  }

  private async verifyAPIServices() {
    try {
      // Check Gemini API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        this.addResult('Gemini API Key', 'pass', 'API key configured');
        
        // Test API connection (optional)
        try {
          const testResult = await geminiTranscriptionService.testConnection();
          if (testResult) {
            this.addResult('Gemini API Connection', 'pass', 'API connection successful');
          } else {
            this.addResult('Gemini API Connection', 'warning', 'API connection test failed');
          }
        } catch (error) {
          this.addResult('Gemini API Connection', 'warning', 'Could not test API connection');
        }
      } else {
        this.addResult('Gemini API Key', 'warning', 'API key not configured - some features may not work');
      }
      
    } catch (error) {
      this.addResult('API Services', 'fail', `API services error: ${error}`);
    }
  }

  private async verifyBrowserSupport() {
    try {
      // Check required browser features
      const features = {
        'IndexedDB': !!window.indexedDB,
        'LocalStorage': !!window.localStorage,
        'MediaDevices': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        'AudioContext': !!(window.AudioContext || (window as any).webkitAudioContext),
        'Blob': !!window.Blob,
        'FileReader': !!window.FileReader,
        'Fetch': !!window.fetch,
        'Promise': !!window.Promise,
        'ES6 Modules': true // If this code runs, ES6 modules are supported
      };
      
      const unsupported = Object.entries(features).filter(([_, supported]) => !supported);
      
      if (unsupported.length === 0) {
        this.addResult('Browser Support', 'pass', 'All required features supported');
      } else {
        this.addResult('Browser Support', 'fail', 
          `Unsupported features: ${unsupported.map(([name]) => name).join(', ')}`);
      }
      
      // Check performance API
      if (window.performance && window.performance.mark) {
        this.addResult('Performance API', 'pass', 'Performance monitoring available');
      } else {
        this.addResult('Performance API', 'warning', 'Performance monitoring not available');
      }
      
    } catch (error) {
      this.addResult('Browser Support', 'fail', `Browser support check error: ${error}`);
    }
  }

  private async checkAudioPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ component, status, message, details });
  }

  private printResults() {
    console.log('\n📊 Verification Results:\n');
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.component}: ${result.message}`);
    });
    
    console.log(`\n📈 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 Application is ready for testing!');
    } else {
      console.log('🔧 Please fix the failed components before testing');
    }
  }
}

// Make verification available globally
declare global {
  interface Window {
    verifyApp: () => Promise<VerificationResult[]>;
  }
}

const appVerification = new AppVerification();

if (typeof window !== 'undefined') {
  window.verifyApp = () => appVerification.runFullVerification();
  
  console.log('🔍 App verification loaded! Run window.verifyApp() to check everything');
}

export default appVerification;