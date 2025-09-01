import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatAssistant, type ChatQuery } from '../ChatAssistant';
import type { BusinessContext } from '../../types';

// Mock the config but allow real Gemini API calls in integration tests
vi.mock('../../config/env', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue(process.env.VITE_GEMINI_API_KEY || 'test-api-key')
}));

describe('ChatAssistant Integration Tests', () => {
  let chatAssistant: ChatAssistant;
  let mockBusinessContext: BusinessContext;

  beforeEach(() => {
    // Only run integration tests if API key is available
    if (!process.env.VITE_GEMINI_API_KEY) {
      console.log('Skipping integration tests - no Gemini API key provided');
      return;
    }

    chatAssistant = new ChatAssistant();

    // Setup realistic business context
    mockBusinessContext = {
      todaysSales: [
        {
          id: '1',
          amount: 150,
          products: [{ productId: 'rice-1kg', quantity: 2, unitPrice: 75 }],
          type: 'upi',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          transcription: '150 rupees received on PhonePe'
        },
        {
          id: '2',
          amount: 200,
          products: [{ productId: 'oil-1l', quantity: 1, unitPrice: 200 }],
          type: 'cash',
          timestamp: new Date('2024-01-15T14:15:00Z')
        },
        {
          id: '3',
          amount: 50,
          products: [{ productId: 'sugar-1kg', quantity: 1, unitPrice: 50 }],
          type: 'upi',
          timestamp: new Date('2024-01-15T16:45:00Z'),
          transcription: '50 rupees received on GPay'
        }
      ],
      inventory: [
        {
          id: 'rice-1kg',
          name: 'Rice (1kg)',
          price: 75,
          stock: 48,
          reorderThreshold: 10,
          category: 'Grains',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-15T10:30:00Z')
        },
        {
          id: 'oil-1l',
          name: 'Cooking Oil (1L)',
          price: 200,
          stock: 4,
          reorderThreshold: 5,
          category: 'Cooking',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-15T14:15:00Z')
        },
        {
          id: 'sugar-1kg',
          name: 'Sugar (1kg)',
          price: 50,
          stock: 19,
          reorderThreshold: 10,
          category: 'Sweeteners',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-15T16:45:00Z')
        },
        {
          id: 'flour-1kg',
          name: 'Wheat Flour (1kg)',
          price: 40,
          stock: 0,
          reorderThreshold: 15,
          category: 'Grains',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-10T00:00:00Z')
        }
      ],
      salesHistory: []
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to skip tests if no API key
  const skipIfNoApiKey = () => {
    if (!process.env.VITE_GEMINI_API_KEY) {
      return true;
    }
    return false;
  };

  describe('English queries', () => {
    it('should answer sales questions accurately', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      expect(response.message.toLowerCase()).toContain('400'); // Total sales: 150 + 200 + 50
      expect(response.message).toContain('₹');
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);

    it('should identify low stock products', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'Which products are running low on stock?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      expect(response.message.toLowerCase()).toContain('oil'); // Oil has 4 stock, threshold 5
      expect(response.message.toLowerCase()).toContain('flour'); // Flour has 0 stock
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);

    it('should provide business insights', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'What is my best selling product today?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      expect(response.message.toLowerCase()).toContain('rice'); // Rice sold 2 units
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);

    it('should handle inventory questions', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'How many products do I have in total?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      expect(response.message).toContain('4'); // 4 products in inventory
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);
  });

  describe('Hindi queries', () => {
    it('should answer sales questions in Hindi', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'आज कितना बेचा?',
        language: 'hi'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('hi');
      expect(response.message).toContain('400'); // Total sales
      expect(response.message).toContain('₹');
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);

    it('should identify low stock in Hindi', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'कौन से सामान कम हैं?',
        language: 'hi'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('hi');
      // Should mention low stock items in Hindi
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);
  });

  describe('Kannada queries', () => {
    it('should answer sales questions in Kannada', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'ಇಂದು ಎಷ್ಟು ಮಾರಾಟ ಮಾಡಿದೆ?',
        language: 'kn'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('kn');
      expect(response.message).toContain('400'); // Total sales
      expect(response.message).toContain('₹');
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);
  });

  describe('conversation context', () => {
    it('should maintain context across multiple queries', async () => {
      if (skipIfNoApiKey()) return;

      // First query
      const query1: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      const response1 = await chatAssistant.processQuery(query1, mockBusinessContext);
      expect(response1.message).toContain('400');

      // Follow-up query that depends on context
      const query2: ChatQuery = {
        text: 'What about yesterday?',
        language: 'en'
      };

      const response2 = await chatAssistant.processQuery(query2, mockBusinessContext);
      
      // Should understand this is about sales from previous context
      expect(response2.confidence).toBeGreaterThan(0.3);
      
      // Check conversation history
      const history = chatAssistant.getConversationHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    }, 15000);

    it('should handle mixed language conversation', async () => {
      if (skipIfNoApiKey()) return;

      // Start in English
      const query1: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      const response1 = await chatAssistant.processQuery(query1, mockBusinessContext);
      expect(response1.language).toBe('en');

      // Switch to Hindi
      const query2: ChatQuery = {
        text: 'कौन सा सामान सबसे ज्यादा बिका?',
        language: 'hi'
      };

      const response2 = await chatAssistant.processQuery(query2, mockBusinessContext);
      expect(response2.language).toBe('hi');

      // Both responses should be relevant
      expect(response1.confidence).toBeGreaterThan(0.5);
      expect(response2.confidence).toBeGreaterThan(0.5);
    }, 15000);
  });

  describe('edge cases', () => {
    it('should handle empty business context gracefully', async () => {
      if (skipIfNoApiKey()) return;

      const emptyContext: BusinessContext = {
        todaysSales: [],
        inventory: [],
        salesHistory: []
      };

      const query: ChatQuery = {
        text: 'How much did I sell today?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, emptyContext);

      expect(response.language).toBe('en');
      expect(response.message.toLowerCase()).toMatch(/(no sales|zero|nothing|0)/);
      expect(response.confidence).toBeGreaterThan(0.3);
    }, 10000);

    it('should handle unclear questions', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'xyz abc random text',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      // Should still provide a response, even if confidence is lower
      expect(response.message.length).toBeGreaterThan(0);
    }, 10000);

    it('should handle greetings appropriately', async () => {
      if (skipIfNoApiKey()) return;

      const query: ChatQuery = {
        text: 'Hello, how are you?',
        language: 'en'
      };

      const response = await chatAssistant.processQuery(query, mockBusinessContext);

      expect(response.language).toBe('en');
      expect(response.message.toLowerCase()).toMatch(/(hello|hi|help|business)/);
      expect(response.confidence).toBeGreaterThan(0.5);
    }, 10000);
  });

  describe('business insights', () => {
    it('should provide accurate sales insights', async () => {
      if (skipIfNoApiKey()) return;

      const insights = await chatAssistant.getSalesInsights(mockBusinessContext);

      expect(insights.totalSales).toBe(400); // 150 + 200 + 50
      expect(insights.topProduct).toBe('Rice (1kg)'); // 2 units sold
      expect(insights.lowStockCount).toBe(2); // Oil and Flour
    });

    it('should provide accurate inventory status', async () => {
      if (skipIfNoApiKey()) return;

      const status = await chatAssistant.getInventoryStatus(mockBusinessContext);

      expect(status.totalProducts).toBe(4);
      expect(status.lowStockProducts).toHaveLength(2); // Oil (4 < 5) and Flour (0 < 15)
      expect(status.totalValue).toBe(4400); // (75*48) + (200*4) + (50*19) + (40*0)
    });
  });

  describe('connection test', () => {
    it('should successfully test connection', async () => {
      if (skipIfNoApiKey()) return;

      const isConnected = await chatAssistant.testConnection();
      expect(isConnected).toBe(true);
    }, 10000);
  });
});