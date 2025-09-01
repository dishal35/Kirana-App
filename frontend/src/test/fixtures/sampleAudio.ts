/**
 * Sample audio data and utilities for testing Gemini transcription service
 */

export interface SampleAudioData {
  name: string;
  description: string;
  expectedTranscription: string;
  expectedAmount?: number;
  paymentApp?: string;
  blob: Blob;
}

/**
 * Create a mock audio blob for testing
 */
export function createMockAudioBlob(
  content: string = 'mock audio data',
  mimeType: string = 'audio/wav'
): Blob {
  return new Blob([content], { type: mimeType });
}

/**
 * Sample UPI alert audio data for testing
 */
export const sampleUPIAlerts: SampleAudioData[] = [
  {
    name: 'phonepe_50_rupees',
    description: 'PhonePe payment alert for ₹50',
    expectedTranscription: 'You have received ₹50 on PhonePe from John Doe',
    expectedAmount: 50,
    paymentApp: 'PhonePe',
    blob: createMockAudioBlob('phonepe payment fifty rupees received')
  },
  {
    name: 'gpay_25_rupees',
    description: 'Google Pay payment alert for ₹25',
    expectedTranscription: 'Payment of ₹25 received via Google Pay',
    expectedAmount: 25,
    paymentApp: 'GPay',
    blob: createMockAudioBlob('google pay twenty five rupees payment received')
  },
  {
    name: 'paytm_100_rupees',
    description: 'Paytm payment alert for ₹100',
    expectedTranscription: 'Paytm payment ₹100 received successfully',
    expectedAmount: 100,
    paymentApp: 'Paytm',
    blob: createMockAudioBlob('paytm one hundred rupees payment successful')
  },
  {
    name: 'upi_75_rupees_hindi',
    description: 'UPI payment alert in Hindi for ₹75',
    expectedTranscription: 'आपको ₹75 का भुगतान प्राप्त हुआ है',
    expectedAmount: 75,
    paymentApp: 'UPI',
    blob: createMockAudioBlob('upi payment seventy five rupees hindi')
  }
];

/**
 * Sample non-UPI audio data for testing
 */
export const sampleNonUPIAudio: SampleAudioData[] = [
  {
    name: 'random_conversation',
    description: 'Random conversation not related to payments',
    expectedTranscription: 'Hello, how are you doing today?',
    blob: createMockAudioBlob('random conversation hello how are you')
  },
  {
    name: 'music_snippet',
    description: 'Music or song snippet',
    expectedTranscription: 'La la la, music playing in background',
    blob: createMockAudioBlob('music song playing background noise')
  },
  {
    name: 'noise_only',
    description: 'Background noise without clear speech',
    expectedTranscription: 'Unclear audio with background noise',
    blob: createMockAudioBlob('background noise unclear audio static')
  }
];

/**
 * Sample corrupted or invalid audio data for testing error handling
 */
export const sampleInvalidAudio = [
  {
    name: 'empty_blob',
    description: 'Empty audio blob',
    blob: new Blob([], { type: 'audio/wav' })
  },
  {
    name: 'invalid_type',
    description: 'Invalid MIME type',
    blob: new Blob(['test data'], { type: 'text/plain' })
  },
  {
    name: 'large_file',
    description: 'File exceeding size limit',
    blob: new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'audio/wav' })
  }
];

/**
 * Utility to create audio blob from base64 data
 */
export function base64ToBlob(base64Data: string, mimeType: string = 'audio/wav'): Blob {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Mock FileReader for testing
 */
export function mockFileReader(result: string) {
  const mockReader = {
    readAsDataURL: vi.fn(),
    result,
    onload: null as any,
    onerror: null as any
  };

  global.FileReader = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      if (mockReader.onload) {
        mockReader.onload({} as any);
      }
    }, 0);
    return mockReader;
  });

  return mockReader;
}

/**
 * Test scenarios for integration testing
 */
export const integrationTestScenarios = [
  {
    name: 'successful_transcription',
    description: 'Test successful audio transcription with high confidence',
    audioBlob: sampleUPIAlerts[0].blob,
    expectedMinConfidence: 0.7,
    shouldSucceed: true
  },
  {
    name: 'low_quality_audio',
    description: 'Test transcription with low quality audio',
    audioBlob: sampleNonUPIAudio[2].blob,
    expectedMinConfidence: 0.3,
    shouldSucceed: true
  },
  {
    name: 'invalid_audio_format',
    description: 'Test error handling for invalid audio format',
    audioBlob: sampleInvalidAudio[1].blob,
    shouldSucceed: false,
    expectedError: 'Unsupported audio type'
  },
  {
    name: 'empty_audio_file',
    description: 'Test error handling for empty audio file',
    audioBlob: sampleInvalidAudio[0].blob,
    shouldSucceed: false,
    expectedError: 'Invalid audio blob'
  }
];

// Note: vi is only available in test environment
// Re-export vi for convenience in test files (only when vitest is available)
export const vi = typeof window !== 'undefined' && (window as any).vi ? (window as any).vi : undefined;