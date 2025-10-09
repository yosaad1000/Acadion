import React from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AIChatToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const AIChatToggle: React.FC<AIChatToggleProps> = ({ 
  isOpen, 
  onClick, 
  className = '' 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed bottom-6 right-6 sm:top-4 sm:right-4 sm:bottom-auto z-[60]
        w-14 h-14 sm:w-12 sm:h-12 md:w-14 md:h-14
        bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
        text-white rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        touch-manipulation
        ${isOpen ? 'scale-110 rotate-180' : 'scale-100 rotate-0'}
        ${className}
      `}
      aria-label={isOpen ? 'Close AI Chat' : 'Open AI Chat'}
      aria-expanded={isOpen}
      role="button"
      type="button"
    >
      {isOpen ? (
        <XMarkIcon className="h-6 w-6 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform duration-200" />
      ) : (
        <ChatBubbleLeftRightIcon className="h-6 w-6 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform duration-200" />
      )}
    </button>
  );
};

export default AIChatToggle;