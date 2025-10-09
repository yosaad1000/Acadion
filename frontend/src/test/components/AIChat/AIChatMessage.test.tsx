import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AIChatMessage from '../../../components/AIChat/AIChatMessage';
import { AIChatMessage as MessageType } from '../../../hooks/useAIChat';

describe('AIChatMessage', () => {
  const baseMessage: MessageType = {
    id: '1',
    content: 'Test message content',
    sender: 'user',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    type: 'text'
  };

  it('renders user message with correct styling', () => {
    const userMessage = { ...baseMessage, sender: 'user' as const };
    render(<AIChatMessage message={userMessage} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    
    // Check for user-specific styling classes
    const messageContainer = screen.getByText('Test message content').closest('div');
    expect(messageContainer).toHaveClass('bg-blue-600');
  });

  it('renders AI message with correct styling', () => {
    const aiMessage = { ...baseMessage, sender: 'ai' as const };
    render(<AIChatMessage message={aiMessage} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    
    // Check for AI-specific styling classes
    const messageContainer = screen.getByText('Test message content').closest('div');
    expect(messageContainer).toHaveClass('bg-white');
  });

  it('displays timestamp in correct format', () => {
    render(<AIChatMessage message={baseMessage} />);
    
    // Should display time in HH:MM format
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('shows suggestion indicator for suggestion type messages', () => {
    const suggestionMessage = { ...baseMessage, type: 'suggestion' as const };
    render(<AIChatMessage message={suggestionMessage} />);
    
    expect(screen.getByText('💡 Suggestion')).toBeInTheDocument();
  });

  it('shows action indicator for action type messages', () => {
    const actionMessage = { ...baseMessage, type: 'action' as const };
    render(<AIChatMessage message={actionMessage} />);
    
    expect(screen.getByText('⚡ Quick Action')).toBeInTheDocument();
  });

  it('does not show type indicator for text messages', () => {
    const textMessage = { ...baseMessage, type: 'text' as const };
    render(<AIChatMessage message={textMessage} />);
    
    expect(screen.queryByText('💡 Suggestion')).not.toBeInTheDocument();
    expect(screen.queryByText('⚡ Quick Action')).not.toBeInTheDocument();
  });

  it('renders multiline content correctly', () => {
    const multilineMessage = { 
      ...baseMessage, 
      content: 'Line 1\nLine 2\nLine 3' 
    };
    render(<AIChatMessage message={multilineMessage} />);
    
    const messageElement = screen.getByText('Line 1\nLine 2\nLine 3');
    expect(messageElement).toHaveClass('whitespace-pre-wrap');
  });

  it('displays user icon for user messages', () => {
    const userMessage = { ...baseMessage, sender: 'user' as const };
    render(<AIChatMessage message={userMessage} />);
    
    // Check for UserIcon (we can't directly test the icon, but we can check the container)
    const avatarContainer = screen.getByText('Test message content')
      .closest('.flex')
      ?.querySelector('.bg-gray-600');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('displays AI icon for AI messages', () => {
    const aiMessage = { ...baseMessage, sender: 'ai' as const };
    render(<AIChatMessage message={aiMessage} />);
    
    // Check for SparklesIcon (we can't directly test the icon, but we can check the container)
    const avatarContainer = screen.getByText('Test message content')
      .closest('.flex')
      ?.querySelector('.bg-blue-600');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('applies correct layout for user messages (right-aligned)', () => {
    const userMessage = { ...baseMessage, sender: 'user' as const };
    render(<AIChatMessage message={userMessage} />);
    
    const messageContainer = screen.getByText('Test message content').closest('.flex');
    expect(messageContainer).toHaveClass('flex-row-reverse');
  });

  it('applies correct layout for AI messages (left-aligned)', () => {
    const aiMessage = { ...baseMessage, sender: 'ai' as const };
    render(<AIChatMessage message={aiMessage} />);
    
    const messageContainer = screen.getByText('Test message content').closest('.flex');
    expect(messageContainer).not.toHaveClass('flex-row-reverse');
  });

  it('handles different timestamp formats correctly', () => {
    const morningMessage = { 
      ...baseMessage, 
      timestamp: new Date('2024-01-01T09:30:00Z') 
    };
    const eveningMessage = { 
      ...baseMessage, 
      timestamp: new Date('2024-01-01T21:45:00Z') 
    };
    
    const { rerender } = render(<AIChatMessage message={morningMessage} />);
    expect(screen.getByText('09:30')).toBeInTheDocument();
    
    rerender(<AIChatMessage message={eveningMessage} />);
    expect(screen.getByText('21:45')).toBeInTheDocument();
  });

  it('applies special border styling for suggestion messages', () => {
    const suggestionMessage = { ...baseMessage, type: 'suggestion' as const };
    render(<AIChatMessage message={suggestionMessage} />);
    
    const messageContainer = screen.getByText('Test message content').closest('div');
    expect(messageContainer).toHaveClass('border-l-4', 'border-l-yellow-400');
  });

  it('applies special border styling for action messages', () => {
    const actionMessage = { ...baseMessage, type: 'action' as const };
    render(<AIChatMessage message={actionMessage} />);
    
    const messageContainer = screen.getByText('Test message content').closest('div');
    expect(messageContainer).toHaveClass('border-l-4', 'border-l-green-400');
  });
});