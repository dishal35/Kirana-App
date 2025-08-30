import React, { useState, useEffect, useRef } from 'react';
import { AmountExtractor } from '../services/AmountExtractor';
import type { AmountExtractionResult } from '../services/AmountExtractor';

interface TransactionRecord {
  id: string;
  timestamp: Date;
  transcription: string;
  extractionResult: AmountExtractionResult;
  processingTime: number;
  isValid: boolean;
}

const VoiceAmountExtractionDemo: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [status, setStatus] = useState('Ready to record');

  const audioCapture = useRef<any>(null);
  const geminiTranscription = useRef<any>(null);
  const amountExtractor = useRef<AmountExtractor | null>(null);

  useEffect(() => {
    // Initialize services
    const initializeServices = async () => {
      try {
        amountExtractor.current = new AmountExtractor();
        
        // Dynamically import services to handle potential initialization errors
        const { GeminiTranscription } = await import('../services/GeminiTranscription');
        const { AudioCapture } = await import('../services/AudioCapture');
        
        geminiTranscription.current = new GeminiTranscription();
        audioCapture.current = new AudioCapture({
          vadThreshold: 0.01,
          noiseThreshold: 0.005,
          minRecordingDuration: 1000,
          maxRecordingDuration: 10000
        });
        
        setStatus('Ready to record');
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setStatus(`Error: ${(error as Error).message}`);
      }
    };

    initializeServices();
  }, []);

  const startRecording = async () => {
    if (!audioCapture.current) return;

    try {
      setIsRecording(true);
      setStatus('🎤 Listening for voice...');
      
      const success = await audioCapture.current.startListening(async (audioBlob: Blob) => {
        setIsRecording(false);
        setIsProcessing(true);
        setStatus('🔄 Processing audio...');
        
        await processAudioBlob(audioBlob);
      });

      if (!success) {
        setIsRecording(false);
        setStatus('❌ Failed to start recording');
      }
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
      setStatus('❌ Recording error');
    }
  };

  const stopRecording = () => {
    if (audioCapture.current) {
      audioCapture.current.stopListening();
      setIsRecording(false);
      setStatus('Ready to record');
    }
  };

  const processAudioBlob = async (audioBlob: Blob) => {
    const startTime = Date.now();
    
    try {
      if (!geminiTranscription.current || !amountExtractor.current) {
        throw new Error('Services not initialized');
      }

      setStatus('🔄 Transcribing audio...');
      
      // Transcribe audio
      const transcriptionResult = await geminiTranscription.current.transcribeAudio(audioBlob);
      
      if (!transcriptionResult.success || !transcriptionResult.text) {
        throw new Error('Transcription failed: ' + transcriptionResult.error);
      }

      const transcription = transcriptionResult.text;
      setCurrentTranscription(transcription);
      setStatus('🔄 Extracting amount...');

      // Extract amount
      const extractionResult = amountExtractor.current.extractAmount(transcription);
      const isValid = amountExtractor.current.validateExtraction(extractionResult, minConfidence);
      
      const processingTime = Date.now() - startTime;

      // Create transaction record
      const transaction: TransactionRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcription,
        extractionResult,
        processingTime,
        isValid
      };

      // Add to transaction log
      setTransactions(prev => [transaction, ...prev]);
      
      setStatus(isValid ? 
        `✅ Found ₹${extractionResult.amount} (${(extractionResult.confidence * 100).toFixed(1)}%)` :
        '❌ No valid amount found'
      );

    } catch (error) {
      console.error('Processing error:', error);
      setStatus('❌ Processing failed: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTransactions = () => {
    setTransactions([]);
    setCurrentTranscription('');
    setStatus('Ready to record');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'phonepe': return '📱';
      case 'gpay': return '🔍';
      case 'paytm': return '💳';
      case 'generic': return '💰';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        🎤 Voice Amount Extraction Demo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recording Controls */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              🎙️ Voice Recording
            </h2>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-lg font-medium mb-2 ${
                  status.includes('✅') ? 'text-green-600' :
                  status.includes('❌') ? 'text-red-600' :
                  status.includes('🔄') ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {status}
                </div>
                
                {isRecording && (
                  <div className="flex justify-center mb-4">
                    <div className="animate-pulse bg-red-500 rounded-full w-4 h-4"></div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startRecording}
                  disabled={isRecording || isProcessing}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    isRecording || isProcessing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isRecording ? '🎤 Recording...' : '🎤 Start Recording'}
                </button>
                
                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="py-3 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    ⏹️ Stop
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Confidence: {(minConfidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={isRecording || isProcessing}
                />
              </div>

              {currentTranscription && (
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-700 mb-2">Last Transcription:</h4>
                  <p className="text-sm text-gray-600 italic">"{currentTranscription}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-green-50 p-4 rounded-lg mt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              📊 Session Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Recordings:</span>
                <span className="font-semibold">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Valid Extractions:</span>
                <span className="font-semibold text-green-600">
                  {transactions.filter(t => t.isValid).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Success Rate:</span>
                <span className="font-semibold">
                  {transactions.length > 0 
                    ? `${((transactions.filter(t => t.isValid).length / transactions.length) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Log */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                📝 Transaction Log
              </h2>
              <button
                onClick={clearTransactions}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                disabled={transactions.length === 0}
              >
                Clear Log
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No recordings yet. Start recording to see transaction logs!</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`bg-white p-4 rounded-lg border-l-4 ${
                      transaction.isValid ? 'border-green-500' : 'border-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">
                          {formatTime(transaction.timestamp)}
                        </span>
                        <span className={`text-sm font-semibold ${getStatusColor(transaction.isValid)}`}>
                          {transaction.isValid ? '✅ Valid' : '❌ Invalid'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {transaction.processingTime}ms
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm text-gray-600 italic mb-1">
                        "{transaction.transcription}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Amount:</span>
                        <span className={`ml-2 font-bold ${
                          transaction.extractionResult.amount 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                        }`}>
                          {transaction.extractionResult.amount 
                            ? `₹${transaction.extractionResult.amount}` 
                            : 'Not found'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Confidence:</span>
                        <span className="ml-2">
                          {(transaction.extractionResult.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Platform:</span>
                        <span className="ml-2">
                          {getPlatformIcon(transaction.extractionResult.platform)}
                          {transaction.extractionResult.platform}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Language:</span>
                        <span className="ml-2">{transaction.extractionResult.language}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          💡 How to Test
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>1. <strong>Click "Start Recording"</strong> and speak a UPI alert message</p>
          <p>2. <strong>Try these examples:</strong></p>
          <ul className="ml-4 space-y-1">
            <li>• "You received rupees 25 on PhonePe"</li>
            <li>• "Payment of 1500 rupees received via Google Pay"</li>
            <li>• "Paytm notification: 75 rupees credited"</li>
          </ul>
          <p>3. <strong>Check the transaction log</strong> to see transcription and extraction results</p>
          <p>4. <strong>Adjust confidence threshold</strong> to see how it affects validation</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAmountExtractionDemo;