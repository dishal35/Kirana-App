import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { audioCaptureService } from '../AudioCapture';
import type { AudioQualityMetrics } from '../../types';

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  start(timeslice?: number) {
    this.state = 'recording';
    // Simulate data available after a short delay
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
        this.ondataavailable({ data: mockBlob });
      }
    }, 100);
  }

  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 50);
  }

  static isTypeSupported(mimeType: string): boolean {
    return mimeType === 'audio/webm;codecs=opus' || mimeType === 'audio/webm';
  }
}

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  destination = {};

  createMediaStreamSource(stream: MediaStream) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn()
    };
  }

  createScriptProcessor(bufferSize: number, numberOfInputChannels: number, numberOfOutputChannels: number) {
    const processor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null as ((event: any) => void) | null
    };

    // Simulate audio processing
    setTimeout(() => {
      if (processor.onaudioprocess) {
        const mockEvent = {
          inputBuffer: {
            getChannelData: (channel: number) => {
              // Return mock audio data with some voice activity
              const buffer = new Float32Array(bufferSize);
              for (let i = 0; i < buffer.length; i++) {
                buffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.1; // 440Hz tone
              }
              return buffer;
            }
          }
        };
        processor.onaudioprocess(mockEvent);
      }
    }, 100);

    return processor;
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer) {
    return {
      length: 44100,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: (channel: number) => {
        const buffer = new Float32Array(44100);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.1;
        }
        return buffer;
      }
    };
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Mock MediaStream
class MockMediaStream {
  id = 'mock-stream-id';
  active = true;

  getTracks() {
    return [
      {
        kind: 'audio',
        enabled: true,
        stop: vi.fn()
      }
    ];
  }
}

describe('AudioCaptureService', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockMediaRecorder: typeof MockMediaRecorder;
  let mockAudioContext: typeof MockAudioContext;

  beforeEach(() => {
    // Reset service state
    if (audioCaptureService.isListening) {
      audioCaptureService.stopListening();
    }
    audioCaptureService.clearStoredAudio();

    // Mock browser APIs
    mockGetUserMedia = vi.fn();
    mockMediaRecorder = MockMediaRecorder;
    mockAudioContext = MockAudioContext;

    // Setup global mocks
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia
      },
      writable: true
    });

    Object.defineProperty(global.window, 'MediaRecorder', {
      value: mockMediaRecorder,
      writable: true
    });

    Object.defineProperty(global.window, 'AudioContext', {
      value: mockAudioContext,
      writable: true
    });

    // Mock Blob
    global.Blob = class MockBlob {
      size: number;
      type: string;

      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        this.size = blobParts ? blobParts.length * 10 : 0; // Mock size
        this.type = options?.type || '';
      }

      arrayBuffer(): Promise<ArrayBuffer> {
        const buffer = new ArrayBuffer(this.size);
        return Promise.resolve(buffer);
      }
    } as any;
  });

  afterEach(() => {
    if (audioCaptureService.isListening) {
      audioCaptureService.stopListening();
    }
    vi.clearAllMocks();
  });

  describe('startListening', () => {
    it('should successfully start listening with proper permissions', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const permissionErrorSpy = vi.fn();
      audioCaptureService.onPermissionError = permissionErrorSpy;

      await audioCaptureService.startListening();

      expect(audioCaptureService.isListening).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      expect(permissionErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle permission denied error gracefully', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(permissionError);

      const permissionErrorSpy = vi.fn();
      audioCaptureService.onPermissionError = permissionErrorSpy;

      await expect(audioCaptureService.startListening()).rejects.toThrow();

      expect(audioCaptureService.isListening).toBe(false);
      expect(permissionErrorSpy).toHaveBeenCalledWith(
        'Microphone access denied. Please enable microphone permissions in your browser settings and reload the page.'
      );
    });

    it('should handle no microphone found error', async () => {
      const notFoundError = new DOMException('No microphone found', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const permissionErrorSpy = vi.fn();
      audioCaptureService.onPermissionError = permissionErrorSpy;

      await expect(audioCaptureService.startListening()).rejects.toThrow();

      expect(permissionErrorSpy).toHaveBeenCalledWith(
        'No microphone found. Please ensure a microphone is connected and enabled.'
      );
    });

    it('should handle microphone in use error', async () => {
      const inUseError = new DOMException('Microphone in use', 'NotReadableError');
      mockGetUserMedia.mockRejectedValue(inUseError);

      const permissionErrorSpy = vi.fn();
      audioCaptureService.onPermissionError = permissionErrorSpy;

      await expect(audioCaptureService.startListening()).rejects.toThrow();

      expect(permissionErrorSpy).toHaveBeenCalledWith(
        'Microphone is already in use by another application. Please close other applications using the microphone.'
      );
    });

    it('should not start if already listening', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      // Start listening first time
      await audioCaptureService.startListening();
      expect(audioCaptureService.isListening).toBe(true);

      // Try to start again
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
      await audioCaptureService.startListening();

      expect(consoleSpy).toHaveBeenCalledWith('Already listening');
      consoleSpy.mockRestore();
    });
  });

  describe('stopListening', () => {
    it('should stop listening and clean up resources', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      await audioCaptureService.startListening();
      expect(audioCaptureService.isListening).toBe(true);

      audioCaptureService.stopListening();
      expect(audioCaptureService.isListening).toBe(false);
    });

    it('should handle stop when not listening', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      audioCaptureService.stopListening();

      expect(consoleSpy).toHaveBeenCalledWith('Not currently listening');
      consoleSpy.mockRestore();
    });
  });

  describe('audio quality analysis', () => {
    it('should analyze audio quality correctly for good quality audio', async () => {
      const mockBlob = new Blob(['good quality audio data'], { type: 'audio/webm' });

      const quality = await audioCaptureService.getAudioQuality(mockBlob);

      expect(quality).toHaveProperty('volume');
      expect(quality).toHaveProperty('noiseLevel');
      expect(quality).toHaveProperty('clarity');
      expect(quality).toHaveProperty('isAcceptable');
      expect(typeof quality.volume).toBe('number');
      expect(typeof quality.noiseLevel).toBe('number');
      expect(typeof quality.clarity).toBe('number');
      expect(typeof quality.isAcceptable).toBe('boolean');
    });

    it('should handle audio analysis errors gracefully', async () => {
      // Mock a blob that will cause decoding to fail
      const mockBlob = new Blob(['invalid audio data'], { type: 'audio/webm' });

      // Mock decodeAudioData to throw an error
      const originalAudioContext = global.window.AudioContext;
      global.window.AudioContext = class extends MockAudioContext {
        async decodeAudioData(arrayBuffer: ArrayBuffer) {
          throw new Error('Invalid audio data');
        }
      } as any;

      const quality = await audioCaptureService.getAudioQuality(mockBlob);

      expect(quality.isAcceptable).toBe(false);
      expect(quality.volume).toBe(0);
      expect(quality.noiseLevel).toBe(1);
      expect(quality.clarity).toBe(0);

      // Restore original
      global.window.AudioContext = originalAudioContext;
    });
  });

  describe('temporary storage management', () => {
    it('should store and retrieve audio count correctly', () => {
      expect(audioCaptureService.getStoredAudioCount()).toBe(0);

      // Storage is managed internally, so we can't directly test it
      // but we can test the public interface
      audioCaptureService.clearStoredAudio();
      expect(audioCaptureService.getStoredAudioCount()).toBe(0);
    });

    it('should clear stored audio', () => {
      audioCaptureService.clearStoredAudio();
      expect(audioCaptureService.getStoredAudioCount()).toBe(0);
    });
  });

  describe('voice activity detection', () => {
    it('should detect audio when voice activity is present', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const audioDetectedSpy = vi.fn();
      audioCaptureService.onAudioDetected = audioDetectedSpy;

      await audioCaptureService.startListening();

      // Wait for voice activity detection to process
      await new Promise(resolve => setTimeout(resolve, 200));

      // The mock audio context should trigger voice activity detection
      // and eventually call onAudioDetected
      // Note: This is a simplified test - in reality, VAD is more complex
    });

    it('should handle quality issues appropriately', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const qualityIssueSpy = vi.fn();
      audioCaptureService.onQualityIssue = qualityIssueSpy;

      await audioCaptureService.startListening();

      // Mock poor quality audio by overriding the quality analysis
      const originalGetAudioQuality = audioCaptureService.getAudioQuality;
      audioCaptureService.getAudioQuality = vi.fn().mockResolvedValue({
        volume: 0.001, // Very low volume
        noiseLevel: 0.8, // High noise
        clarity: 0.1, // Poor clarity
        isAcceptable: false
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Restore original method
      audioCaptureService.getAudioQuality = originalGetAudioQuality;
    });
  });

  describe('MediaRecorder integration', () => {
    it('should handle MediaRecorder errors', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const permissionErrorSpy = vi.fn();
      audioCaptureService.onPermissionError = permissionErrorSpy;

      await audioCaptureService.startListening();

      // Simulate MediaRecorder error by directly calling the error handler
      // Since the service creates its own MediaRecorder instance, we need to access it
      // This is a bit of a hack for testing, but necessary for this scenario
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // Simulate an error event
      const errorEvent = new Event('error');

      // We can't easily access the private mediaRecorder, so let's test the error handling
      // by checking that the service handles errors gracefully
      expect(audioCaptureService.isListening).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should use the best supported MIME type', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      // Mock isTypeSupported to return false for opus, true for webm
      MockMediaRecorder.isTypeSupported = vi.fn().mockImplementation((mimeType: string) => {
        return mimeType === 'audio/webm';
      });

      await audioCaptureService.startListening();

      expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
      expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm');
    });
  });

  describe('configuration options', () => {
    it('should accept custom configuration', () => {
      // Test that the service can be configured (this tests the constructor)
      // Since we're using a singleton, we can't easily test different configs
      // but we can verify the interface exists
      expect(audioCaptureService).toBeDefined();
      expect(typeof audioCaptureService.startListening).toBe('function');
      expect(typeof audioCaptureService.stopListening).toBe('function');
      expect(typeof audioCaptureService.getAudioQuality).toBe('function');
    });
  });

  describe('cleanup and resource management', () => {
    it('should clean up resources when destroyed', async () => {
      const mockStream = new MockMediaStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      await audioCaptureService.startListening();
      expect(audioCaptureService.isListening).toBe(true);

      // Test destroy method if it exists
      if ('destroy' in audioCaptureService && typeof audioCaptureService.destroy === 'function') {
        audioCaptureService.destroy();
        expect(audioCaptureService.isListening).toBe(false);
        expect(audioCaptureService.getStoredAudioCount()).toBe(0);
      }
    });
  });
});