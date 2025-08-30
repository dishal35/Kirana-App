import React, { useEffect, useState } from 'react';
import { audioCaptureService } from '../services/AudioCapture';
import type { AudioQualityMetrics } from '../types';
import AudioStorageInspector from './AudioStorageInspector';

const AudioRecorderComponent: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioDetections, setAudioDetections] = useState<Array<{
    url: string;
    timestamp: string;
    quality: AudioQualityMetrics;
    size: number;
  }>>([]);
  const [storedCount, setStoredCount] = useState(0);
  const [lastQuality, setLastQuality] = useState<AudioQualityMetrics | null>(null);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);

  useEffect(() => {
    // Set up audio detection handler
    audioCaptureService.onAudioDetected = (audioBlob, quality) => {
      console.log("🎤 Audio detected:", {
        size: audioBlob.size,
        type: audioBlob.type,
        quality
      });
      
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      const timestamp = new Date().toLocaleTimeString();
      
      setAudioDetections(prev => [
        ...prev.slice(-4), // Keep only last 5 detections
        {
          url: audioBlobUrl,
          timestamp,
          quality,
          size: audioBlob.size
        }
      ]);
      
      setLastQuality(quality);
      setStoredCount(audioCaptureService.getStoredAudioCount());
    };

    // Set up permission error handler
    audioCaptureService.onPermissionError = (message) => {
      console.error("🚫 Permission error:", message);
      setErrorMessage(message);
      setIsListening(false);
    };

    // Set up quality issue handler
    audioCaptureService.onQualityIssue = (issue, metrics) => {
      console.warn("⚠️ Quality issue:", issue, metrics);
      setQualityIssues(prev => [
        ...prev.slice(-2), // Keep only last 3 issues
        `${new Date().toLocaleTimeString()}: ${issue}`
      ]);
    };
    
    return () => {
      // Cleanup on unmount
      if (audioCaptureService.isListening) {
        audioCaptureService.stopListening();
      }
      // Clean up blob URLs to prevent memory leaks
      audioDetections.forEach(detection => {
        URL.revokeObjectURL(detection.url);
      });
    };
  }, []);

  const handleStartListening = async () => {
    setErrorMessage(null);
    setQualityIssues([]);
    
    try {
      console.log("🎯 Starting audio capture...");
      await audioCaptureService.startListening();
      setIsListening(true);
      console.log("✅ Audio capture started successfully");
    } catch (error) {
      console.error("❌ Error starting audio capture:", error);
      setErrorMessage("Error starting audio capture. Please check your microphone permissions.");
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    try {
      console.log("🛑 Stopping audio capture...");
      audioCaptureService.stopListening();
      setIsListening(false);
      console.log("✅ Audio capture stopped");
    } catch (error) {
      console.error("❌ Error stopping audio capture:", error);
      setErrorMessage("Error stopping audio capture");
    }
  };

  const handleClearDetections = () => {
    // Clean up blob URLs
    audioDetections.forEach(detection => {
      URL.revokeObjectURL(detection.url);
    });
    setAudioDetections([]);
    audioCaptureService.clearStoredAudio();
    setStoredCount(0);
    setLastQuality(null);
    setQualityIssues([]);
    console.log("🧹 Cleared all audio detections");
  };

  const formatQuality = (quality: AudioQualityMetrics) => {
    return {
      volume: (quality.volume * 100).toFixed(1),
      noise: (quality.noiseLevel * 100).toFixed(1),
      clarity: (quality.clarity * 100).toFixed(1)
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎤 UPI Audio Capture Service
        </h2>
        <p className="text-gray-600">
          This service automatically detects voice activity and captures audio for UPI transaction processing.
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={handleStartListening}
            disabled={isListening}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isListening
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isListening ? '🎤 Listening...' : '▶️ Start Listening'}
          </button>
          
          <button
            onClick={handleStopListening}
            disabled={!isListening}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !isListening
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            ⏹️ Stop Listening
          </button>
          
          <button
            onClick={handleClearDetections}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            🧹 Clear All
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {isListening ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-gray-600">
              📁 Stored: {storedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-red-500">❌</span>
            <h3 className="font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-700 mt-1">{errorMessage}</p>
        </div>
      )}

      {/* Quality Issues */}
      {qualityIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-500">⚠️</span>
            <h3 className="font-semibold text-yellow-800">Quality Issues</h3>
          </div>
          <div className="space-y-1">
            {qualityIssues.map((issue, index) => (
              <p key={index} className="text-yellow-700 text-sm font-mono">{issue}</p>
            ))}
          </div>
        </div>
      )}

      {/* Last Quality Metrics */}
      {lastQuality && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            📊 Last Audio Quality
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatQuality(lastQuality).volume}%
              </div>
              <div className="text-sm text-blue-700">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatQuality(lastQuality).noise}%
              </div>
              <div className="text-sm text-blue-700">Noise</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatQuality(lastQuality).clarity}%
              </div>
              <div className="text-sm text-blue-700">Clarity</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${lastQuality.isAcceptable ? 'text-green-600' : 'text-red-600'}`}>
                {lastQuality.isAcceptable ? '✅' : '❌'}
              </div>
              <div className="text-sm text-blue-700">Acceptable</div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Detections */}
      {audioDetections.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎵 Recent Audio Detections ({audioDetections.length})
          </h3>
          <div className="space-y-4">
            {audioDetections.map((detection, index) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎤</span>
                    <span className="font-medium text-gray-700">
                      Detection #{audioDetections.length - index}
                    </span>
                    <span className="text-sm text-gray-500">
                      {detection.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {(detection.size / 1024).toFixed(1)} KB
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      detection.quality.isAcceptable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {detection.quality.isAcceptable ? 'Good Quality' : 'Poor Quality'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Volume:</span> {formatQuality(detection.quality).volume}%
                  </div>
                  <div>
                    <span className="text-gray-500">Noise:</span> {formatQuality(detection.quality).noise}%
                  </div>
                  <div>
                    <span className="text-gray-500">Clarity:</span> {formatQuality(detection.quality).clarity}%
                  </div>
                </div>
                
                <audio 
                  src={detection.url} 
                  controls 
                  className="w-full"
                  preload="metadata"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Inspector */}
      <AudioStorageInspector />

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          💡 How to Test
        </h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Click "Start Listening" to begin voice activity detection</li>
          <li>• Speak normally or make sounds - the service will automatically detect voice activity</li>
          <li>• Watch the console (F12) for detailed logging of detection events</li>
          <li>• Audio will be captured automatically when voice activity is detected</li>
          <li>• Try different volumes and distances from the microphone</li>
          <li>• The service will show quality metrics for each captured audio</li>
          <li>• Use "Clear All" to reset and start fresh testing</li>
          <li>• Use the Storage Inspector to monitor memory usage in real-time</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorderComponent;