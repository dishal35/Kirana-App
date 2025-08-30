import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductSuggestionService } from '../ProductSuggestionService';
import type { Product, Transaction } from '../../types';
import * as repo from '../../dbs/repo';

// Mock the repositories
vi.mock('../../dbs/repo', () => ({
  productRepository: {
    getAll: vi.fn(),
  },
  transactionRepository: {
    getTransactionsByDateRange: vi.fn(),
  },
}));

// Mock the config to return a test API key
vi.mock('../../config/env', () => ({
  getGeminiApiKey: vi.fn(() => 'test-api-key'),
}));

describe('ProductSuggestionService Integration Tests', () => {
  let service: ProductSuggestionService;
  let mockProducts: Product[];
  let mockTransactions: Transaction[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create realistic test data
    mockProducts = [
      {
        id: '1',
        name: 'Rice',
        price: 45,
        stock: 10,
        category: 'Staples',
        reorderThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Tea',
        price: 20,
        stock: 15,
        category: 'Beverages',
        reorderThreshold: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Biscuits',
        price: 30,
        stock: 8,
        category: 'Snacks',
        reorderThreshold: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '4',
        name: 'Milk',
        price: 25,
        stock: 0, // Out of stock
        category: 'Dairy',
        reorderThreshold: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockTransactions = [
      {
        id: '1',
        amount: 45,
        products: [{ productId: '1', quantity: 1, unitPrice: 45 }],
        type: 'upi',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: '2',
        amount: 20,
        products: [{ productId: '2', quantity: 1, unitPrice: 20 }],
        type: 'upi',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: '3',
        amount: 60,
        products: [{ productId: '2', quantity: 3, unitPrice: 20 }],
        type: 'upi',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];

    // Setup repository mocks
    vi.mocked(repo.productRepository.getAll).mockResolvedValue(mockProducts);
    vi.mocked(repo.transactionRepository.getTransactionsByDateRange).mockResolvedValue(mockTransactions);

    service = new ProductSuggestionService();
  });

  describe('Fallback Suggestions (Core Functionality)', () => {
    it('should return suggestions for exact price matches', async () => {
      const suggestions = await service.getSuggestions(45, 3);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].product.name).toBe('Rice');
      expect(suggestions[0].confidence).toBeGreaterThan(0.5);
      expect(suggestions[0].suggestedQuantity).toBe(1);
    });

    it('should filter out products with zero stock', async () => {
      const suggestions = await service.getSuggestions(25, 5);

      const milkSuggestion = suggestions.find(s => s.product.name === 'Milk');
      expect(milkSuggestion).toBeUndefined();
      
      // Should only return products with stock > 0
      suggestions.forEach(suggestion => {
        expect(suggestion.product.stock).toBeGreaterThan(0);
      });
    });

    it('should calculate appropriate quantities based on amount', async () => {
      const suggestions = await service.getSuggestions(60, 3); // Should suggest 3 Tea packets

      const teaSuggestion = suggestions.find(s => s.product.name === 'Tea');
      expect(teaSuggestion).toBeDefined();
      expect(teaSuggestion!.suggestedQuantity).toBe(3);
    });

    it('should not suggest more than available stock', async () => {
      const suggestions = await service.getSuggestions(240, 3); // Would suggest 8 Biscuits

      const biscuitSuggestion = suggestions.find(s => s.product.name === 'Biscuits');
      expect(biscuitSuggestion).toBeDefined();
      expect(biscuitSuggestion!.suggestedQuantity).toBeLessThanOrEqual(8);
    });

    it('should handle empty product inventory gracefully', async () => {
      vi.mocked(repo.productRepository.getAll).mockResolvedValue([]);

      const suggestions = await service.getSuggestions(45, 3);

      expect(suggestions).toHaveLength(0);
    });

    it('should handle repository errors gracefully', async () => {
      vi.mocked(repo.productRepository.getAll).mockRejectedValue(new Error('Database error'));

      const suggestions = await service.getSuggestions(45, 3);

      expect(suggestions).toHaveLength(0);
    });

    it('should respect maxSuggestions parameter', async () => {
      const suggestions = await service.getSuggestions(45, 2);

      expect(suggestions).toHaveLength(2);
    });

    it('should handle very large amounts', async () => {
      const suggestions = await service.getSuggestions(10000, 3);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(suggestion.suggestedQuantity).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle very small amounts', async () => {
      const suggestions = await service.getSuggestions(1, 3);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Historical Analysis', () => {
    it('should consider transaction history in suggestions', async () => {
      // Tea has multiple transactions in history, should get popularity boost
      const suggestions = await service.getSuggestions(25, 3);

      const teaSuggestion = suggestions.find(s => s.product.name === 'Tea');
      expect(teaSuggestion).toBeDefined();
      expect(teaSuggestion!.confidence).toBeGreaterThan(0.3);
    });

    it('should handle empty transaction history', async () => {
      vi.mocked(repo.transactionRepository.getTransactionsByDateRange).mockResolvedValue([]);

      const suggestions = await service.getSuggestions(45, 3);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].product.name).toBe('Rice');
    });
  });

  describe('Time-based Suggestions', () => {
    it('should include time-appropriate products', async () => {
      // Add breakfast items to test time-based scoring
      const breakfastProducts = [
        ...mockProducts.filter(p => p.stock > 0),
        {
          id: '5',
          name: 'Bread',
          price: 40,
          stock: 5,
          category: 'breakfast',
          reorderThreshold: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      vi.mocked(repo.productRepository.getAll).mockResolvedValue(breakfastProducts);

      const suggestions = await service.getSuggestions(42, 4);

      expect(suggestions.length).toBeGreaterThan(0);
      // Should include bread in suggestions
      const breadSuggestion = suggestions.find(s => s.product.name === 'Bread');
      expect(breadSuggestion).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to exact price matches', async () => {
      const suggestions = await service.getSuggestions(45, 3);

      const riceSuggestion = suggestions.find(s => s.product.name === 'Rice');
      const otherSuggestions = suggestions.filter(s => s.product.name !== 'Rice');

      expect(riceSuggestion).toBeDefined();
      expect(riceSuggestion!.confidence).toBeGreaterThan(
        Math.max(...otherSuggestions.map(s => s.confidence))
      );
    });

    it('should ensure all confidence values are within valid range', async () => {
      const suggestions = await service.getSuggestions(45, 3);

      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0.1);
        expect(suggestion.confidence).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Product Suggestion Structure', () => {
    it('should return properly structured suggestions', async () => {
      const suggestions = await service.getSuggestions(45, 3);

      expect(suggestions).toHaveLength(3);
      
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('product');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('suggestedQuantity');
        
        expect(typeof suggestion.confidence).toBe('number');
        expect(typeof suggestion.reason).toBe('string');
        expect(typeof suggestion.suggestedQuantity).toBe('number');
        expect(suggestion.suggestedQuantity).toBeGreaterThan(0);
      });
    });

    it('should sort suggestions by confidence in descending order', async () => {
      const suggestions = await service.getSuggestions(45, 3);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          suggestions[i].confidence
        );
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle products with same price', async () => {
      const samepriceProducts = [
        {
          id: '1',
          name: 'Product A',
          price: 50,
          stock: 10,
          category: 'Category A',
          reorderThreshold: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Product B',
          price: 50,
          stock: 8,
          category: 'Category B',
          reorderThreshold: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(repo.productRepository.getAll).mockResolvedValue(samepriceProducts);

      const suggestions = await service.getSuggestions(50, 2);

      expect(suggestions).toHaveLength(2);
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0.5); // Both should have high confidence
      });
    });

    it('should handle zero amount gracefully', async () => {
      const suggestions = await service.getSuggestions(0, 3);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0);
      });
    });
  });
});