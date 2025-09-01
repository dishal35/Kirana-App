/**
 * Audio Transaction Capture Component
 * 
 * Main interface for voice-based transaction capture using EnhancedTransactionService.
 * Provides real-time recording status, processing indicators, and error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { enhancedTransactionService, type AudioProcessingResult } from '../../services/EnhancedTransactionService';
import { ProductSuggestionModal } from '../transaction/ProductSuggestionModal';
import type { Product, AudioQualityMetrics } from '../../types';

export interface AudioTransactionCaptureProps {
  onTransactionCompleted?: (transactionId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessingState {
  isProcessing: boolean;
  stage: 'idle' | 'recording' | 'transcribing' | 'extracting' | 'suggesting' | 'complete' | 'error';
  message: string;
}

interface DetectedTransaction {
  amount: number;
  suggestedProducts: Product[];
  transcription: string;
  confidence: number;
  audioQuality: AudioQualityMetrics;
}

export const AudioTransactionCapture: React.FC<AudioTransactionCaptureProps> = ({
  onTransactionCompleted,
  onError,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    stage: 'idle',
    message: 'Ready to capture transactions'
  });
  const [detectedTransaction, setDetectedTransaction] = useState<DetectedTransaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        const status = enhancedTransactionService.getRecordingStatus();
        setRecordingDuration(status.duration || 0);
      }, 100);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Setup service event handlers
  useEffect(() => {
    // Handle audio detection results
    enhancedTransactionService.onAudioDetected = (result: AudioProcessingResult) => {
      if (result.success && result.transactionResult) {
        setProcessingState({
          isProcessing: false,
          stage: 'complete',
          message: `Transaction detected: ₹${result.transactionResult.amount}`
        });

        setDetectedTransaction({
          amount: result.transactionResult.amount,
          suggestedProducts: result.transactionResult.suggestedProducts,
          transcription: result.transactionResult.transcription,
          confidence: result.transactionResult.confidence,
          audioQuality: result.audioQuality!
        });

        setShowModal(true);
      } else {
        setProcessingState({
          isProcessing: false,
          stage: 'error',
          message: result.error || 'Failed to process audio'
        });
        setError(result.error || 'Unknown error occurred');
        if (onError) {
          onError(result.error || 'Failed to process audio');
        }
      }
    };

    // Handle recording state changes
    enhancedTransactionService.onRecordingStateChanged = (recording: boolean) => {
      setIsRecording(recording);
      
      if (recording) {
        setProcessingState({
          isProcessing: true,
          stage: 'recording',
          message: 'Listening for UPI alerts...'
        });
        setError(null);
      } else {
        if (processingState.stage === 'recording') {
          setProcessingState({
            isProcessing: true,
            stage: 'transcribing',
            message: 'Processing audio...'
          });
        }
      }
    };

    // Handle service errors
    enhancedTransactionService.onError = (errorMessage: string) => {
      setProcessingState({
        isProcessing: false,
        stage: 'error',
        message: errorMessage
      });
      setError(errorMessage);
      setIsRecording(false);
      if (onError) {
        onError(errorMessage);
      }
    };

    return () => {
      // Cleanup handlers
      enhancedTransactionService.onAudioDetected = () => {};
      enhancedTransactionService.onRecordingStateChanged = () => {};
      enhancedTransactionService.onError = () => {};
    };
  }, [onError, processingState.stage]);

  const handleStartRecording = useCallback(async () => {
    try {
      setError(null);
      await enhancedTransactionService.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError]);

  const handleStopRecording = useCallback(async () => {
    try {
      await enhancedTransactionService.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [onError]);

  const handleTransactionCompleted = useCallback((transactionId: string) => {
    setShowModal(false);
    setDetectedTransaction(null);
    setProcessingState({
      isProcessing: false,
      stage: 'idle',
      message: 'Transaction saved successfully!'
    });
    
    if (onTransactionCompleted) {
      onTransactionCompleted(transactionId);
    }

    // Reset to ready state after 2 seconds
    setTimeout(() => {
      setProcessingState({
        isProcessing: false,
        stage: 'idle',
        message: 'Ready to capture transactions'
      });
    }, 2000);
  }, [onTransactionCompleted]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setDetectedTransaction(null);
    setProcessingState({
      isProcessing: false,
      stage: 'idle',
      message: 'Ready to capture transactions'
    });
  }, []);

  const handleModalError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  }, [onError]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    switch (processingState.stage) {
      case 'recording':
        return 'text-red-600';
      case 'transcribing':
      case 'extracting':
      case 'suggesting':
        return 'text-blue-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getButtonColor = (): string => {
    if (isRecording) {
      return 'bg-red-600 hover:bg-red-700 text-white';
    } else if (processingState.isProcessing) {
      return 'bg-gray-400 text-white cursor-not-allowed';
    } else {
      return 'bg-green-600 hover:bg-green-700 text-white';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Voice Transaction Capture
        </h2>
        <p className="text-gray-600">
          Tap to start listening for UPI payment alerts
        </p>
      </div>

      {/* Recording Button */}
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={processingState.isProcessing && !isRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-200 ${getButtonColor()} ${
            isRecording ? 'animate-pulse' : ''
          }`}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
        
        <div className="mt-4 text-center">
          <p className={`text-lg font-medium ${getStatusColor()}`}>
            {processingState.message}
          </p>
          
          {isRecording && (
            <p className="text-sm text-gray-500 mt-1">
              Recording: {formatDuration(recordingDuration)}
            </p>
          )}
          
          {processingState.isProcessing && !isRecording && (
            <div className="flex items-center justify-center mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <span className="text-red-600 text-lg mr-2">⚠️</span>
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">How it works:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Tap the microphone to start listening</li>
          <li>• Play a UPI payment alert on your soundbox</li>
          <li>• The app will automatically detect and process the transaction</li>
          <li>• Select products and confirm the sale</li>
        </ul>
      </div>

      {/* Product Suggestion Modal */}
      {detectedTransaction && (
        <ProductSuggestionModal
          isOpen={showModal}
          onClose={handleModalClose}
          amount={detectedTransaction.amount}
          suggestedProducts={detectedTransaction.suggestedProducts}
          transcription={detectedTransaction.transcription}
          confidence={detectedTransaction.confidence}
          audioQuality={detectedTransaction.audioQuality}
          onTransactionCompleted={handleTransactionCompleted}
          onError={handleModalError}
        />
      )}
    </div>
  );
};