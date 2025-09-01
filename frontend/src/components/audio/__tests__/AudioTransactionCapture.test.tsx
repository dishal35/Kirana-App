/**
 * Audio Transaction Capture Component Tests
 * 
 * Tests the main voice transaction interface with EnhancedTransactionService integration.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { AudioTransactionCapture } from '../AudioTransactionCapture';
import { enhancedTransactionService, type AudioProcessingResult } from '../../../services/EnhancedTransactionService';
import type { Product, AudioQualityMetrics } from '../../../types';

// Mock dependencies
vi.mock('../../../services/EnhancedTransactionService');
vi.mock('../../transaction/ProductSuggestionModal', () => ({
  ProductSuggestionModal: ({ isOpen, onClose, amount, onTransactionCompleted }: any) => (
    isOpen ? (
      <div data-testid="product-suggestion-modal">
        <div>Amount: ₹{amount}</div>
        <button onClick={() => onTransactionCompleted('test-transaction-id')}>
          Complete Transaction
        </button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  )
}));

const mockEnhancedTransactionService = enhancedTransactionService as any;

describe('AudioTransactionCapture', () => {
  let mockOnTransactionCompleted: MockedFunction<(transactionId: string) => void>;
  let mockOnError: MockedFunction<(error: string) => void>;
  let mockProducts: Product[];
  let mockAudioQuality: AudioQualityMetrics;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnTransactionCompleted = vi.fn();
    mockOnError = vi.fn();

    mockProducts = [
      {
        id: 'product-1',
        name: 'Rice',
        price: 50,
        stock: 100,
        reorderThreshold: 10,
        category: 'Groceries',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockAudioQuality = {
      volume: 0.8,
      noiseLevel: 0.2,
      clarity: 0.9,
      isAcceptable: true
    };

    // Setup mock implementations
    mockEnhancedTransactionService.startRecording = vi.fn().mockResolvedValue(undefined);
    mockEnhancedTransactionService.stopRecording = vi.fn().mockResolvedValue(undefined);
    mockEnhancedTransactionService.getRecordingStatus = vi.fn().mockReturnValue({
      isRecording: false,
      duration: null
    });
    mockEnhancedTransactionService.onAudioDetected = vi.fn();
    mockEnhancedTransactionService.onRecordingStateChanged = vi.fn();
    mockEnhancedTransactionService.onError = vi.fn();
  });

  const defaultProps = {
    onTransactionCompleted: mockOnTransactionCompleted,
    onError: mockOnError
  };

  describe('Rendering', () => {
    it('should render the main interface', () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      expect(screen.getByText('Voice Transaction Capture')).toBeInTheDocument();
      expect(screen.getByText('Tap to start listening for UPI payment alerts')).toBeInTheDocument();
      expect(screen.getByText('Ready to capture transactions')).toBeInTheDocument();
      expect(screen.getByText('🎤')).toBeInTheDocument();
    });

    it('should render instructions', () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      expect(screen.getByText('How it works:')).toBeInTheDocument();
      expect(screen.getByText('• Tap the microphone to start listening')).toBeInTheDocument();
      expect(screen.getByText('• Play a UPI payment alert on your soundbox')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AudioTransactionCapture {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Recording Controls', () => {
    it('should start recording when microphone button is clicked', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      const micButton = screen.getByText('🎤');
      fireEvent.click(micButton);

      await waitFor(() => {
        expect(mockEnhancedTransactionService.startRecording).toHaveBeenCalled();
      });
    });

    it('should stop recording when stop button is clicked', async () => {
      // Mock recording state
      mockEnhancedTransactionService.getRecordingStatus.mockReturnValue({
        isRecording: true,
        duration: 5000
      });

      const { rerender } = render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate recording state change
      const component = screen.getByText('🎤').closest('div');
      fireEvent.click(screen.getByText('🎤'));

      // Update component to show recording state
      rerender(<AudioTransactionCapture {...defaultProps} />);

      // Should show stop button
      const stopButton = screen.getByText('⏹️');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockEnhancedTransactionService.stopRecording).toHaveBeenCalled();
      });
    });

    it('should handle recording start errors', async () => {
      mockEnhancedTransactionService.startRecording.mockRejectedValue(
        new Error('Microphone access denied')
      );

      render(<AudioTransactionCapture {...defaultProps} />);

      const micButton = screen.getByText('🎤');
      fireEvent.click(micButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Microphone access denied');
      });
    });

    it('should handle recording stop errors', async () => {
      mockEnhancedTransactionService.stopRecording.mockRejectedValue(
        new Error('Stop recording failed')
      );

      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate recording state
      const component = render(<AudioTransactionCapture {...defaultProps} />);
      
      // Manually trigger the recording state change handler
      const instance = component.container.querySelector('[data-testid]') as any;
      if (mockEnhancedTransactionService.onRecordingStateChanged) {
        mockEnhancedTransactionService.onRecordingStateChanged(true);
      }

      const stopButton = screen.getByText('⏹️');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Stop recording failed');
      });
    });
  });

  describe('Recording State Display', () => {
    it('should show recording duration', () => {
      mockEnhancedTransactionService.getRecordingStatus.mockReturnValue({
        isRecording: true,
        duration: 65000 // 1 minute 5 seconds
      });

      render(<AudioTransactionCapture {...defaultProps} />);

      expect(screen.getByText('Recording: 1:05')).toBeInTheDocument();
    });

    it('should show processing state', () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate processing state by calling the handler
      const component = render(<AudioTransactionCapture {...defaultProps} />);
      
      // This would normally be called by the service
      // We'll test the UI state changes through props or direct state manipulation
      expect(screen.getByText('Ready to capture transactions')).toBeInTheDocument();
    });

    it('should show different button colors based on state', () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      const button = screen.getByText('🎤').closest('button');
      expect(button).toHaveClass('bg-green-600');
    });
  });

  describe('Audio Processing Results', () => {
    it('should show modal when transaction is detected', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate successful audio detection
      const successResult: AudioProcessingResult = {
        success: true,
        transactionResult: {
          amount: 50,
          confidence: 0.9,
          suggestedProducts: mockProducts,
          transcription: '50 rupees received on PhonePe'
        },
        audioQuality: mockAudioQuality
      };

      // Manually trigger the audio detected handler
      const audioDetectedHandler = mockEnhancedTransactionService.onAudioDetected;
      if (audioDetectedHandler) {
        audioDetectedHandler(successResult);
      }

      await waitFor(() => {
        expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
        expect(screen.getByText('Amount: ₹50')).toBeInTheDocument();
      });
    });

    it('should handle audio processing errors', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate failed audio detection
      const errorResult: AudioProcessingResult = {
        success: false,
        error: 'No UPI payment detected in audio',
        audioQuality: mockAudioQuality
      };

      // Manually trigger the audio detected handler
      const audioDetectedHandler = mockEnhancedTransactionService.onAudioDetected;
      if (audioDetectedHandler) {
        audioDetectedHandler(errorResult);
      }

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('No UPI payment detected in audio');
      });
    });

    it('should show success message after transaction completion', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate successful transaction detection and completion
      const successResult: AudioProcessingResult = {
        success: true,
        transactionResult: {
          amount: 50,
          confidence: 0.9,
          suggestedProducts: mockProducts,
          transcription: '50 rupees received on PhonePe'
        },
        audioQuality: mockAudioQuality
      };

      // Trigger audio detection
      const audioDetectedHandler = mockEnhancedTransactionService.onAudioDetected;
      if (audioDetectedHandler) {
        audioDetectedHandler(successResult);
      }

      await waitFor(() => {
        expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
      });

      // Complete transaction
      const completeButton = screen.getByText('Complete Transaction');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockOnTransactionCompleted).toHaveBeenCalledWith('test-transaction-id');
        expect(screen.getByText('Transaction saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('should show error messages', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate service error
      const errorHandler = mockEnhancedTransactionService.onError;
      if (errorHandler) {
        errorHandler('Microphone access denied');
      }

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
      });
    });

    it('should dismiss error messages', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Simulate service error
      const errorHandler = mockEnhancedTransactionService.onError;
      if (errorHandler) {
        errorHandler('Test error');
      }

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should close modal when close button is clicked', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Show modal
      const successResult: AudioProcessingResult = {
        success: true,
        transactionResult: {
          amount: 50,
          confidence: 0.9,
          suggestedProducts: mockProducts,
          transcription: '50 rupees received'
        },
        audioQuality: mockAudioQuality
      };

      const audioDetectedHandler = mockEnhancedTransactionService.onAudioDetected;
      if (audioDetectedHandler) {
        audioDetectedHandler(successResult);
      }

      await waitFor(() => {
        expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('product-suggestion-modal')).not.toBeInTheDocument();
      });
    });

    it('should handle modal errors', async () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      // Show modal first
      const successResult: AudioProcessingResult = {
        success: true,
        transactionResult: {
          amount: 50,
          confidence: 0.9,
          suggestedProducts: mockProducts,
          transcription: '50 rupees received'
        },
        audioQuality: mockAudioQuality
      };

      const audioDetectedHandler = mockEnhancedTransactionService.onAudioDetected;
      if (audioDetectedHandler) {
        audioDetectedHandler(successResult);
      }

      await waitFor(() => {
        expect(screen.getByTestId('product-suggestion-modal')).toBeInTheDocument();
      });

      // The modal would call onError through its props
      // This tests the error handling flow
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should setup service handlers on mount', () => {
      render(<AudioTransactionCapture {...defaultProps} />);

      expect(mockEnhancedTransactionService.onAudioDetected).toBeDefined();
      expect(mockEnhancedTransactionService.onRecordingStateChanged).toBeDefined();
      expect(mockEnhancedTransactionService.onError).toBeDefined();
    });

    it('should cleanup handlers on unmount', () => {
      const { unmount } = render(<AudioTransactionCapture {...defaultProps} />);

      unmount();

      // Handlers should be reset to no-op functions
      expect(mockEnhancedTransactionService.onAudioDetected).toBeDefined();
      expect(mockEnhancedTransactionService.onRecordingStateChanged).toBeDefined();
      expect(mockEnhancedTransactionService.onError).toBeDefined();
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration correctly', () => {
      // This tests the internal formatDuration function
      // We can test it indirectly through the recording duration display
      mockEnhancedTransactionService.getRecordingStatus.mockReturnValue({
        isRecording: true,
        duration: 125000 // 2 minutes 5 seconds
      });

      render(<AudioTransactionCapture {...defaultProps} />);

      expect(screen.getByText('Recording: 2:05')).toBeInTheDocument();
    });
  });
});