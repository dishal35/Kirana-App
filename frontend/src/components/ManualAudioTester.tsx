import React, { useState, useRef } from 'react';
import { AmountExtractor } from '../services/AmountExtractor';

interface ManualAudioTesterProps {
  onTransactionDetected?: (result: { amount: number; transcription: string }) => void;
}

export const ManualAudioTester: React.FC<ManualAudioTesterProps> = ({ onTransactionDetected }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedAmount, setExtractedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const amountExtractor = new AmountExtractor();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    // For manual testing, we'll use Web Speech API for transcription
    try {
      const transcriptionText = await transcribeWithWebSpeech(audioBlob);
      setTranscription(transcriptionText);
      
      // Extract amount from transcription
      const extractionResult = amountExtractor.extractAmount(transcriptionText);
      
      if (extractionResult.amount && extractionResult.amount > 0) {
        setExtractedAmount(extractionResult.amount);
        
        // Notify parent component
        onTransactionDetected?.({
          amount: extractionResult.amount,
          transcription: transcriptionText
        });
      } else {
        setExtractedAmount(null);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setTranscription('Error processing audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeWithWebSpeech = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Try to use Web Speech API with live recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-IN'; // Indian English for better UPI recognition
          
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            resolve(transcript);
          };
          
          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
            // Fallback to manual input
            const text = prompt('Speech recognition failed. Please type what you said:') || '';
            resolve(text);
          };
          
          recognition.onend = () => {
            // If no result was captured, fallback to manual input
            setTimeout(() => {
              const text = prompt('No speech detected. Please type what you said:') || '';
              resolve(text);
            }, 100);
          };
          
          // Start recognition for the recorded audio
          // Note: This is a workaround since Web Speech API doesn't work with blobs
          // We'll start a new recognition session
          recognition.start();
          
        } catch (error) {
          console.warn('Speech recognition not available:', error);
          const text = prompt('Please type what you said (Speech recognition unavailable):') || '';
          resolve(text);
        }
      } else {
        // Fallback to manual input
        const text = prompt('Please type what you said (Speech recognition not supported):') || '';
        resolve(text);
      }
    });
  };

  const startLiveSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscription('');
        setExtractedAmount(null);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript || interimTranscript;
        setTranscription(fullTranscript);
        
        // Process final results
        if (finalTranscript) {
          processTranscription(finalTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          alert('No speech detected. Please try again.');
        } else if (event.error === 'network') {
          alert('Network error. Please check your connection.');
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Failed to start speech recognition. Please try again.');
    }
  };

  const stopLiveSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const processTranscription = (text: string) => {
    const extractionResult = amountExtractor.extractAmount(text);
    
    if (extractionResult.amount && extractionResult.amount > 0) {
      setExtractedAmount(extractionResult.amount);
      onTransactionDetected?.({
        amount: extractionResult.amount,
        transcription: text
      });
    } else {
      setExtractedAmount(null);
    }
  };

  const testWithSampleText = (sampleText: string) => {
    setTranscription(sampleText);
    processTranscription(sampleText);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🎤 Manual Audio Tester</h3>
      
      {/* Speech Recognition Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={isListening ? stopLiveSpeechRecognition : startLiveSpeechRecognition}
          disabled={isProcessing || isRecording}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          } disabled:bg-gray-300`}
        >
          {isListening ? '🛑 Stop Listening' : '🎤 Start Live Recognition'}
        </button>
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isListening}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } disabled:bg-gray-300`}
        >
          {isRecording ? '🛑 Stop Recording' : '📹 Record & Process'}
        </button>
        
        {(isProcessing || isListening) && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            {isListening ? 'Listening...' : 'Processing...'}
          </div>
        )}
      </div>

      {/* Sample Test Buttons */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Quick Test Samples:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={() => testWithSampleText('You have received rupees 50 on PhonePe from customer')}
            className="text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <div className="font-medium text-green-800">PhonePe ₹50</div>
            <div className="text-sm text-green-600">Standard UPI alert</div>
          </button>
          
          <button
            onClick={() => testWithSampleText('Payment of rupees 25 received via Google Pay')}
            className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="font-medium text-blue-800">GPay ₹25</div>
            <div className="text-sm text-blue-600">Google Pay alert</div>
          </button>
          
          <button
            onClick={() => testWithSampleText('Paytm payment rupees 100 received successfully')}
            className="text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <div className="font-medium text-purple-800">Paytm ₹100</div>
            <div className="text-sm text-purple-600">Paytm alert</div>
          </button>
          
          <button
            onClick={() => testWithSampleText('आपको पचास रुपये का भुगतान प्राप्त हुआ है')}
            className="text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
          >
            <div className="font-medium text-orange-800">Hindi ₹50</div>
            <div className="text-sm text-orange-600">Hindi UPI alert</div>
          </button>
        </div>
      </div>

      {/* Results */}
      {transcription && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transcription:</label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              {transcription}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Extracted Amount:</label>
            <div className={`p-3 rounded-lg border ${
              extractedAmount 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {extractedAmount ? `₹${extractedAmount}` : 'No amount detected'}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">How to Test:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Live Recognition:</strong> Click "Start Live Recognition" and speak directly</li>
          <li>• <strong>Record & Process:</strong> Click "Record & Process" to record first, then process</li>
          <li>• <strong>Quick Test:</strong> Use the sample buttons below for instant testing</li>
          <li>• Try phrases like: "You received 50 rupees on PhonePe"</li>
          <li>• Works best with Chrome/Edge browsers for speech recognition</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualAudioTester;