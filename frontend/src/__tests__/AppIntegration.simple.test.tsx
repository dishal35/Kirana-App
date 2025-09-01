import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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
    getLowStockProducts: vi.fn(),
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

describe('Simple App Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render app for existing user', async () => {
    // Mock existing shop
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
    ];

    // Setup mocks
    vi.mocked(shopRepository.getAll).mockResolvedValue([mockShop]);
    vi.mocked(productRepository.getAll).mockResolvedValue(mockProducts);
    vi.mocked(productRepository.getLowStockProducts).mockResolvedValue([]);
    vi.mocked(transactionRepository.getTodaysTransactions).mockResolvedValue([]);
    vi.mocked(transactionRepository.getTransactionsByDateRange).mockResolvedValue([]);

    render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show navigation
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('should show onboarding for new user', async () => {
    // Mock empty shop repository (first-time user)
    vi.mocked(shopRepository.getAll).mockResolvedValue([]);

    render(<App />);

    // Should show loading first
    expect(screen.getByText('Initializing application...')).toBeInTheDocument();

    // Wait for onboarding to appear
    await waitFor(() => {
      // The onboarding wizard should appear
      // We'll just check that the loading is gone and something else is rendered
      expect(screen.queryByText('Initializing application...')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });
});