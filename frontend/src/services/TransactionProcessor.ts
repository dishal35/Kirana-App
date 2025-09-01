/**
 * TransactionProcessor Service
 * 
 * Integrates audio transcription with amount extraction to process UPI transactions
 */

import { AmountExtractor, type AmountExtractionResult } from './AmountExtractor';
import { GeminiTranscriptionService } from './GeminiTranscription';
import type { TransactionResult, Product } from '../types';

export class TransactionProcessor {
  private amountExtractor: AmountExtractor;
  private geminiTranscription: GeminiTranscriptionService;

  constructor() {
    this.amountExtractor = new AmountExtractor();
    this.geminiTranscription = new GeminiTranscriptionService();
  }

  /**
   * Process audio blob to extract transaction information
   */
  async processAudio(audioBlob: Blob): Promise<TransactionResult> {
    try {
      // Step 1: Transcribe audio using Gemini
      const transcriptionResult = await this.geminiTranscription.transcribeAudio(audioBlob);
      
      if (!transcriptionResult.text) {
        throw new Error('Failed to transcribe audio: No text returned');
      }

      // Step 2: Extract amount from transcription
      const extractionResult = this.amountExtractor.extractAmount(transcriptionResult.text);
      
      // Step 3: Validate extraction meets confidence threshold
      if (!this.amountExtractor.validateExtraction(extractionResult, 0.3)) {
        // If no UPI pattern found, this might not be a payment alert
        console.log('No UPI payment detected in audio:', transcriptionResult.text);
        throw new Error('No UPI payment detected in audio');
      }

      return {
        amount: extractionResult.amount!,
        confidence: extractionResult.confidence,
        suggestedProducts: [], // Will be populated by the calling service
        transcription: transcriptionResult.text,
      };

    } catch (error) {
      console.error('Error processing audio transaction:', error);
      throw error;
    }
  }

  /**
   * Process text transcription to extract transaction information
   */
  processText(transcription: string): TransactionResult {
    try {
      // Extract amount from transcription
      const extractionResult = this.amountExtractor.extractAmount(transcription);
      
      // Validate extraction meets confidence threshold
      if (!this.amountExtractor.validateExtraction(extractionResult, 0.5)) {
        throw new Error('Amount extraction failed validation');
      }

      return {
        amount: extractionResult.amount!,
        confidence: extractionResult.confidence,
        suggestedProducts: [], // Will be populated by the calling service
        transcription,
      };

    } catch (error) {
      console.error('Error processing text transaction:', error);
      throw error;
    }
  }
}