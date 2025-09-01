import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatAssistant, type ChatQuery } from '../ChatAssistant';
import type { BusinessContext } from '../../types';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

// Mock the config
vi.mock('../../config/env', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-api-key')
}));

describe('ChatAssistant', () => {
  let chatAssistant: ChatAssistant;
  let mockModel: any;
  let mockBusinessContext: BusinessContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock model
    mockModel = {
      generateContent: vi.fn()
    };
    
    // Mock the GoogleGenerativeAI constructor
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel)
    }));

    chatAssistant = new ChatAssistant();

    // Setup mock business context
    mockBusinessContext = {
      todaysSales: [
        {
          id: '1',
          amount: 150,
          products: [{ productId: 'p1', quantity: 2, unitPrice: 75 }],
          type: 'upi',
          timestamp: new Date('2024-01-15T10:30:00Z')
        },
        {
          id: '2',
          amount: 200,
          products: [{ productId: 'p2', quantity: 1, unitPrice: 200 }],
          type: 'cash',
          timestamp: new Date('2024-01-15T14:15:00Z')
        }
      ],
      inventory: [
        {
          id: 'p1',
          name: 'Rice',
          price: 75,
          stock: 50,
          reorderThreshold: 10,
          category: 'Grains',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        },
        {
          id: 'p2',
          name: 'Oil',
          price: 200,
          stock: 5,
          reorderThreshold: 10,
          category: 'Cooking',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      ],
      salesHistory: []
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processQuery', () => {
    it('should process English query successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Today you have made ₹350 in total sales with 2 transactions.'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      const result = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(result.message).toBe('Today you have made ₹350 in total sales with 2 transactions.');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('How much did I sell today?')
      );
    });

    it('should process Hindi query successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'आज आपने कुल ₹350 की बिक्री की है।'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'आज कितना बेचा?',
        language: 'hi'
      };

      const result = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(result.message).toBe('आज आपने कुल ₹350 की बिक्री की है।');
      expect(result.language).toBe('hi');
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('हिंदी में जवाब दें')
      );
    });

    it('should process Kannada query successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'ಇಂದು ನೀವು ಒಟ್ಟು ₹350 ಮಾರಾಟ ಮಾಡಿದ್ದೀರಿ।'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'ಇಂದು ಎಷ್ಟು ಮಾರಾಟ ಮಾಡಿದೆ?',
        language: 'kn'
      };

      const result = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(result.message).toBe('ಇಂದು ನೀವು ಒಟ್ಟು ₹350 ಮಾರಾಟ ಮಾಡಿದ್ದೀರಿ।');
      expect(result.language).toBe('kn');
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ')
      );
    });

    it('should auto-detect Hindi language from text', async () => {
      const mockResponse = {
        response: {
          text: () => 'आज आपने कुल ₹350 की बिक्री की है।'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'आज कितना बेचा?'
        // No language specified
      };

      const result = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(result.language).toBe('hi');
    });

    it('should auto-detect Kannada language from text', async () => {
      const mockResponse = {
        response: {
          text: () => 'ಇಂದು ನೀವು ಒಟ್ಟು ₹350 ಮಾರಾಟ ಮಾಡಿದ್ದೀರಿ।'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'ಇಂದು ಎಷ್ಟು ಮಾರಾಟ?'
        // No language specified
      };

      const result = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(result.language).toBe('kn');
    });

    it('should include business context in prompt', async () => {
      const mockResponse = {
        response: {
          text: () => 'You have 1 product with low stock: Oil (5 units left).'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query: ChatQuery = {
        text: 'Which products are low in stock?',
        language: 'en'
      };

      await chatAssistant.processQuery(query, mockBusinessContext);

      const promptCall = mockModel.generateContent.mock.calls[0][0];
      expect(promptCall).toContain('Total Revenue: ₹350');
      expect(promptCall).toContain('Number of Transactions: 2');
      expect(promptCall).toContain('Low Stock Items (1): Oil (5 left)');
      expect(promptCall).toContain('Rice: ₹75, Stock: 50');
    });

    it('should handle API errors gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      const query: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      await expect(chatAssistant.processQuery(query, mockBusinessContext))
        .rejects.toThrow('Failed to process query: API Error');
    });

    it('should maintain conversation history', async () => {
      const mockResponse = {
        response: {
          text: () => 'Today you made ₹350 in sales.'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const query1: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      await chatAssistant.processQuery(query1, mockBusinessContext);

      const query2: ChatQuery = {
        text: 'What about yesterday?',
        language: 'en'
      };

      await chatAssistant.processQuery(query2, mockBusinessContext);

      const history = chatAssistant.getConversationHistory();
      expect(history).toHaveLength(4); // 2 user messages + 2 assistant responses
      expect(history[0].content).toBe('How much did I sell today?');
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });
  });

  describe('getSalesInsights', () => {
    it('should calculate correct sales insights', async () => {
      const insights = await chatAssistant.getSalesInsights(mockBusinessContext);

      expect(insights.totalSales).toBe(350);
      expect(insights.topProduct).toBe('Rice'); // Product with highest quantity sold
      expect(insights.lowStockCount).toBe(1); // Only Oil is below threshold
    });

    it('should handle empty sales data', async () => {
      const emptyContext: BusinessContext = {
        todaysSales: [],
        inventory: mockBusinessContext.inventory,
        salesHistory: []
      };

      const insights = await chatAssistant.getSalesInsights(emptyContext);

      expect(insights.totalSales).toBe(0);
      expect(insights.topProduct).toBe('No sales today');
      expect(insights.lowStockCount).toBe(1);
    });
  });

  describe('getInventoryStatus', () => {
    it('should calculate correct inventory status', async () => {
      const status = await chatAssistant.getInventoryStatus(mockBusinessContext);

      expect(status.totalProducts).toBe(2);
      expect(status.lowStockProducts).toHaveLength(1);
      expect(status.lowStockProducts[0].name).toBe('Oil');
      expect(status.totalValue).toBe(4750); // (75 * 50) + (200 * 5)
    });

    it('should handle empty inventory', async () => {
      const emptyContext: BusinessContext = {
        todaysSales: [],
        inventory: [],
        salesHistory: []
      };

      const status = await chatAssistant.getInventoryStatus(emptyContext);

      expect(status.totalProducts).toBe(0);
      expect(status.lowStockProducts).toHaveLength(0);
      expect(status.totalValue).toBe(0);
    });
  });

  describe('conversation management', () => {
    it('should clear conversation history', () => {
      // Add some messages first
      chatAssistant['addToHistory']({
        id: '1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date()
      });

      expect(chatAssistant.getConversationHistory()).toHaveLength(1);

      chatAssistant.clearHistory();

      expect(chatAssistant.getConversationHistory()).toHaveLength(0);
    });

    it('should limit conversation history length', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      // Add more messages than the limit (10)
      for (let i = 0; i < 12; i++) {
        const query: ChatQuery = {
          text: `Message ${i}`,
          language: 'en'
        };
        await chatAssistant.processQuery(query, mockBusinessContext);
      }

      const history = chatAssistant.getConversationHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse = {
        response: {
          text: () => 'Chat assistant ready'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await chatAssistant.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await chatAssistant.testConnection();

      expect(result).toBe(false);
    });
  });
});