import React, { useState, useEffect } from 'react';
import { audioCaptureService } from '../services/AudioCapture';
import type { AudioQualityMetrics } from '../types';

/**
 * Example component demonstrating how to use the AudioCaptureService
 * This shows the integration of audio capture with voice activity detection
 * and quality analysis for UPI transaction detection.
 */
export const AudioCaptureExample: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [audioCount, setAudioCount] = useState(0);
  const [lastQuality, setLastQuality] = useState<AudioQualityMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedAudio, setDetectedAudio] = useState<string[]>([]);

  useEffect(() => {
    // Set up event handlers
    audioCaptureService.onAudioDetected = (audioBlob: Blob, quality: AudioQualityMetrics) => {
      console.log('Audio detected:', audioBlob.size, 'bytes, quality:', quality);
      setLastQuality(quality);
      setAudioCount(audioCaptureService.getStoredAudioCount());
      
      // Add to detected audio list
      const timestamp = new Date().toLocaleTimeString();
      setDetectedAudio(prev => [
        ...prev.slice(-4), // Keep only last 5 entries
        `${timestamp}: ${audioBlob.size} bytes (Quality: ${quality.isAcceptable ? 'Good' : 'Poor'})`
      ]);
    };

    audioCaptureService.onPermissionError = (errorMessage: string) => {
      console.error('Permission error:', errorMessage);
      setError(errorMessage);
      setIsListening(false);
    };

    audioCaptureService.onQualityIssue = (issue: string, metrics: AudioQualityMetrics) => {
      console.warn('Quality issue:', issue, metrics);
      setError(`Quality Issue: ${issue}`);
    };

    return () => {
      // Cleanup
      if (audioCaptureService.isListening) {
        audioCaptureService.stopListening();
      }
    };
  }, []);

  const handleStartListening = async () => {
    try {
      setError(null);
      await audioCaptureService.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    audioCaptureService.stopListening();
    setIsListening(false);
  };

  const handleClearAudio = () => {
    audioCaptureService.clearStoredAudio();
    setAudioCount(0);
    setDetectedAudio([]);
    setLastQuality(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Audio Capture Service Demo
      </h2>
      
      <div className="space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleStartListening}
            disabled={isListening}
            className={`px-4 py-2 rounded font-medium ${
              isListening
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isListening ? 'Listening...' : 'Start Listening'}
          </button>
          
          <button
            onClick={handleStopListening}
            disabled={!isListening}
            className={`px-4 py-2 rounded font-medium ${
              !isListening
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            Stop Listening
          </button>
          
          <button
            onClick={handleClearAudio}
            className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
          >
            Clear Audio
          </button>
        </div>

        {/* Status Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
            <p className="text-sm">
              <span className="font-medium">Listening:</span>{' '}
              <span className={isListening ? 'text-green-600' : 'text-red-600'}>
                {isListening ? 'Active' : 'Inactive'}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Stored Audio:</span> {audioCount} files
            </p>
          </div>

          {lastQuality && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-gray-700 mb-2">Last Audio Quality</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Volume:</span>{' '}
                  {(lastQuality.volume * 100).toFixed(1)}%
                </p>
                <p>
                  <span className="font-medium">Noise Level:</span>{' '}
                  {(lastQuality.noiseLevel * 100).toFixed(1)}%
                </p>
                <p>
                  <span className="font-medium">Clarity:</span>{' '}
                  {(lastQuality.clarity * 100).toFixed(1)}%
                </p>
                <p>
                  <span className="font-medium">Acceptable:</span>{' '}
                  <span className={lastQuality.isAcceptable ? 'text-green-600' : 'text-red-600'}>
                    {lastQuality.isAcceptable ? 'Yes' : 'No'}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Detected Audio Log */}
        {detectedAudio.length > 0 && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Recent Audio Detections</h3>
            <div className="space-y-1">
              {detectedAudio.map((entry, index) => (
                <p key={index} className="text-sm text-gray-600 font-mono">
                  {entry}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Click "Start Listening" to begin audio capture</li>
            <li>• Speak or make sounds to trigger voice activity detection</li>
            <li>• The service will automatically detect and analyze audio quality</li>
            <li>• UPI soundbox alerts will be captured and processed</li>
            <li>• Use "Clear Audio" to reset the stored audio count</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AudioCaptureExample;