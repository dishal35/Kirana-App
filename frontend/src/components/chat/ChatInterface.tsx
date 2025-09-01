import React, { useState, useRef, useEffect } from 'react';
import { chatAssistant, type ChatMessage, type ChatQuery } from '../../services/ChatAssistant';
import { type BusinessContext } from '../../types';

interface ChatInterfaceProps {
  businessContext: BusinessContext;
  language?: 'en' | 'hi' | 'kn';
  onLanguageChange?: (language: 'en' | 'hi' | 'kn') => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  businessContext,
  language = 'en',
  onLanguageChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = getWelcomeMessage(language);
    setMessages([{
      id: crypto.randomUUID(),
      content: welcomeMessage,
      role: 'assistant',
      timestamp: new Date(),
      language
    }]);
  }, [language]);

  const getWelcomeMessage = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'नमस्ते! मैं आपका व्यापार सहायक हूँ। आप अपने बिक्री, स्टॉक या व्यापार के बारे में कुछ भी पूछ सकते हैं।';
      case 'kn':
        return 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ವ್ಯಾಪಾರ ಸಹಾಯಕ. ನಿಮ್ಮ ಮಾರಾಟ, ಸ್ಟಾಕ್ ಅಥವಾ ವ್ಯಾಪಾರದ ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಬಹುದು.';
      default:
        return 'Hello! I\'m your business assistant. You can ask me anything about your sales, inventory, or business insights.';
    }
  };

  const handleSendMessage = async (text: string, isVoice = false) => {
    if (!text.trim()) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      role: 'user',
      timestamp: new Date(),
      language
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const query: ChatQuery = {
        text,
        language,
        isVoice
      };

      const response = await chatAssistant.processQuery(query, businessContext);
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: response.message,
        role: 'assistant',
        timestamp: new Date(),
        language: response.language
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to process chat query:', error);
      setError('Sorry, I couldn\'t process your message. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: getErrorMessage(language),
        role: 'assistant',
        timestamp: new Date(),
        language
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'माफ करें, मैं आपका संदेश समझ नहीं पाया। कृपया फिर से कोशिश करें।';
      case 'kn':
        return 'ಕ್ಷಮಿಸಿ, ನಾನು ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.';
      default:
        return 'Sorry, I couldn\'t understand your message. Please try again.';
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSendMessage(inputText);
      setInputText('');
    }
  };

  const startVoiceRecording = async () => {
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
        await processVoiceInput(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      // For now, we'll use a placeholder for voice transcription
      // In a full implementation, you'd integrate with the GeminiTranscription service
      const transcriptionText = await transcribeAudio(audioBlob);
      
      if (transcriptionText) {
        await handleSendMessage(transcriptionText, true);
      } else {
        setError('Could not understand the audio. Please try speaking clearly.');
      }
    } catch (error) {
      console.error('Voice processing failed:', error);
      setError('Failed to process voice input. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder transcription function - would integrate with GeminiTranscription
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // This is a placeholder - in real implementation, you'd use:
    // return await geminiTranscriptionService.transcribeAudio(audioBlob);
    
    // For demo purposes, return a sample transcription
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('आज कितना बेचा?'); // Sample Hindi query
      }, 1000);
    });
  };

  const getPlaceholderText = (lang: 'en' | 'hi' | 'kn'): string => {
    switch (lang) {
      case 'hi':
        return 'अपना सवाल यहाँ लिखें...';
      case 'kn':
        return 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...';
      default:
        return 'Type your question here...';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full max-h-96 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          {language === 'hi' ? 'व्यापार सहायक' : 
           language === 'kn' ? 'ವ್ಯಾಪಾರ ಸಹಾಯಕ' : 
           'Business Assistant'}
        </h3>
        
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value as 'en' | 'hi' | 'kn')}
          className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">
                  {language === 'hi' ? 'सोच रहा हूँ...' :
                   language === 'kn' ? 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...' :
                   'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={getPlaceholderText(language)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isRecording}
          />
          
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isLoading}
            aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
            className={`p-2 rounded-md transition-colors ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a2 2 0 114 0v4a2 2 0 11-4 0V7z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading || isRecording}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {language === 'hi' ? 'भेजें' :
             language === 'kn' ? 'ಕಳುಹಿಸಿ' :
             'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};