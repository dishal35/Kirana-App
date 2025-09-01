/**
 * Audio utilities for demo and production use
 */

/**
 * Create a mock audio blob for demo purposes
 */
export function createMockAudioBlob(
  content: string = 'mock audio data',
  mimeType: string = 'audio/wav'
): Blob {
  return new Blob([content], { type: mimeType });
}

/**
 * Create a more realistic audio blob with proper WAV header
 */
export function createRealisticAudioBlob(
  content: string,
  duration: number = 3000 // milliseconds
): Blob {
  // Create a simple WAV-like structure for demo purposes
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration / 1000);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header (simplified)
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Add some simple audio data based on content
  const contentHash = content.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * (440 + (contentHash % 200)) * i / sampleRate) * 0.1;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Validate audio blob format
 */
export function isValidAudioBlob(blob: Blob): boolean {
  return blob.type.startsWith('audio/') && blob.size > 0;
}

/**
 * Get audio blob duration estimate (in seconds)
 */
export function estimateAudioDuration(blob: Blob): number {
  // Simple estimation based on file size
  // This is a rough approximation for demo purposes
  const bytesPerSecond = 44100 * 2; // 16-bit mono at 44.1kHz
  return Math.max(1, blob.size / bytesPerSecond);
}