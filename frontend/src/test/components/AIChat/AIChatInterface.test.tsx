import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIChatInterface from '../../../components/AIChat/AIChatInterface';
import { AIChatMessage } from '../../../hooks/useAIChat';

// Mock the AIChatMessage component
vi.mock('../../../components/AIChat/AIChatMessage', () => ({
  default: ({ message }: { message: AIChatMessage }) => (
    <div data-testid={`message-${message.id}`}>
      <span data-testid="message-content">{message.content}</span>
      <span data-testid="message-sender">{message.sender}</span>
    </div>
  )
}));

describe('AIChatInterface', () => {
  const mockOnClose = vi.fn();
  const mockOnSendMessage = vi.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    messages: [],
    onSendMessage: mockOnSendMessage,
    isTyping: false
  };

  const sampleMessages: AIChatMessage[] = [
    {
      id: '1',
      content: 'Hello, how can I help you?',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: '2',
      content: 'I need help with creating a class',
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<AIChatInterface {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('renders chat interface when isOpen is true', () => {
    render(<AIChatInterface {...defaultProps} />);
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Here to help you')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
  });

  it('displays welcome message when no messages exist', () => {
    render(<AIChatInterface {...defaultProps} />);
    
    expect(screen.getByText('Welcome to AI Assistant!')).toBeInTheDocument();
    expect(screen.getByText('💡 How do I create a new class?')).toBeInTheDocument();
    expect(screen.getByText('📊 Help me with attendance tracking')).toBeInTheDocument();
    expect(screen.getByText('🚀 What features are available?')).toBeInTheDocument();
  });

  it('displays messages when they exist', () => {
    render(<AIChatInterface {...defaultProps} messages={sampleMessages} />);
    
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.queryByText('Welcome to AI Assistant!')).not.toBeInTheDocument();
  });

  it('shows typing indicator when isTyping is true', () => {
    render(<AIChatInterface {...defaultProps} messages={sampleMessages} isTyping={true} />);
    
    const typingIndicator = screen.getByRole('generic', { name: /typing/i });
    expect(typingIndicator).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close AI Chat');
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked on mobile', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const backdrop = screen.getByRole('generic', { hidden: true });
    await user.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSendMessage when form is submitted with valid input', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    const sendButton = screen.getByLabelText('Send message');
    
    await user.type(input, 'Test message');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    const sendButton = screen.getByLabelText('Send message');
    
    await user.type(input, 'Test message');
    await user.click(sendButton);
    
    expect(input).toHaveValue('');
  });

  it('does not send empty or whitespace-only messages', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    const sendButton = screen.getByLabelText('Send message');
    
    await user.type(input, '   ');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('sends message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    
    await user.type(input, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('disables input and send button when typing', () => {
    render(<AIChatInterface {...defaultProps} isTyping={true} />);
    
    const input = screen.getByPlaceholderText('Ask me anything...');
    const sendButton = screen.getByLabelText('Send message');
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('calls onSendMessage when suggestion button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    const suggestionButton = screen.getByText('💡 How do I create a new class?');
    await user.click(suggestionButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('How do I create a new class?');
  });

  it('closes chat when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<AIChatInterface {...defaultProps} />);
    
    await user.keyboard('{Escape}');
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('focuses input when chat opens', async () => {
    const { rerender } = render(<AIChatInterface {...defaultProps} isOpen={false} />);
    
    rerender(<AIChatInterface {...defaultProps} isOpen={true} />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Ask me anything...');
      expect(input).toHaveFocus();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<AIChatInterface {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close AI Chat');
    const sendButton = screen.getByLabelText('Send message');
    
    expect(closeButton).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });
});