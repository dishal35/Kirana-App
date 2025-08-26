import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../../config/env';

// Mock Vite's import.meta.env
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
  },
  validateConfig: () => ({
    isValid: true,
    missingVars: []
  }),
  getGeminiApiKey: () => 'test-key'
}));

describe('Environment Configuration', () => {
  const mockEnv = {
    VITE_GEMINI_API_KEY: 'test-key',
    VITE_APP_NAME: 'Test App',
    VITE_APP_VERSION: '1.0.0',
    VITE_DEV_MODE: 'true'
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetModules();
    // Set up environment
    vi.stubGlobal('import.meta', { env: mockEnv });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Gemini API Configuration', () => {
    it('should have Gemini API key configured', () => {
      expect(config.gemini.apiKey).toBe('test-key');
    });

    it('should throw error when getting API key if not configured', () => {
      vi.mocked(getGeminiApiKey).mockImplementation(() => {
        throw new Error('Gemini API key is not configured');
      });
      expect(() => getGeminiApiKey()).toThrow('Gemini API key is not configured');
    });
  });

  describe('Environment Validation', () => {
    it('should validate when all required variables are present', () => {
      const result = validateConfig();
      expect(result.isValid).toBe(true);
      expect(result.missingVars).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      vi.mocked(validateConfig).mockReturnValue({
        isValid: false,
        missingVars: ['VITE_GEMINI_API_KEY']
      });
      
      const result = validateConfig();
      expect(result.isValid).toBe(false);
      expect(result.missingVars).toContain('VITE_GEMINI_API_KEY');
    });
  });
});
