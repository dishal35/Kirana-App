import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionProcessor } from '../TransactionProcessor';
import type { Product } from '../../types';

// Mock the dependencies
vi.mock('../AmountExtractor', () => ({
  AmountExtractor: vi.fn().mockImplementation(() => ({
    extractAmount: vi.fn().mockImplementation((text: string) => {
      // Handle null/undefined input
      if (!text) {
        return { amount: null, confidence: 0, platform: 'unknown', language: 'unknown', currency: 'INR', extractedText: '' };
      }
      
      // Mock implementation that extracts amounts from common patterns
      if (text.includes('Rs. 25.50') || text.includes('₹25.50')) {
        return { amount: 25.50, confidence: 0.9, platform: 'phonepe', language: 'en', currency: 'INR', extractedText: '₹25.50' };
      }
      if (text.includes('Rs. 25') || text.includes('₹25')) {
        return { amount: 25, confidence: 0.9, platform: 'phonepe', language: 'en', currency: 'INR', extractedText: '₹25' };
      }
      if (text.includes('Rs. 30') || text.includes('₹30')) {
        return { amount: 30, confidence: 0.9, platform: 'phonepe', language: 'hi', currency: 'INR', extractedText: '₹30' };
      }
      if (text.includes('Rs. 50') || text.includes('₹50')) {
        return { amount: 50, confidence: 0.9, platform: 'phonepe', language: 'kn', currency: 'INR', extractedText: '₹50' };
      }
      if (text.includes('Rs. 100') || text.includes('₹100')) {
        return { amount: 100, confidence: 0.9, platform: 'phonepe', language: 'en', currency: 'INR', extractedText: '₹100' };
      }
      if (text.includes('1,500')) {
        return { amount: 1500, confidence: 0.9, platform: 'phonepe', language: 'en', currency: 'INR', extractedText: '₹1,500' };
      }
      if (text.includes('15')) {
        return { amount: 15, confidence: 0.9, platform: 'phonepe', language: 'en', currency: 'INR', extractedText: '₹15' };
      }
      if (text.includes('Maybe 100')) {
        return { amount: 100, confidence: 0.3, platform: 'unknown', language: 'en', currency: 'INR', extractedText: '100' };
      }
      return { amount: null, confidence: 0, platform: 'unknown', language: 'unknown', currency: 'INR', extractedText: '' };
    }),
    validateExtraction: vi.fn().mockImplementation((result: any, minConfidence = 0.5) => {
      return result.amount !== null && result.confidence >= minConfidence;
    })
  }))
}));

vi.mock('../GeminiTranscription', () => ({
  GeminiTranscription: vi.fn().mockImplementation(() => ({
    transcribeAudio: vi.fn().mockResolvedValue({
      success: true,
      text: 'You received Rs. 25 on PhonePe'
    })
  }))
}));

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;
  let mockInventory: Product[];

  beforeEach(() => {
    processor = new TransactionProcessor();
    
    mockInventory = [
      {
        id: '1',
        name: 'Milk',
        price: 25,
        stock: 10,
        reorderThreshold: 5,
        category: 'Dairy',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Bread',
        price: 30,
        stock: 8,
        reorderThreshold: 3,
        category: 'Bakery',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Rice (1kg)',
        price: 50,
        stock: 15,
        reorderThreshold: 5,
        category: 'Grains',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        name: 'Out of Stock Item',
        price: 100,
        stock: 0,
        reorderThreshold: 5,
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  });

  describe('constructor', () => {
    it('should create processor instance', () => {
      expect(processor).toBeDefined();
    });
  });

  describe('processTextTransaction', () => {
    it('should process valid transaction text', () => {
      const transcription = "You received Rs. 25 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(25);
      expect(result?.platform).toBe('phonepe');
      expect(result?.transcription).toBe(transcription);
      expect(result?.suggestedProducts).toBeDefined();
    });

    it('should return null for invalid transcription', () => {
      const transcription = "Hello world no amount here";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeNull();
    });

    it('should return null for low confidence extraction', () => {
      const transcription = "Maybe 100 something";
      const result = processor.processTextTransaction(transcription, mockInventory, 0.8);
      
      // This should fail due to low confidence
      expect(result).toBeNull();
    });

    it('should work without inventory', () => {
      const transcription = "You received Rs. 50 on PhonePe";
      const result = processor.processTextTransaction(transcription);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(50);
      expect(result?.suggestedProducts).toEqual([]);
    });
  });

  describe('product suggestions', () => {
    it('should suggest exact price match', () => {
      const transcription = "You received Rs. 25 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result?.suggestedProducts).toBeDefined();
      expect(result?.suggestedProducts.length).toBeGreaterThan(0);
      
      // Should include milk (exact match at ₹25)
      const milkSuggestion = result?.suggestedProducts.find(p => p.name === 'Milk');
      expect(milkSuggestion).toBeDefined();
    });

    it('should suggest multiple items for larger amounts', () => {
      const transcription = "You received Rs. 100 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result?.suggestedProducts).toBeDefined();
      expect(result?.suggestedProducts.length).toBeGreaterThan(0);
      
      // Should suggest items that could make up ₹100
      const suggestions = result?.suggestedProducts || [];
      expect(suggestions.some(p => p.price <= 100)).toBe(true);
    });

    it('should not suggest out-of-stock items', () => {
      const transcription = "You received Rs. 100 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      const outOfStockSuggestion = result?.suggestedProducts.find(p => p.name === 'Out of Stock Item');
      expect(outOfStockSuggestion).toBeUndefined();
    });

    it('should limit suggestions to top 5', () => {
      // Create inventory with many items
      const largeInventory: Product[] = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        price: 10 + i,
        stock: 5,
        reorderThreshold: 2,
        category: 'Test',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const transcription = "You received Rs. 15 on PhonePe";
      const result = processor.processTextTransaction(transcription, largeInventory);
      
      expect(result?.suggestedProducts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getExtractionStats', () => {
    it('should calculate stats for successful extractions', () => {
      const transcriptions = [
        "You received Rs. 25 on PhonePe",
        "₹50 received via GPay",
        "Payment of Rs. 100 on Paytm",
        "Hello world no amount"
      ];

      const stats = processor.getExtractionStats(transcriptions);
      
      expect(stats.totalProcessed).toBe(4);
      expect(stats.successfulExtractions).toBe(3);
      expect(stats.platformBreakdown).toBeDefined();
      expect(stats.languageBreakdown).toBeDefined();
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should handle empty transcriptions array', () => {
      const stats = processor.getExtractionStats([]);
      
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successfulExtractions).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });

    it('should handle all failed extractions', () => {
      const transcriptions = [
        "Hello world",
        "No amounts here",
        "Just text"
      ];

      const stats = processor.getExtractionStats(transcriptions);
      
      expect(stats.totalProcessed).toBe(3);
      expect(stats.successfulExtractions).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe('validateTransactionAmount', () => {
    it('should validate normal amounts', () => {
      const result = processor.validateTransactionAmount(50);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject amounts that are too small', () => {
      const result = processor.validateTransactionAmount(0.5);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too small');
    });

    it('should reject amounts that are too large', () => {
      const result = processor.validateTransactionAmount(200000);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too large');
    });

    it('should flag suspicious round numbers', () => {
      const result = processor.validateTransactionAmount(5000);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toContain('verify manually');
    });

    it('should allow large round numbers above threshold', () => {
      const result = processor.validateTransactionAmount(15000);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow small round numbers', () => {
      const result = processor.validateTransactionAmount(100);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', () => {
      // Test with malformed input
      const result = processor.processTextTransaction(null as any);
      
      expect(result).toBeNull();
    });

    it('should handle empty inventory gracefully', () => {
      const transcription = "You received Rs. 25 on PhonePe";
      const result = processor.processTextTransaction(transcription, []);
      
      expect(result).toBeDefined();
      expect(result?.suggestedProducts).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should handle Hindi transaction', () => {
      const transcription = "आपको ₹30 फोनपे पर मिला";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(30);
      expect(result?.language).toBe('hi');
      expect(result?.platform).toBe('phonepe');
    });

    it('should handle Kannada transaction', () => {
      const transcription = "ನಿಮಗೆ ₹50 ಫೋನ್‌ಪೇ ನಲ್ಲಿ ಸಿಕ್ಕಿತು";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(50);
      expect(result?.language).toBe('kn');
      expect(result?.platform).toBe('phonepe');
    });

    it('should handle decimal amounts', () => {
      const transcription = "You received Rs. 25.50 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(25.50);
    });

    it('should handle large amounts with commas', () => {
      const transcription = "You received Rs. 1,500 on PhonePe";
      const result = processor.processTextTransaction(transcription, mockInventory);
      
      expect(result).toBeDefined();
      expect(result?.amount).toBe(1500);
    });
  });
});