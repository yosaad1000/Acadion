import React from 'react';
import { SparklesIcon, UserIcon } from '@heroicons/react/24/outline';

interface AIChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'suggestion' | 'action';
}

interface AIChatMessageProps {
  message: AIChatMessage;
}

const AIChatMessage: React.FC<AIChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser 
          ? 'bg-gray-600 dark:bg-gray-500' 
          : 'bg-blue-600 dark:bg-blue-500'
        }
      `}>
        {isUser ? (
          <UserIcon className="h-4 w-4 text-white" />
        ) : (
          <SparklesIcon className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-xs sm:max-w-sm ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`
          inline-block p-3 rounded-lg shadow-sm border
          ${isUser 
            ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-600'
          }
          ${message.type === 'suggestion' ? 'border-l-4 border-l-yellow-400' : ''}
          ${message.type === 'action' ? 'border-l-4 border-l-green-400' : ''}
        `}>
          {/* Message Type Indicator */}
          {message.type === 'suggestion' && (
            <div className="flex items-center space-x-1 mb-2 text-yellow-600 dark:text-yellow-400">
              <span className="text-xs font-medium">💡 Suggestion</span>
            </div>
          )}
          {message.type === 'action' && (
            <div className="flex items-center space-x-1 mb-2 text-green-600 dark:text-green-400">
              <span className="text-xs font-medium">⚡ Quick Action</span>
            </div>
          )}

          {/* Message Text */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <div className={`mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIChatMessage;