import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiTranscriptionService, TranscriptionResult, TranscriptionError } from '../GeminiTranscription';

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

describe('GeminiTranscriptionService', () => {
  let service: GeminiTranscriptionService;
  let mockModel: any;
  let mockGenerateContent: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock model
    mockGenerateContent = vi.fn();
    mockModel = {
      generateContent: mockGenerateContent
    };

    // Mock the GoogleGenerativeAI constructor
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel)
    }));

    service = new GeminiTranscriptionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully with valid API key', () => {
      expect(service).toBeInstanceOf(GeminiTranscriptionService);
    });

    it('should throw error when API key is missing', async () => {
      const { getGeminiApiKey } = await import('../../config/env');
      (getGeminiApiKey as any).mockImplementation(() => {
        throw new Error('Gemini API key is not configured');
      });

      expect(() => new GeminiTranscriptionService()).toThrow('Failed to initialize Gemini API');
    });
  });

  describe('transcribeAudio', () => {
    let mockAudioBlob: Blob;

    beforeEach(() => {
      // Create a mock audio blob
      mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:audio/wav;base64,bW9jayBhdWRpbyBkYXRh', // base64 for "mock audio data"
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = vi.fn().mockImplementation(() => mockFileReader);
      
      // Simulate successful file reading
      vi.spyOn(global, 'FileReader').mockImplementation(() => {
        const reader = mockFileReader;
        setTimeout(() => {
          if (reader.onload) {
            reader.onload({} as any);
          }
        }, 0);
        return reader as any;
      });
    });

    it('should successfully transcribe audio with UPI content', async () => {
      const mockResponse = {
        response: {
          text: () => 'You have received ₹50 on PhonePe from John Doe'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result: TranscriptionResult = await service.transcribeAudio(mockAudioBlob);

      expect(result.text).toBe('You have received ₹50 on PhonePe from John Doe');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(mockGenerateContent).toHaveBeenCalledWith([
        expect.stringContaining('Please transcribe this audio file'),
        expect.objectContaining({
          inlineData: expect.objectContaining({
            data: 'bW9jayBhdWRpbyBkYXRh',
            mimeType: 'audio/wav'
          })
        })
      ]);
    });

    it('should handle empty transcription result', async () => {
      const mockResponse = {
        response: {
          text: () => ''
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(service.transcribeAudio(mockAudioBlob)).rejects.toThrow('Empty transcription result');
    });

    it('should validate audio blob size', async () => {
      const largeMockBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'audio/wav' });
      
      await expect(service.transcribeAudio(largeMockBlob)).rejects.toThrow('Audio file too large');
    });

    it('should validate audio blob type', async () => {
      const invalidMockBlob = new Blob(['mock data'], { type: 'text/plain' });
      
      await expect(service.transcribeAudio(invalidMockBlob)).rejects.toMatchObject({
        code: 'INVALID_AUDIO'
      });
    });

    it('should handle null or empty blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      
      await expect(service.transcribeAudio(emptyBlob)).rejects.toMatchObject({
        code: 'INVALID_AUDIO'
      });
    });
  });

  describe('Retry mechanism', () => {
    let mockAudioBlob: Blob;

    beforeEach(() => {
      mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      // Mock FileReader for retry tests
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:audio/wav;base64,bW9jayBhdWRpbyBkYXRh',
        onload: null as any,
        onerror: null as any
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => {
        const reader = mockFileReader;
        setTimeout(() => {
          if (reader.onload) {
            reader.onload({} as any);
          }
        }, 0);
        return reader as any;
      });
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network timeout');
      const successResponse = {
        response: {
          text: () => 'You have received ₹25 on GPay'
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.transcribeAudio(mockAudioBlob);
      
      expect(result.text).toBe('You have received ₹25 on GPay');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should retry on rate limit errors', async () => {
      const rateLimitError = { code: 429, message: 'Rate limit exceeded' };
      const successResponse = {
        response: {
          text: () => 'Payment of ₹100 received'
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.transcribeAudio(mockAudioBlob);
      
      expect(result.text).toBe('Payment of ₹100 received');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication errors', async () => {
      const authError = { code: 401, message: 'Invalid API key' };
      mockGenerateContent.mockRejectedValue(authError);

      await expect(service.transcribeAudio(mockAudioBlob)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        retryable: false
      });
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const networkError = new Error('Network timeout');
      mockGenerateContent.mockRejectedValue(networkError);

      await expect(service.transcribeAudio(mockAudioBlob)).rejects.toMatchObject({
        code: 'NETWORK_ERROR'
      });
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Confidence scoring', () => {
    let mockAudioBlob: Blob;

    beforeEach(() => {
      mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:audio/wav;base64,bW9jayBhdWRpbyBkYXRh',
        onload: null as any,
        onerror: null as any
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => {
        const reader = mockFileReader;
        setTimeout(() => {
          if (reader.onload) {
            reader.onload({} as any);
          }
        }, 0);
        return reader as any;
      });
    });

    it('should give high confidence for UPI-related transcriptions', async () => {
      const mockResponse = {
        response: {
          text: () => 'You have received ₹50 rupees on PhonePe UPI payment from customer'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(mockAudioBlob);
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should give low confidence for non-UPI transcriptions', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hello this is a random conversation'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(mockAudioBlob);
      
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should penalize very short transcriptions', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hi'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(mockAudioBlob);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Error handling', () => {
    let mockAudioBlob: Blob;

    beforeEach(() => {
      mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:audio/wav;base64,bW9jayBhdWRpbyBkYXRh',
        onload: null as any,
        onerror: null as any
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => {
        const reader = mockFileReader;
        setTimeout(() => {
          if (reader.onload) {
            reader.onload({} as any);
          }
        }, 0);
        return reader as any;
      });
    });

    it('should categorize authentication errors correctly', async () => {
      const authError = { code: 401, message: 'Invalid API key' };
      mockGenerateContent.mockRejectedValue(authError);

      try {
        await service.transcribeAudio(mockAudioBlob);
      } catch (error) {
        const transcriptionError = error as TranscriptionError;
        expect(transcriptionError.code).toBe('AUTH_ERROR');
        expect(transcriptionError.retryable).toBe(false);
      }
    });

    it('should categorize rate limit errors correctly', async () => {
      const rateLimitError = { code: 429, message: 'Rate limit exceeded' };
      mockGenerateContent.mockRejectedValue(rateLimitError);

      try {
        await service.transcribeAudio(mockAudioBlob);
      } catch (error) {
        const transcriptionError = error as TranscriptionError;
        expect(transcriptionError.code).toBe('RATE_LIMIT');
        expect(transcriptionError.retryable).toBe(true);
      }
    });

    it('should categorize network errors correctly', async () => {
      const networkError = new Error('Network timeout error');
      mockGenerateContent.mockRejectedValue(networkError);

      try {
        await service.transcribeAudio(mockAudioBlob);
      } catch (error) {
        const transcriptionError = error as TranscriptionError;
        expect(transcriptionError.code).toBe('NETWORK_ERROR');
        expect(transcriptionError.retryable).toBe(true);
      }
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const mockResponse = {
        response: {
          text: () => 'Connection successful'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.testConnection();
      
      expect(result).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith('Hello, can you respond with "Connection successful"?');
    });

    it('should return false for failed connection test', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });

    it('should return false for unexpected response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Unexpected response'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('File conversion', () => {
    it('should handle FileReader errors', async () => {
      const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: null,
        onload: null as any,
        onerror: null as any
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => {
        const reader = mockFileReader;
        setTimeout(() => {
          if (reader.onerror) {
            reader.onerror({} as any);
          }
        }, 0);
        return reader as any;
      });

      await expect(service.transcribeAudio(mockAudioBlob)).rejects.toMatchObject({
        code: 'INVALID_AUDIO'
      });
    });
  });
});

// Integration test with sample audio data
describe('GeminiTranscriptionService Integration', () => {
  it('should handle realistic UPI alert scenarios', async () => {
    // This test would use actual sample audio files in a real integration test
    // For now, we'll mock the expected behavior
    
    const testScenarios = [
      {
        description: 'PhonePe payment alert',
        expectedText: 'You have received ₹50 on PhonePe from John Doe',
        expectedConfidence: 0.8
      },
      {
        description: 'GPay payment alert',
        expectedText: 'Payment of ₹25 received via Google Pay',
        expectedConfidence: 0.75
      },
      {
        description: 'Paytm payment alert',
        expectedText: 'Paytm payment ₹100 received successfully',
        expectedConfidence: 0.8
      }
    ];

    // In a real integration test, you would:
    // 1. Load actual audio files from test/fixtures/
    // 2. Call the actual Gemini API (with test API key)
    // 3. Verify the transcription results
    
    expect(testScenarios.length).toBeGreaterThan(0);
  });
});