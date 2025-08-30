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

// Mock the config
vi.mock('../../config/env', () => ({
  getGeminiApiKey: vi.fn(() => 'test-api-key'),
}));

// Mock Google Generative AI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('ProductSuggestionService', () => {
  let service: ProductSuggestionService;
  let mockProducts: Product[];
  let mockTransactions: Transaction[];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup Gemini mock
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
    
    // Create mock data
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSuggestions', () => {
    it('should return fallback suggestions when Gemini is unavailable', async () => {
      // Mock Gemini to throw an error
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(3); // Should return available products (excluding out of stock)
      expect(suggestions[0].product.name).toBe('Rice'); // Should suggest Rice for ₹45
      expect(suggestions[0].confidence).toBeGreaterThan(0.5); // High confidence for exact price match
      expect(suggestions[0].suggestedQuantity).toBe(1);
    });

    it('should filter out products with zero stock', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(25); // Milk price, but out of stock

      const milkSuggestion = suggestions.find(s => s.product.name === 'Milk');
      expect(milkSuggestion).toBeUndefined();
    });

    it('should return Gemini suggestions when API is available', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => JSON.stringify({
            suggestions: [
              {
                productName: 'Rice',
                confidence: 0.9,
                reason: 'Exact price match',
                quantity: 1
              }
            ],
            reasoning: 'Rice matches the transaction amount perfectly'
          })
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].product.name).toBe('Rice');
      expect(suggestions[0].confidence).toBe(0.9);
      expect(suggestions[0].reason).toBe('Exact price match');
    });

    it('should handle invalid Gemini responses gracefully', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => 'Invalid JSON response'
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const suggestions = await service.getSuggestions(45);

      // Should fall back to rule-based suggestions
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].product.name).toBe('Rice');
    });

    it('should limit suggestions to maxSuggestions parameter', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(45, 2);

      expect(suggestions).toHaveLength(2);
    });

    it('should calculate suggested quantity based on amount', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(60); // Should suggest 3 Tea packets

      const teaSuggestion = suggestions.find(s => s.product.name === 'Tea');
      expect(teaSuggestion?.suggestedQuantity).toBe(3);
    });

    it('should not suggest more than available stock', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(240); // Would suggest 8 Biscuits, but only 8 in stock

      const biscuitSuggestion = suggestions.find(s => s.product.name === 'Biscuits');
      expect(biscuitSuggestion?.suggestedQuantity).toBe(8); // Limited by stock
    });
  });

  describe('fallback suggestions', () => {
    beforeEach(() => {
      // Force fallback by making Gemini unavailable
      mockGenerateContent.mockRejectedValue(new Error('API Error'));
    });

    it('should prioritize exact price matches', async () => {
      const suggestions = await service.getSuggestions(45);

      expect(suggestions[0].product.name).toBe('Rice');
      expect(suggestions[0].confidence).toBeGreaterThan(0.6);
      expect(suggestions[0].reason).toContain('Price matches');
    });

    it('should consider historical popularity', async () => {
      const suggestions = await service.getSuggestions(25); // Different from exact Tea price to test popularity

      const teaSuggestion = suggestions.find(s => s.product.name === 'Tea');
      expect(teaSuggestion).toBeDefined();
      // Tea should be suggested due to popularity even if price doesn't match exactly
      expect(teaSuggestion!.confidence).toBeGreaterThan(0.3);
    });

    it('should handle empty transaction history', async () => {
      vi.mocked(repo.transactionRepository.getTransactionsByDateRange).mockResolvedValue([]);

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].product.name).toBe('Rice');
    });

    it('should apply time-based scoring', async () => {
      // Add a breakfast item
      const breakfastProducts = [
        ...mockProducts.filter(p => p.stock > 0), // Only in-stock products
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

      const suggestions = await service.getSuggestions(42);

      // Should include bread in suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      const breadSuggestion = suggestions.find(s => s.product.name === 'Bread');
      expect(breadSuggestion).toBeDefined();
    });
  });

  describe('Gemini integration', () => {
    it('should build proper context for Gemini prompt', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => JSON.stringify({
            suggestions: [],
            reasoning: 'Test response'
          })
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      await service.getSuggestions(45);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Amount received: ₹45')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Rice: ₹45')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Top selling products')
      );
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

      const suggestions = await service.getSuggestions(45);

      // Should fall back to rule-based suggestions
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].product.name).toBe('Rice');
    });

    it('should parse Gemini response correctly', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => `Here's my suggestion:
          {
            "suggestions": [
              {
                "productName": "Tea",
                "confidence": 0.85,
                "reason": "Popular morning beverage",
                "quantity": 2
              }
            ],
            "reasoning": "Tea is commonly purchased in the morning"
          }`
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const suggestions = await service.getSuggestions(40);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].product.name).toBe('Tea');
      expect(suggestions[0].confidence).toBe(0.85);
      expect(suggestions[0].reason).toBe('Popular morning beverage');
      expect(suggestions[0].suggestedQuantity).toBe(2);
    });

    it('should ignore suggestions for unavailable products', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => JSON.stringify({
            suggestions: [
              {
                productName: 'Unavailable Product',
                confidence: 0.9,
                reason: 'Not in inventory',
                quantity: 1
              },
              {
                productName: 'Rice',
                confidence: 0.8,
                reason: 'Available product',
                quantity: 1
              }
            ],
            reasoning: 'Mixed suggestions'
          })
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].product.name).toBe('Rice');
    });

    it('should cap confidence values within valid range', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => JSON.stringify({
            suggestions: [
              {
                productName: 'Rice',
                confidence: 1.5, // Invalid high confidence
                reason: 'Test',
                quantity: 1
              },
              {
                productName: 'Tea',
                confidence: -0.1, // Invalid low confidence
                reason: 'Test',
                quantity: 1
              }
            ],
            reasoning: 'Test response'
          })
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const suggestions = await service.getSuggestions(45);

      expect(suggestions[0].confidence).toBeLessThanOrEqual(1.0);
      expect(suggestions[1].confidence).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('testGeminiConnection', () => {
    it('should return true when Gemini responds correctly', async () => {
      const mockGeminiResponse = {
        response: async () => ({
          text: () => 'I suggest Rice for ₹50 transaction'
        })
      };

      mockGenerateContent.mockResolvedValue(mockGeminiResponse);

      const result = await service.testGeminiConnection();

      expect(result).toBe(true);
    });

    it('should return false when Gemini fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await service.testGeminiConnection();

      expect(result).toBe(false);
    });

    it('should return false when model is not initialized', async () => {
      // Create service without proper initialization
      vi.mocked(mockGetGenerativeModel).mockImplementation(() => {
        throw new Error('No API key');
      });

      const serviceWithoutModel = new ProductSuggestionService();
      const result = await serviceWithoutModel.testGeminiConnection();

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty product inventory', async () => {
      vi.mocked(repo.productRepository.getAll).mockResolvedValue([]);

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(0);
    });

    it('should handle very large transaction amounts', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(10000);

      expect(suggestions).toHaveLength(3);
      // Should still return suggestions even for large amounts
      suggestions.forEach(suggestion => {
        expect(suggestion.suggestedQuantity).toBeGreaterThan(0);
      });
    });

    it('should handle very small transaction amounts', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const suggestions = await service.getSuggestions(1);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle repository errors gracefully', async () => {
      vi.mocked(repo.productRepository.getAll).mockRejectedValue(new Error('Database error'));

      const suggestions = await service.getSuggestions(45);

      expect(suggestions).toHaveLength(0);
    });
  });
});