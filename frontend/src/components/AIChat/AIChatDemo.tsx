import React from 'react';
import { useAIChat } from '../../hooks/useAIChat';
import AIChatToggle from './AIChatToggle';
import AIChatInterface from './AIChatInterface';

/**
 * Demo component to test AI Chat functionality
 * This can be used for testing and development
 */
const AIChatDemo: React.FC = () => {
  const {
    isOpen,
    messages,
    isTyping,
    toggleChat,
    closeChat,
    sendMessage
  } = useAIChat();

  return (
    <div className="relative">
      <AIChatToggle 
        isOpen={isOpen} 
        onClick={toggleChat}
      />
      <AIChatInterface
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        onSendMessage={sendMessage}
        isTyping={isTyping}
      />
    </div>
  );
};

export default AIChatDemo;