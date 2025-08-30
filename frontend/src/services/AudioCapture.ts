/**
 * Audio Capture Service for UPI Transaction Detection
 * 
 * This service provides comprehensive audio capture functionality including:
 * - MediaRecorder wrapper with proper error handling
 * - Voice Activity Detection (VAD) for UPI alert patterns
 * - Audio quality validation and noise filtering
 * - Temporary storage management for audio blobs
 * - User-friendly permission handling
 */

export interface AudioQualityMetrics {
  volume: number;
  noiseLevel: number;
  clarity: number;
  isAcceptable: boolean;
}

export interface AudioCaptureConfig {
  vadThreshold?: number;
  noiseThreshold?: number;
  minRecordingDuration?: number;
  maxRecordingDuration?: number;
  sampleRate?: number;
  enableNoiseFiltering?: boolean;
}

export interface AudioCaptureService {
  startListening(): Promise<void>;
  stopListening(): void;
  onAudioDetected: (audioBlob: Blob, quality: AudioQualityMetrics) => void;
  onPermissionError: (error: string) => void;
  onQualityIssue: (issue: string, metrics: AudioQualityMetrics) => void;
  isListening: boolean;
  getStoredAudioCount(): number;
  clearStoredAudio(): void;
  getAudioQuality(audioBlob: Blob): Promise<AudioQualityMetrics>;
}

class AudioCaptureServiceImpl implements AudioCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private vadProcessor: ScriptProcessorNode | null = null;
  
  // Temporary storage for audio blobs
  private temporaryStorage: Map<string, { blob: Blob; timestamp: number; quality: AudioQualityMetrics }> = new Map();
  private storageCleanupInterval: NodeJS.Timeout | null = null;
  
  // Voice Activity Detection state
  private vadBuffer: Float32Array[] = [];
  private vadBufferSize = 10; // Keep last 10 audio frames for analysis
  private isVoiceActive = false;
  private voiceStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  
  public isListening: boolean = false;
  public onAudioDetected: (audioBlob: Blob, quality: AudioQualityMetrics) => void = () => {};
  public onPermissionError: (error: string) => void = () => {};
  public onQualityIssue: (issue: string, metrics: AudioQualityMetrics) => void = () => {};

  private config: Required<AudioCaptureConfig>;

  constructor(config: AudioCaptureConfig = {}) {
    this.config = {
      vadThreshold: config.vadThreshold ?? 0.01,
      noiseThreshold: config.noiseThreshold ?? 0.005,
      minRecordingDuration: config.minRecordingDuration ?? 1000, // 1 second
      maxRecordingDuration: config.maxRecordingDuration ?? 10000, // 10 seconds
      sampleRate: config.sampleRate ?? 44100,
      enableNoiseFiltering: config.enableNoiseFiltering ?? true
    };

    // Start cleanup interval for temporary storage (clean every 5 minutes)
    this.storageCleanupInterval = setInterval(() => {
      this.cleanupExpiredAudio();
    }, 5 * 60 * 1000);
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log("Already listening");
      return;
    }

    try {
      // Request microphone access with specific constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1, // Mono audio for better processing
          echoCancellation: true,
          noiseSuppression: this.config.enableNoiseFiltering,
          autoGainControl: true
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!this.mediaStream) {
        this.onPermissionError("Microphone access denied");
        return;
      }

      // Initialize audio analysis components
      await this.initializeAudioAnalysis();
      
      // Initialize MediaRecorder
      this.initializeMediaRecorder();
      
      this.isListening = true;
      console.log("Audio capture started with VAD");

    } catch (error) {
      console.error("Error starting audio capture", error);
      this.handlePermissionError(error);
      throw error;
    }
  }

  private async initializeAudioAnalysis(): Promise<void> {
    if (!this.mediaStream) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      
      // Configure analyser for voice activity detection
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      // Create script processor for real-time analysis
      this.vadProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      // Connect audio graph
      this.mediaStreamSource.connect(this.analyserNode);
      this.analyserNode.connect(this.vadProcessor);
      this.vadProcessor.connect(this.audioContext.destination);
      
      // Set up voice activity detection
      this.vadProcessor.onaudioprocess = (event) => {
        this.processAudioForVAD(event.inputBuffer.getChannelData(0));
      };
      
    } catch (error) {
      console.error("Failed to initialize audio analysis:", error);
      throw error;
    }
  }

  private initializeMediaRecorder(): void {
    if (!this.mediaStream) return;

    try {
      // Use the best available audio format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000 // Good quality for speech
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processRecordedAudio();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        this.onPermissionError("Recording error occurred. Please try again.");
      };

    } catch (error) {
      console.error("Failed to initialize MediaRecorder:", error);
      throw error;
    }
  }

  private processAudioForVAD(audioData: Float32Array): void {
    // Calculate audio metrics
    const energy = this.calculateRMSEnergy(audioData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(audioData);
    
    // Update VAD buffer
    this.vadBuffer.push(audioData.slice());
    if (this.vadBuffer.length > this.vadBufferSize) {
      this.vadBuffer.shift();
    }

    // Determine if voice is currently active
    const currentVoiceActive = energy > this.config.vadThreshold && zeroCrossingRate > 0.1;
    
    // Handle voice activity state changes
    if (currentVoiceActive && !this.isVoiceActive) {
      // Voice activity started
      this.isVoiceActive = true;
      this.voiceStartTime = Date.now();
      this.silenceStartTime = null;
      this.startRecording();
      
    } else if (!currentVoiceActive && this.isVoiceActive) {
      // Voice activity stopped
      this.silenceStartTime = Date.now();
      
    } else if (this.isVoiceActive && this.silenceStartTime) {
      // Check if silence has lasted long enough to stop recording
      const silenceDuration = Date.now() - this.silenceStartTime;
      if (silenceDuration > 500) { // 500ms of silence
        this.isVoiceActive = false;
        this.stopRecording();
      }
    }

    // Safety check for maximum recording duration
    if (this.voiceStartTime && (Date.now() - this.voiceStartTime) > this.config.maxRecordingDuration) {
      this.isVoiceActive = false;
      this.stopRecording();
    }
  }

  private startRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.audioChunks = [];
      this.mediaRecorder.start(100); // Collect data every 100ms
      console.log("Started recording due to voice activity");
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      console.log("Stopped recording due to silence");
    }
  }

  private async processRecordedAudio(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    // Check minimum duration
    const recordingDuration = this.voiceStartTime ? Date.now() - this.voiceStartTime : 0;
    if (recordingDuration < this.config.minRecordingDuration) {
      console.log("Recording too short, discarding");
      this.audioChunks = [];
      return;
    }

    // Create audio blob
    const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
    this.audioChunks = [];

    // Analyze audio quality
    const quality = await this.getAudioQuality(audioBlob);
    
    if (quality.isAcceptable) {
      // Store temporarily and notify
      this.storeAudioTemporarily(audioBlob, quality);
      this.onAudioDetected(audioBlob, quality);
    } else {
      this.onQualityIssue("Audio quality too low for processing", quality);
    }

    // Reset timing
    this.voiceStartTime = null;
    this.silenceStartTime = null;
  }

  async getAudioQuality(audioBlob: Blob): Promise<AudioQualityMetrics> {
    try {
      if (!this.audioContext) {
        // Create temporary context for analysis
        const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const metrics = this.analyzeAudioBuffer(channelData);
        
        tempContext.close();
        return metrics;
      } else {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        return this.analyzeAudioBuffer(channelData);
      }
    } catch (error) {
      console.error("Error analyzing audio quality:", error);
      return {
        volume: 0,
        noiseLevel: 1,
        clarity: 0,
        isAcceptable: false
      };
    }
  }

  private analyzeAudioBuffer(channelData: Float32Array): AudioQualityMetrics {
    const volume = this.calculateRMSEnergy(channelData);
    const noiseLevel = this.estimateNoiseLevel(channelData);
    const clarity = this.calculateClarity(channelData);
    
    // Determine if audio is acceptable for processing
    const isAcceptable = volume > 0.01 && 
                        noiseLevel < 0.5 && 
                        clarity > 0.3 &&
                        channelData.length > this.config.sampleRate * 0.5; // At least 0.5 seconds

    return {
      volume,
      noiseLevel,
      clarity,
      isAcceptable
    };
  }

  private calculateRMSEnergy(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private calculateZeroCrossingRate(buffer: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / buffer.length;
  }

  private estimateNoiseLevel(buffer: Float32Array): number {
    // Simple noise estimation using variance of high-frequency components
    const sorted = Array.from(buffer).sort((a, b) => Math.abs(a) - Math.abs(b));
    const median = Math.abs(sorted[Math.floor(sorted.length / 2)]);
    const variance = buffer.reduce((sum, sample) => sum + Math.pow(Math.abs(sample) - median, 2), 0) / buffer.length;
    return Math.sqrt(variance);
  }

  private calculateClarity(buffer: Float32Array): number {
    // Estimate clarity using signal-to-noise ratio approximation
    const energy = this.calculateRMSEnergy(buffer);
    const noise = this.estimateNoiseLevel(buffer);
    return noise > 0 ? Math.min(energy / noise, 1) : energy > 0.01 ? 1 : 0;
  }

  private storeAudioTemporarily(audioBlob: Blob, quality: AudioQualityMetrics): void {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.temporaryStorage.set(id, {
      blob: audioBlob,
      timestamp: Date.now(),
      quality
    });

    // Limit storage to prevent memory issues
    if (this.temporaryStorage.size > 50) {
      const oldestKey = Array.from(this.temporaryStorage.keys())[0];
      this.temporaryStorage.delete(oldestKey);
    }
  }

  private cleanupExpiredAudio(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, value] of this.temporaryStorage.entries()) {
      if (now - value.timestamp > maxAge) {
        this.temporaryStorage.delete(key);
      }
    }
  }

  getStoredAudioCount(): number {
    return this.temporaryStorage.size;
  }

  clearStoredAudio(): void {
    this.temporaryStorage.clear();
  }

  // Debug method to inspect storage contents (for development/testing)
  getStorageDebugInfo(): Array<{
    id: string;
    size: number;
    timestamp: Date;
    age: string;
    quality: AudioQualityMetrics;
  }> {
    const now = Date.now();
    return Array.from(this.temporaryStorage.entries()).map(([id, data]) => ({
      id,
      size: data.blob.size,
      timestamp: new Date(data.timestamp),
      age: `${Math.round((now - data.timestamp) / 1000)}s ago`,
      quality: data.quality
    }));
  }

  stopListening(): void {
    if (!this.isListening) {
      console.log("Not currently listening");
      return;
    }

    try {
      // Stop recording if active
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Clean up audio analysis
      if (this.vadProcessor) {
        this.vadProcessor.disconnect();
        this.vadProcessor.onaudioprocess = null;
        this.vadProcessor = null;
      }

      if (this.analyserNode) {
        this.analyserNode.disconnect();
        this.analyserNode = null;
      }

      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Reset state
      this.isListening = false;
      this.isVoiceActive = false;
      this.voiceStartTime = null;
      this.silenceStartTime = null;
      this.vadBuffer = [];
      this.audioChunks = [];
      this.mediaRecorder = null;

      console.log("Audio capture stopped");
    } catch (error) {
      console.error("Error stopping audio capture:", error);
    }
  }

  private handlePermissionError(error: unknown): void {
    if (error instanceof DOMException) {
      let errorMessage: string;
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = "Microphone access denied. Please enable microphone permissions in your browser settings and reload the page.";
          break;
        case 'NotFoundError':
          errorMessage = "No microphone found. Please ensure a microphone is connected and enabled.";
          break;
        case 'NotReadableError':
          errorMessage = "Microphone is already in use by another application. Please close other applications using the microphone.";
          break;
        case 'OverconstrainedError':
          errorMessage = "Microphone doesn't support the required audio settings. Please try with a different microphone.";
          break;
        case 'SecurityError':
          errorMessage = "Microphone access blocked due to security restrictions. Please ensure you're using HTTPS.";
          break;
        default:
          errorMessage = `Microphone access error: ${error.message}. Please check your browser settings and try again.`;
      }
      
      this.onPermissionError(errorMessage);
    } else {
      this.onPermissionError("An unexpected error occurred while accessing the microphone. Please try again.");
    }
  }

  // Cleanup method to be called when service is no longer needed
  destroy(): void {
    this.stopListening();
    this.clearStoredAudio();
    
    if (this.storageCleanupInterval) {
      clearInterval(this.storageCleanupInterval);
      this.storageCleanupInterval = null;
    }
  }
}

export const audioCaptureService = new AudioCaptureServiceImpl();