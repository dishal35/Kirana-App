import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../config/env';
import type { BusinessContext, InsightSummary, InventoryStatus, Product, Transaction } from '../types';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  language?: 'en' | 'hi' | 'kn';
}

export interface ChatResponse {
  message: string;
  language: 'en' | 'hi' | 'kn';
  confidence: number;
}

export interface ChatQuery {
  text: string;
  language?: 'en' | 'hi' | 'kn';
  isVoice?: boolean;
}

export class ChatAssistant {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength = 10;

  constructor() {
    try {
      const apiKey = getGeminiApiKey();
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      throw new Error(`Failed to initialize Chat Assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a user query with business context
   */
  async processQuery(query: ChatQuery, context: BusinessContext): Promise<ChatResponse> {
    try {
      // Detect language if not provided
      const detectedLanguage = query.language || this.detectLanguage(query.text);
      
      // Build context-aware prompt
      const prompt = this.buildPrompt(query.text, context, detectedLanguage);
      
      // Generate response
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Add to conversation history
      this.addToHistory({
        id: crypto.randomUUID(),
        content: query.text,
        role: 'user',
        timestamp: new Date(),
        language: detectedLanguage
      });

      this.addToHistory({
        id: crypto.randomUUID(),
        content: responseText,
        role: 'assistant',
        timestamp: new Date(),
        language: detectedLanguage
      });

      return {
        message: responseText,
        language: detectedLanguage,
        confidence: this.calculateResponseConfidence(responseText, query.text)
      };
    } catch (error) {
      console.error('Chat query processing failed:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sales insights summary
   */
  async getSalesInsights(context: BusinessContext): Promise<InsightSummary> {
    const todaysSales = context.todaysSales;
    const totalSales = todaysSales.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Find top-selling product
    const productSales = new Map<string, number>();
    todaysSales.forEach(transaction => {
      transaction.products.forEach(item => {
        const current = productSales.get(item.productId) || 0;
        productSales.set(item.productId, current + item.quantity);
      });
    });

    let topProductId = '';
    let maxQuantity = 0;
    productSales.forEach((quantity, productId) => {
      if (quantity > maxQuantity) {
        maxQuantity = quantity;
        topProductId = productId;
      }
    });

    const topProduct = context.inventory.find(p => p.id === topProductId);
    const lowStockCount = context.inventory.filter(p => p.stock <= p.reorderThreshold).length;

    return {
      totalSales,
      topProduct: topProduct?.name || 'No sales today',
      lowStockCount
    };
  }

  /**
   * Get inventory status summary
   */
  async getInventoryStatus(context: BusinessContext): Promise<InventoryStatus> {
    const inventory = context.inventory;
    const totalProducts = inventory.length;
    const lowStockProducts = inventory.filter(p => p.stock <= p.reorderThreshold);
    const totalValue = inventory.reduce((sum, product) => sum + (product.price * product.stock), 0);

    return {
      totalProducts,
      lowStockProducts,
      totalValue
    };
  }

  /**
   * Build context-aware prompt for Gemini
   */
  private buildPrompt(query: string, context: BusinessContext, language: 'en' | 'hi' | 'kn'): string {
    const languageInstructions = this.getLanguageInstructions(language);
    const businessData = this.formatBusinessContext(context);
    const conversationContext = this.formatConversationHistory();

    return `
${languageInstructions}

You are a helpful AI assistant for a small shopkeeper in India. You help them understand their business data and answer questions about sales, inventory, and business insights.

BUSINESS CONTEXT:
${businessData}

CONVERSATION HISTORY:
${conversationContext}

USER QUERY: ${query}

INSTRUCTIONS:
1. Answer in ${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Kannada'} language
2. Be conversational and friendly, like talking to a local shopkeeper
3. Use the business data provided to give accurate, specific answers
4. If asked about sales, refer to today's transactions
5. If asked about inventory, refer to current stock levels
6. Keep responses concise but informative
7. Use Indian currency format (₹) when mentioning amounts
8. If you don't have specific data to answer a question, say so politely
9. For greetings, respond warmly and ask how you can help with their business

RESPONSE:`;
  }

  /**
   * Get language-specific instructions
   */
  private getLanguageInstructions(language: 'en' | 'hi' | 'kn'): string {
    switch (language) {
      case 'hi':
        return `आप एक भारतीय दुकानदार के लिए एक सहायक AI असिस्टेंट हैं। हिंदी में जवाब दें।`;
      case 'kn':
        return `ನೀವು ಭಾರತೀಯ ಅಂಗಡಿಯವರಿಗೆ ಸಹಾಯಕ AI ಸಹಾಯಕರಾಗಿದ್ದೀರಿ। ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ।`;
      default:
        return `You are a helpful AI assistant for an Indian shopkeeper. Respond in English.`;
    }
  }

  /**
   * Format business context for the prompt
   */
  private formatBusinessContext(context: BusinessContext): string {
    const todaysSales = context.todaysSales;
    const inventory = context.inventory;
    
    const totalSalesToday = todaysSales.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = todaysSales.length;
    
    const lowStockItems = inventory.filter(p => p.stock <= p.reorderThreshold);
    const outOfStockItems = inventory.filter(p => p.stock === 0);

    return `
TODAY'S SALES:
- Total Revenue: ₹${totalSalesToday}
- Number of Transactions: ${transactionCount}
- Recent Transactions: ${todaysSales.slice(0, 3).map(t => `₹${t.amount} at ${t.timestamp.toLocaleTimeString()}`).join(', ')}

INVENTORY STATUS:
- Total Products: ${inventory.length}
- Low Stock Items (${lowStockItems.length}): ${lowStockItems.map(p => `${p.name} (${p.stock} left)`).join(', ') || 'None'}
- Out of Stock Items (${outOfStockItems.length}): ${outOfStockItems.map(p => p.name).join(', ') || 'None'}
- Top Products by Stock: ${inventory.sort((a, b) => b.stock - a.stock).slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ')}

PRODUCT CATALOG:
${inventory.slice(0, 10).map(p => `- ${p.name}: ₹${p.price}, Stock: ${p.stock}`).join('\n')}
${inventory.length > 10 ? `... and ${inventory.length - 10} more products` : ''}
`;
  }

  /**
   * Format conversation history for context
   */
  private formatConversationHistory(): string {
    if (this.conversationHistory.length === 0) {
      return 'No previous conversation.';
    }

    return this.conversationHistory
      .slice(-6) // Last 6 messages for context
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): 'en' | 'hi' | 'kn' {
    // Simple language detection based on script
    const hindiPattern = /[\u0900-\u097F]/;
    const kannadaPattern = /[\u0C80-\u0CFF]/;
    
    if (hindiPattern.test(text)) {
      return 'hi';
    } else if (kannadaPattern.test(text)) {
      return 'kn';
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Calculate response confidence based on query and response characteristics
   */
  private calculateResponseConfidence(response: string, query: string): number {
    let confidence = 0.7; // Base confidence

    // Check if response contains business data references
    if (response.includes('₹') || response.includes('stock') || response.includes('sales')) {
      confidence += 0.2;
    }

    // Check response length (too short might indicate poor understanding)
    if (response.length < 20) {
      confidence -= 0.2;
    } else if (response.length > 50) {
      confidence += 0.1;
    }

    // Check if response seems relevant to query
    const queryWords = query.toLowerCase().split(' ');
    const responseWords = response.toLowerCase().split(' ');
    const commonWords = queryWords.filter(word => responseWords.includes(word));
    
    if (commonWords.length > 0) {
      confidence += Math.min(0.2, commonWords.length * 0.05);
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);
    
    // Keep only recent messages
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Test the chat assistant connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testQuery: ChatQuery = {
        text: 'Hello, can you respond with "Chat assistant ready"?',
        language: 'en'
      };
      
      const mockContext: BusinessContext = {
        todaysSales: [],
        inventory: [],
        salesHistory: []
      };

      const response = await this.processQuery(testQuery, mockContext);
      return response.message.toLowerCase().includes('chat assistant ready');
    } catch (error) {
      console.error('Chat assistant connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const chatAssistant = new ChatAssistant();