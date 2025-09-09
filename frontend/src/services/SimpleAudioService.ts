/**
 * SIMPLIFIED AudioService for MVP
 * Combines audio capture + transcription in one service
 */

import { geminiTranscriptionService } from './GeminiTranscription';

interface TransactionResult {
  amount: number;
  transcription: string;
  confidence: number;
}

export class SimpleAudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListening = false;

  // Start listening for audio
  async startListening(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.processAudio();
      };

      this.mediaRecorder.start();
      this.isListening = true;
      
      // Auto-stop after 10 seconds (simple approach)
      setTimeout(() => this.stopListening(), 10000);
    } catch (error) {
      console.error('Failed to start audio:', error);
      throw error;
    }
  }

  stopListening(): void {
    if (this.mediaRecorder && this.isListening) {
      this.mediaRecorder.stop();
      this.isListening = false;
    }
  }

  private async processAudio(): Promise<TransactionResult | null> {
    if (this.audioChunks.length === 0) return null;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
    this.audioChunks = []; // Clear chunks

    try {
      // Transcribe with Gemini
      const result = await geminiTranscriptionService.transcribeAudio(audioBlob);
      
      // Extract amount (simple regex)
      const amount = this.extractAmount(result.text);
      
      if (amount) {
        return {
          amount,
          transcription: result.text,
          confidence: result.confidence
        };
      }
    } catch (error) {
      console.error('Audio processing failed:', error);
    }
    
    return null;
  }

  private extractAmount(text: string): number | null {
    // Simple regex for ₹XX or XX rupees
    const patterns = [
      /₹\s*(\d+)/,
      /(\d+)\s*rupees?/i,
      /received\s+₹?(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  }
}

export const audioService = new SimpleAudioService();
