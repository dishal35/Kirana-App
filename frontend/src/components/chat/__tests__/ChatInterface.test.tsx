import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import type { BusinessContext } from '../../../types';

// Mock the ChatAssistant service
vi.mock('../../../services/ChatAssistant', () => ({
  chatAssistant: {
    processQuery: vi.fn(),
    getConversationHistory: vi.fn().mockReturnValue([]),
    clearHistory: vi.fn()
  }
}));

// Mock DOM methods
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn()
});

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive'
};

// Create a proper MediaRecorder constructor mock
const MediaRecorderMock = vi.fn().mockImplementation(() => mockMediaRecorder);

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: MediaRecorderMock
});

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn()
  }
});

describe('ChatInterface', () => {
  let mockBusinessContext: BusinessContext;
  let mockOnLanguageChange: ReturnType<typeof vi.fn>;
  let mockChatAssistant: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked module
    const chatAssistantModule = await import('../../../services/ChatAssistant');
    mockChatAssistant = chatAssistantModule.chatAssistant;
    
    mockBusinessContext = {
      todaysSales: [
        {
          id: '1',
          amount: 150,
          products: [{ productId: 'p1', quantity: 2, unitPrice: 75 }],
          type: 'upi',
          timestamp: new Date('2024-01-15T10:30:00Z')
        }
      ],
      inventory: [
        {
          id: 'p1',
          name: 'Rice',
          price: 75,
          stock: 50,
          reorderThreshold: 10,
          category: 'Grains',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      ],
      salesHistory: []
    };

    mockOnLanguageChange = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render chat interface with English by default', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('Business Assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your question here...')).toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should render in Hindi when language is set to Hindi', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          language="hi"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('व्यापार सहायक')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('अपना सवाल यहाँ लिखें...')).toBeInTheDocument();
      expect(screen.getByText('भेजें')).toBeInTheDocument();
    });

    it('should render in Kannada when language is set to Kannada', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          language="kn"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('ವ್ಯಾಪಾರ ಸಹಾಯಕ')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...')).toBeInTheDocument();
      expect(screen.getByText('ಕಳುಹಿಸಿ')).toBeInTheDocument();
    });

    it('should display welcome message on mount', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText(/Hello! I'm your business assistant/)).toBeInTheDocument();
    });

    it('should display Hindi welcome message when language is Hindi', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          language="hi"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText(/नमस्ते! मैं आपका व्यापार सहायक हूँ/)).toBeInTheDocument();
    });
  });

  describe('language selection', () => {
    it('should call onLanguageChange when language is changed', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const languageSelect = screen.getByDisplayValue('English');
      await user.selectOptions(languageSelect, 'hi');

      expect(mockOnLanguageChange).toHaveBeenCalledWith('hi');
    });

    it('should show all language options', () => {
      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('हिंदी')).toBeInTheDocument();
      expect(screen.getByText('ಕನ್ನಡ')).toBeInTheDocument();
    });
  });

  describe('text messaging', () => {
    it('should send text message when form is submitted', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockResolvedValue({
        message: 'Today you made ₹150 in sales.',
        language: 'en',
        confidence: 0.9
      });

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      const sendButton = screen.getByText('Send');

      await user.type(input, 'How much did I sell today?');
      await user.click(sendButton);

      expect(mockChatAssistant.processQuery).toHaveBeenCalledWith(
        {
          text: 'How much did I sell today?',
          language: 'en',
          isVoice: false
        },
        mockBusinessContext
      );

      await waitFor(() => {
        expect(screen.getByText('How much did I sell today?')).toBeInTheDocument();
        expect(screen.getByText('Today you made ₹150 in sales.')).toBeInTheDocument();
      });
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockResolvedValue({
        message: 'Response',
        language: 'en',
        confidence: 0.9
      });

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      
      await user.type(input, 'Test message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(mockChatAssistant.processQuery).not.toHaveBeenCalled();
    });

    it('should disable input and button while loading', async () => {
      const user = userEvent.setup();
      
      // Make the promise never resolve to keep loading state
      mockChatAssistant.processQuery.mockImplementation(() => new Promise(() => {}));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      const sendButton = screen.getByText('Send');

      await user.type(input, 'Test message');
      await user.click(sendButton);

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('voice messaging', () => {
    beforeEach(() => {
      // Mock successful getUserMedia
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      });
    });

    it('should start voice recording when microphone button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const micButton = screen.getByRole('button', { name: /voice recording/i });
      await user.click(micButton);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should stop recording when microphone button is clicked again', async () => {
      const user = userEvent.setup();

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const micButton = screen.getByRole('button', { name: /voice recording/i });
      
      // Start recording
      await user.click(micButton);
      
      // Stop recording
      await user.click(micButton);

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should handle microphone access denied', async () => {
      const user = userEvent.setup();
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      );

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const micButton = screen.getByRole('button', { name: /voice recording/i });
      await user.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/Could not access microphone/)).toBeInTheDocument();
      });
    });

    it('should disable voice button while loading', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockImplementation(() => new Promise(() => {}));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'Test');
      await user.click(screen.getByText('Send'));

      const micButton = screen.getByRole('button', { name: /voice recording/i });
      expect(micButton).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message when chat query fails', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockRejectedValue(new Error('API Error'));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'Test message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I couldn't understand your message/)).toBeInTheDocument();
      });
    });

    it('should display localized error message in Hindi', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockRejectedValue(new Error('API Error'));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          language="hi"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('अपना सवाल यहाँ लिखें...');
      await user.type(input, 'टेस्ट संदेश');
      await user.click(screen.getByText('भेजें'));

      await waitFor(() => {
        expect(screen.getByText(/माफ करें, मैं आपका संदेश समझ नहीं पाया/)).toBeInTheDocument();
      });
    });
  });

  describe('message display', () => {
    it('should display user messages on the right', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockResolvedValue({
        message: 'Response',
        language: 'en',
        confidence: 0.9
      });

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'User message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        const userMessage = screen.getByText('User message');
        expect(userMessage.closest('.flex')).toHaveClass('justify-end');
      });
    });

    it('should display assistant messages on the left', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockResolvedValue({
        message: 'Assistant response',
        language: 'en',
        confidence: 0.9
      });

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'User message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        const assistantMessage = screen.getByText('Assistant response');
        expect(assistantMessage.closest('.flex')).toHaveClass('justify-start');
      });
    });

    it('should display timestamps for messages', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockResolvedValue({
        message: 'Response',
        language: 'en',
        confidence: 0.9
      });

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'Test message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        // Should have timestamps in HH:MM format
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('loading states', () => {
    it('should show thinking indicator while processing', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockImplementation(() => new Promise(() => {}));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('Type your question here...');
      await user.type(input, 'Test message');
      await user.click(screen.getByText('Send'));

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('should show localized thinking indicator in Hindi', async () => {
      const user = userEvent.setup();
      
      mockChatAssistant.processQuery.mockImplementation(() => new Promise(() => {}));

      render(
        <ChatInterface 
          businessContext={mockBusinessContext}
          language="hi"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const input = screen.getByPlaceholderText('अपना सवाल यहाँ लिखें...');
      await user.type(input, 'टेस्ट');
      await user.click(screen.getByText('भेजें'));

      expect(screen.getByText('सोच रहा हूँ...')).toBeInTheDocument();
    });
  });
});