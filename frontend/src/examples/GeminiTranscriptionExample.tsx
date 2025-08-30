import React, { useState, useRef } from 'react';
import { geminiTranscriptionService, TranscriptionResult, TranscriptionError } from '../services/GeminiTranscription';

interface TranscriptionState {
  isProcessing: boolean;
  result: TranscriptionResult | null;
  error: TranscriptionError | null;
}

export const GeminiTranscriptionExample: React.FC = () => {
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>({
    isProcessing: false,
    result: null,
    error: null
  });
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Test API connection
  const testConnection = async () => {
    try {
      const isConnected = await geminiTranscriptionService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setTranscriptionState(prev => ({
        ...prev,
        error: {
          code: 'API_ERROR',
          message: 'Failed to access microphone',
          retryable: false
        }
      }));
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Transcribe audio using Gemini API
  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscriptionState({
      isProcessing: true,
      result: null,
      error: null
    });

    try {
      const result = await geminiTranscriptionService.transcribeAudio(audioBlob);
      setTranscriptionState({
        isProcessing: false,
        result,
        error: null
      });
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionState({
        isProcessing: false,
        result: null,
        error: error as TranscriptionError
      });
    }
  };

  // Handle file upload for testing
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      transcribeAudio(file);
    }
  };

  // Clear results
  const clearResults = () => {
    setTranscriptionState({
      isProcessing: false,
      result: null,
      error: null
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Gemini Audio Transcription Demo
      </h2>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium">API Connection Status:</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-sm ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'failed' ? 'Failed' : 'Unknown'}
            </span>
            <button
              onClick={testConnection}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-3">Record Audio</h3>
        <div className="flex gap-3">
          <button
            onClick={startRecording}
            disabled={isRecording || transcriptionState.isProcessing}
            className={`px-4 py-2 rounded font-medium ${
              isRecording || transcriptionState.isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isRecording ? 'Recording...' : 'Start Recording'}
          </button>
          
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className={`px-4 py-2 rounded font-medium ${
              !isRecording
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Stop Recording
          </button>
        </div>
        
        {isRecording && (
          <div className="mt-3 text-sm text-gray-600">
            🎤 Recording... (will auto-stop after 10 seconds)
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-3">Upload Audio File</h3>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          disabled={transcriptionState.isProcessing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Processing Status */}
      {transcriptionState.isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Processing audio with Gemini API...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {transcriptionState.result && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium mb-3 text-green-800">Transcription Result</h3>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Text:</span>
              <p className="mt-1 p-3 bg-white rounded border text-gray-800">
                {transcriptionState.result.text}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Confidence:</span>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${transcriptionState.result.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-600">
                      {(transcriptionState.result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Processing Time:</span>
                <p className="mt-1 text-gray-600">
                  {transcriptionState.result.processingTime}ms
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {transcriptionState.error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h3 className="font-medium mb-3 text-red-800">Transcription Error</h3>
          
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">Error Code:</span>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                {transcriptionState.error.code}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Message:</span>
              <p className="mt-1 text-red-700">{transcriptionState.error.message}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Retryable:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                transcriptionState.error.retryable 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {transcriptionState.error.retryable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clear Results */}
      {(transcriptionState.result || transcriptionState.error) && (
        <div className="flex justify-end">
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-3 text-blue-800">Usage Instructions</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>• First, test the API connection to ensure Gemini is accessible</li>
          <li>• Record audio by clicking "Start Recording" and speak a UPI payment alert</li>
          <li>• Or upload an audio file containing a payment notification</li>
          <li>• The service will transcribe the audio and provide confidence scoring</li>
          <li>• Higher confidence scores indicate better transcription quality</li>
          <li>• UPI-related content typically receives higher confidence scores</li>
        </ul>
      </div>
    </div>
  );
};

export default GeminiTranscriptionExample;