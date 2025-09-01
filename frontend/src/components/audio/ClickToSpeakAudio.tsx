import React, { useState, useRef } from 'react';
import { AmountExtractor } from '../../services/AmountExtractor';

interface ClickToSpeakAudioProps {
  onTransactionDetected?: (result: { amount: number; transcription: string }) => void;
  className?: string;
}

export const ClickToSpeakAudio: React.FC<ClickToSpeakAudioProps> = ({ 
  onTransactionDetected,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedAmount, setExtractedAmount] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const recognitionRef = useRef<any>(null);
  const amountExtractor = new AmountExtractor();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscription('');
        setExtractedAmount(null);
        setShowResults(false);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscription(transcript);
        processTranscription(transcript);
        setShowResults(true);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          // Fallback to manual input
          const manualText = prompt('No speech detected. Please type what you said:');
          if (manualText) {
            setTranscription(manualText);
            processTranscription(manualText);
            setShowResults(true);
          }
        } else if (event.error === 'network') {
          // Network error - fallback to manual input
          const manualText = prompt('Network error with speech recognition. Please type what you said:');
          if (manualText) {
            setTranscription(manualText);
            processTranscription(manualText);
            setShowResults(true);
          }
        } else {
          // Other errors - also fallback to manual input
          const manualText = prompt(`Speech recognition error (${event.error}). Please type what you said:`);
          if (manualText) {
            setTranscription(manualText);
            processTranscription(manualText);
            setShowResults(true);
          }
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

  const stopListening = () => {
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

  const clearResults = () => {
    setTranscription('');
    setExtractedAmount(null);
    setShowResults(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`relative p-6 rounded-full transition-all duration-300 transform hover:scale-105 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200'
          }`}
        >
          {isListening ? (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
          )}
        </button>
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className={`text-sm font-medium ${
          isListening ? 'text-red-600' : 'text-gray-600'
        }`}>
          {isListening ? '🎤 Listening... Speak now!' : '🎤 Click to speak'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Say something like: "You received 50 rupees on PhonePe"
        </p>
      </div>

      {/* Results */}
      {showResults && transcription && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-800">Recognition Result</h4>
            <button
              onClick={clearResults}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Transcription:</label>
            <div className="p-2 bg-gray-50 rounded-lg text-sm text-gray-800">
              {transcription}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Extracted Amount:</label>
            <div className={`p-2 rounded-lg text-sm font-medium ${
              extractedAmount 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {extractedAmount ? `₹${extractedAmount}` : 'No UPI amount detected'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};