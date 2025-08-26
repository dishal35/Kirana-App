import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import './setup.react';

// Mock environment variables
vi.stubGlobal('import.meta', {
  env: {
    VITE_GEMINI_API_KEY: 'test-key',
    VITE_APP_NAME: 'Test App',
    VITE_APP_VERSION: '1.0.0',
    VITE_DEV_MODE: 'true'
  }
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
