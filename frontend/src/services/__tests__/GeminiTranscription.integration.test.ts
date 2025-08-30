import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiTranscriptionService } from '../GeminiTranscription';
import { 
  sampleUPIAlerts, 
  sampleNonUPIAudio, 
  integrationTestScenarios,
  mockFileReader 
} from '../../test/fixtures/sampleAudio';

// Mock the Google Generative AI for integration tests
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

// Mock the config
vi.mock('../../config/env', () => ({
  getGeminiApiKey: vi.fn().mockReturnValue('test-integration-api-key')
}));

describe('GeminiTranscriptionService Integration Tests', () => {
  let service: GeminiTranscriptionService;
  let mockModel: any;
  let mockGenerateContent: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockGenerateContent = vi.fn();
    mockModel = {
      generateContent: mockGenerateContent
    };

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel)
    }));

    service = new GeminiTranscriptionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('UPI Alert Transcription Scenarios', () => {
    it.each(sampleUPIAlerts)('should transcribe $name correctly', async (sampleData) => {
      // Mock FileReader
      mockFileReader('data:audio/wav;base64,bW9jayBhdWRpbyBkYXRh');

      // Mock successful Gemini response
      const mockResponse = {
        response: {
          text: () => sampleData.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(sampleData.blob);

      expect(result.text).toBe(sampleData.expectedTranscription);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      // Verify the API was called with correct parameters
      expect(mockGenerateContent).toHaveBeenCalledWith([
        expect.stringContaining('Please transcribe this audio file'),
        expect.objectContaining({
          inlineData: expect.objectContaining({
            data: expect.any(String),
            mimeType: sampleData.blob.type
          })
        })
      ]);
    });

    it('should handle PhonePe specific alerts with high confidence', async () => {
      const phonePeAlert = sampleUPIAlerts.find(alert => alert.paymentApp === 'PhonePe')!;
      
      mockFileReader('data:audio/wav;base64,cGhvbmVwZSBhdWRpbw==');

      const mockResponse = {
        response: {
          text: () => phonePeAlert.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(phonePeAlert.blob);

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.text).toContain('PhonePe');
      expect(result.text).toContain('₹50');
    });

    it('should handle GPay specific alerts with high confidence', async () => {
      const gPayAlert = sampleUPIAlerts.find(alert => alert.paymentApp === 'GPay')!;
      
      mockFileReader('data:audio/wav;base64,Z3BheWF1ZGlv');

      const mockResponse = {
        response: {
          text: () => gPayAlert.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(gPayAlert.blob);

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.text).toContain('Google Pay');
      expect(result.text).toContain('₹25');
    });

    it('should handle multilingual UPI alerts', async () => {
      const hindiAlert = sampleUPIAlerts.find(alert => alert.name === 'upi_75_rupees_hindi')!;
      
      mockFileReader('data:audio/wav;base64,aGluZGlhdWRpbw==');

      const mockResponse = {
        response: {
          text: () => hindiAlert.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(hindiAlert.blob);

      expect(result.text).toContain('₹75');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Non-UPI Audio Scenarios', () => {
    it.each(sampleNonUPIAudio)('should handle $name with appropriate confidence', async (sampleData) => {
      mockFileReader('data:audio/wav;base64,bm9udXBpYXVkaW8=');

      const mockResponse = {
        response: {
          text: () => sampleData.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(sampleData.blob);

      expect(result.text).toBe(sampleData.expectedTranscription);
      // Non-UPI audio should have lower confidence
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should give low confidence for random conversations', async () => {
      const randomConversation = sampleNonUPIAudio.find(audio => audio.name === 'random_conversation')!;
      
      mockFileReader('data:audio/wav;base64,cmFuZG9tYXVkaW8=');

      const mockResponse = {
        response: {
          text: () => randomConversation.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(randomConversation.blob);

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.text).not.toContain('₹');
      expect(result.text).not.toContain('received');
    });
  });

  describe('Error Handling Integration', () => {
    it.each(integrationTestScenarios.filter(s => !s.shouldSucceed))(
      'should handle $name error scenario',
      async (scenario) => {
        if (scenario.expectedError) {
          await expect(service.transcribeAudio(scenario.audioBlob))
            .rejects.toMatchObject({
              code: 'INVALID_AUDIO'
            });
        }
      }
    );

    it('should handle API timeout with retry', async () => {
      const validAudio = sampleUPIAlerts[0];
      mockFileReader('data:audio/wav;base64,dGltZW91dGF1ZGlv');

      const timeoutError = new Error('Request timeout');
      const successResponse = {
        response: {
          text: () => validAudio.expectedTranscription
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const result = await service.transcribeAudio(validAudio.blob);

      expect(result.text).toBe(validAudio.expectedTranscription);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const validAudio = sampleUPIAlerts[1];
      mockFileReader('data:audio/wav;base64,cmF0ZWxpbWl0YXVkaW8=');

      const rateLimitError = { code: 429, message: 'Rate limit exceeded' };
      const successResponse = {
        response: {
          text: () => validAudio.expectedTranscription
        }
      };

      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const startTime = Date.now();
      const result = await service.transcribeAudio(validAudio.blob);
      const endTime = Date.now();

      expect(result.text).toBe(validAudio.expectedTranscription);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      // Should have some delay due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });

  describe('Performance and Reliability', () => {
    it('should process multiple audio files concurrently', async () => {
      const audioFiles = sampleUPIAlerts.slice(0, 3);
      
      mockFileReader('data:audio/wav;base64,Y29uY3VycmVudGF1ZGlv');

      // Mock responses for each file
      audioFiles.forEach((audio, index) => {
        const mockResponse = {
          response: {
            text: () => audio.expectedTranscription
          }
        };
        mockGenerateContent.mockResolvedValueOnce(mockResponse);
      });

      const promises = audioFiles.map(audio => service.transcribeAudio(audio.blob));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.text).toBe(audioFiles[index].expectedTranscription);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    }, 10000); // Increase timeout to 10 seconds

    it('should maintain performance under load', async () => {
      const testAudio = sampleUPIAlerts[0];
      mockFileReader('data:audio/wav;base64,cGVyZm9ybWFuY2VhdWRpbw==');

      const mockResponse = {
        response: {
          text: () => testAudio.expectedTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const iterations = 5; // Reduce iterations for faster test
      const promises = Array(iterations).fill(null).map(() => 
        service.transcribeAudio(testAudio.blob)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(iterations);
      results.forEach(result => {
        expect(result.text).toBe(testAudio.expectedTranscription);
      });

      // Average processing time should be reasonable (less than 2 seconds per request)
      const avgTime = (endTime - startTime) / iterations;
      expect(avgTime).toBeLessThan(2000);
    }, 15000); // Increase timeout to 15 seconds
  });

  describe('Connection Testing', () => {
    it('should successfully test API connection', async () => {
      const mockResponse = {
        response: {
          text: () => 'Connection successful'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const isConnected = await service.testConnection();

      expect(isConnected).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        'Hello, can you respond with "Connection successful"?'
      );
    });

    it('should detect connection failures', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const isConnected = await service.testConnection();

      expect(isConnected).toBe(false);
    });

    it('should handle unexpected API responses during connection test', async () => {
      const mockResponse = {
        response: {
          text: () => 'Unexpected response format'
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const isConnected = await service.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle noisy environment audio', async () => {
      mockFileReader('data:audio/wav;base64,bm9pc3lhdWRpbw==');

      // Simulate transcription with background noise
      const noisyTranscription = 'You have received ₹30 on PhonePe [background noise] from customer';
      const mockResponse = {
        response: {
          text: () => noisyTranscription
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.transcribeAudio(sampleUPIAlerts[0].blob);

      expect(result.text).toContain('₹30');
      expect(result.text).toContain('PhonePe');
      // Confidence might be lower due to noise
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should handle different audio formats', async () => {
      const formats = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'];
      
      for (const format of formats) {
        const audioBlob = new Blob(['test audio'], { type: format });
        mockFileReader(`data:${format};base64,dGVzdGF1ZGlv`);

        const mockResponse = {
          response: {
            text: () => 'Payment of ₹20 received'
          }
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await service.transcribeAudio(audioBlob);
        expect(result.text).toContain('₹20');
      }
    });
  });
});