import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string): R;
    }
  }
}

// Mock config
vi.mock('../../config/env', () => ({
  config: {
    gemini: {
      apiKey: 'test-key'
    },
    app: {
      name: 'Test App',
      version: '1.0.0',
      isDev: true
    }
  }
}));

// Mock repositories
vi.mock('../../dbs/repo', () => ({
  shopRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn()
  },
  productRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn()
  }
}));

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
