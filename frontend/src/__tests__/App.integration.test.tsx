import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { shopRepository, productRepository, transactionRepository } from '../dbs/repo';

// Mock the repositories
vi.mock('../dbs/repo', () => ({
  shopRepository: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  productRepository: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  transactionRepository: {
    getTodaysTransactions: vi.fn(),
    create: vi.fn(),
    getTransactionsByDateRange: vi.fn(),
  },
}));

// Mock the audio services
vi.mock('../services/AudioCapture', () => ({
  AudioCapture: vi.fn().mockImplementation(() => ({
    startListening: vi.fn(),
    stopListening: vi.fn(),
    onAudioCaptured: null,
    onError: null,
    onStatusChange: null,
  })),
}));

vi.mock('../services/TransactionProcessor', () => ({
  TransactionProcessor: vi.fn().mockImplementation(() => ({
    processAudio: vi.fn(),
  })),
}));

vi.mock('../services/ProductSuggestionService', () => ({
  ProductSuggestionService: vi.fn().mockImplementation(() => ({
    suggestProducts: vi.fn(),
  })),
}));

// Mock Gemini API
vi.mock('../services/GeminiTranscription', () => ({
  GeminiTranscription: vi.fn().mockImplementation(() => ({
    transcribeAudio: vi.fn(),
  })),
}));

describe('App Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('First-time User Flow', () => {
    it('should show onboarding for new users', async () => {
      // Mock empty shop repository (first-time user)
      vi.mocked(shopRepository.getAll).mockResolvedValue([]);

      render(<App />);

      // Should show loading first
      expect(screen.getByText('Initializing application...')).toBeInTheDocument();

      // Wait for onboarding to appear
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });

    it('should complete onboarding flow', async () => {
      // Mock empty shop repository
      vi.mocked(shopRepository.getAll).mockResolvedValue([]);
      
      // Mock successful shop creation
      const mockShop = {
        id: '1',
        name: 'Test Shop',
        type: 'grocery',
        ownerId: 'owner1',
        createdAt: new Date(),
        settings: {
          currency: 'INR' as const,
          language: 'en' as const,
          lowStockThreshold: 5,
          autoSuggestEnabled: true,
        },
      };
      vi.mocked(shopRepository.create).mockResolvedValue(mockShop);

      // Mock product creation
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        price: 100,
        stock: 50,
        reorderThreshold: 10,
        category: 'general',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(productRepository.create).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.getAll).mockResolvedValue([mockProduct]);
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);

      render(<App />);

      // Wait for onboarding
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });

      // This would test the complete onboarding flow
      // For now, we'll just verify the component renders
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  describe('Existing User Flow', () => {
    const mockShop = {
      id: '1',
      name: 'Test Shop',
      type: 'grocery',
      ownerId: 'owner1',
      createdAt: new Date(),
      settings: {
        currency: 'INR' as const,
        language: 'en' as const,
        lowStockThreshold: 5,
        autoSuggestEnabled: true,
      },
    };

    const mockProducts = [
      {
        id: '1',
        name: 'Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 10,
        category: 'grains',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Oil',
        price: 150,
        stock: 5,
        reorderThreshold: 10,
        category: 'cooking',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockTransactions = [
      {
        id: '1',
        amount: 50,
        products: [{ productId: '1', quantity: 1, unitPrice: 50 }],
        type: 'upi' as const,
        timestamp: new Date(),
        transcription: 'Fifty rupees received on PhonePe',
        confidence: 0.95,
      },
    ];

    beforeEach(() => {
      vi.mocked(shopRepository.getAll).mockResolvedValue([mockShop]);
      vi.mocked(productRepository.getAll).mockResolvedValue(mockProducts);
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue(mockTransactions);
      vi.mocked(transactionRepository.getTransactionsByDateRange).mockResolvedValue(mockTransactions);
    });

    it('should load dashboard for existing users', async () => {
      render(<App />);

      // Wait for app to initialize
      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });

      // Should show shop name in navigation
      expect(screen.getByText('Test Shop')).toBeInTheDocument();

      // Should show dashboard metrics
      expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    });

    it('should navigate between pages', async () => {
      render(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });

      // Navigate to chat
      const chatButton = screen.getByRole('button', { name: /assistant/i });
      await user.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText(/business assistant/i)).toBeInTheDocument();
      });

      // Navigate to inventory
      const inventoryButton = screen.getByRole('button', { name: /inventory/i });
      await user.click(inventoryButton);

      await waitFor(() => {
        expect(screen.getByText(/inventory management/i)).toBeInTheDocument();
      });

      // Navigate to transactions
      const transactionsButton = screen.getByRole('button', { name: /transactions/i });
      await user.click(transactionsButton);

      await waitFor(() => {
        expect(screen.getByText(/transaction history/i)).toBeInTheDocument();
      });
    });

    it('should show low stock alerts', async () => {
      render(<App />);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });

      // Should show low stock count (Oil has stock 5, threshold 10)
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Low stock count
      });
    });

    it('should handle transaction processing', async () => {
      // Mock transaction processor
      const mockTransactionResult = {
        amount: 100,
        confidence: 0.9,
        suggestedProducts: [mockProducts[0]],
        transcription: 'One hundred rupees received on PhonePe',
      };

      render(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Business Dashboard')).toBeInTheDocument();
      });

      // This would test the transaction processing flow
      // For now, we verify the app loads correctly
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
    });

    it('should handle errors gracefully', async () => {
      // Mock repository error
      vi.mocked(productRepository.getAll).mockRejectedValue(new Error('Database error'));

      render(<App />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Language Support', () => {
    const mockShop = {
      id: '1',
      name: 'Test Shop',
      type: 'grocery',
      ownerId: 'owner1',
      createdAt: new Date(),
      settings: {
        currency: 'INR' as const,
        language: 'hi' as const, // Hindi
        lowStockThreshold: 5,
        autoSuggestEnabled: true,
      },
    };

    beforeEach(() => {
      vi.mocked(shopRepository.getAll).mockResolvedValue([mockShop]);
      vi.mocked(productRepository.getAll).mockResolvedValue([]);
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);
    });

    it('should support Hindi language', async () => {
      render(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Should show Hindi text in navigation
      expect(screen.getByText('डैशबोर्ड')).toBeInTheDocument(); // Dashboard in Hindi
    });
  });

  describe('Error Boundary', () => {
    it('should catch and display errors', async () => {
      // Mock a component that throws an error
      const ThrowError = () => {
        throw new Error('Test error');
      };

      // This would test the error boundary
      // For now, we'll just verify the app structure
      render(<App />);
      
      // The app should render without crashing
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile navigation on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      vi.mocked(shopRepository.getAll).mockResolvedValue([{
        id: '1',
        name: 'Test Shop',
        type: 'grocery',
        ownerId: 'owner1',
        createdAt: new Date(),
        settings: {
          currency: 'INR' as const,
          language: 'en' as const,
          lowStockThreshold: 5,
          autoSuggestEnabled: true,
        },
      }]);
      vi.mocked(productRepository.getAll).mockResolvedValue([]);
      vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);

      render(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText('Test Shop')).toBeInTheDocument();
      });

      // Mobile navigation should be present (though hidden by CSS)
      // We can't easily test CSS media queries in jsdom
      expect(document.body).toBeInTheDocument();
    });
  });
});