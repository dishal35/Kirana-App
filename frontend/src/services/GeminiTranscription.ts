import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '../config/env';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface TranscriptionError {
  code: 'API_ERROR' | 'NETWORK_ERROR' | 'INVALID_AUDIO' | 'RATE_LIMIT' | 'AUTH_ERROR';
  message: string;
  retryable: boolean;
}

export class GeminiTranscriptionService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    try {
      const apiKey = getGeminiApiKey();
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use Gemini 1.5 Flash for audio processing
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      throw new Error(`Failed to initialize Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio blob to text using Gemini API
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    try {
      // Validate audio blob
      this.validateAudioBlob(audioBlob);

      // Convert blob to base64 for Gemini API
      const audioData = await this.blobToBase64(audioBlob);
      
      // Perform transcription with retry mechanism
      const transcriptionText = await this.transcribeWithRetry(audioData, audioBlob.type);
      
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(transcriptionText);

      return {
        text: transcriptionText,
        confidence,
        processingTime
      };
    } catch (error) {
      throw this.handleTranscriptionError(error);
    }
  }

  /**
   * Transcribe with exponential backoff retry mechanism
   */
  private async transcribeWithRetry(audioData: string, mimeType: string, attempt: number = 1): Promise<string> {
    try {
      const prompt = `
        Please transcribe this audio file. This is likely a UPI payment notification from an Indian payment app like PhonePe, GPay, or Paytm.
        
        Focus on:
        1. The exact amount mentioned (in rupees)
        2. The payment app name if mentioned
        3. Any transaction details
        
        Provide only the transcription text, no additional commentary.
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: audioData,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty transcription result');
      }

      return text.trim();
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
        return this.transcribeWithRetry(audioData, mimeType, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:audio/wav;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to convert audio to base64'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Validate audio blob before processing
   */
  private validateAudioBlob(blob: Blob): void {
    if (!blob || blob.size === 0) {
      throw new Error('Invalid audio blob: empty or null');
    }

    if (blob.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Audio file too large (max 10MB)');
    }

    // Extract base MIME type (remove codec specifications)
    const baseMimeType = blob.type.split(';')[0];
    const supportedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
    
    if (!supportedTypes.includes(baseMimeType)) {
      throw new Error(`Unsupported audio type: ${blob.type} (base: ${baseMimeType})`);
    }
  }

  /**
   * Calculate confidence score based on transcription characteristics
   */
  private calculateConfidence(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    let confidence = 0.5; // Base confidence

    // Check for UPI-related keywords
    const upiKeywords = ['rupees', 'received', 'phonepe', 'gpay', 'paytm', 'upi', 'payment'];
    const keywordMatches = upiKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    confidence += keywordMatches * 0.1;

    // Check for amount patterns
    const amountPattern = /₹?\s*\d+(\.\d{2})?/g;
    if (amountPattern.test(text)) {
      confidence += 0.2;
    }

    // Penalize very short or very long transcriptions
    if (text.length < 10) {
      confidence -= 0.2;
    } else if (text.length > 200) {
      confidence -= 0.1;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;

    // Network errors are retryable
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return true;
    }

    // Rate limit errors are retryable
    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return true;
    }

    // Temporary server errors are retryable
    if (errorCode >= 500 && errorCode < 600) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle and categorize transcription errors
   */
  private handleTranscriptionError(error: any): TranscriptionError {
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code || error.status;

    if (errorMessage.includes('API key') || errorCode === 401) {
      return {
        code: 'AUTH_ERROR',
        message: 'Invalid or missing Gemini API key',
        retryable: false
      };
    }

    if (errorCode === 429 || errorMessage.includes('rate limit')) {
      return {
        code: 'RATE_LIMIT',
        message: 'API rate limit exceeded',
        retryable: true
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        retryable: true
      };
    }

    if (errorMessage.includes('audio') || errorMessage.includes('Invalid')) {
      return {
        code: 'INVALID_AUDIO',
        message: 'Invalid or corrupted audio file',
        retryable: false
      };
    }

    return {
      code: 'API_ERROR',
      message: errorMessage,
      retryable: this.isRetryableError(error)
    };
  }

  /**
   * Test the service with a simple text generation
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello, can you respond with "Connection successful"?');
      const response = await result.response;
      const text = response.text();
      return text.toLowerCase().includes('connection successful');
    } catch (error) {
      console.error('Gemini API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const geminiTranscriptionService = new GeminiTranscriptionService();