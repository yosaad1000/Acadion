import React from 'react';
import CopyButton from './CopyButton';

interface InviteCodeDisplayProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({ 
  code, 
  size = 'sm',
  showLabel = true,
  className = ""
}) => {
  const sizeClasses = {
    sm: 'text-xs sm:text-sm px-2 py-1',
    md: 'text-sm sm:text-base px-3 py-2', 
    lg: 'text-base sm:text-lg px-3 sm:px-4 py-2 sm:py-3'
  };

  const fontSizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent clicking the parent card
  };

  return (
    <div 
      className={`inline-flex items-center space-x-1 sm:space-x-2 ${className}`}
      onClick={handleClick}
    >
      <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded ${sizeClasses[size]} min-w-0 flex-1 sm:flex-none transition-colors`}>
        {showLabel && (
          <span className={`text-gray-600 dark:text-gray-400 mr-1 sm:mr-2 ${fontSizeClasses[size]} hidden xs:inline`}>
            Code:
          </span>
        )}
        <span className={`font-mono font-semibold text-gray-900 dark:text-gray-100 ${fontSizeClasses[size]} break-all`}>
          {code}
        </span>
      </div>
      <CopyButton 
        text={code} 
        label="Copy Code"
        showLabel={size !== 'sm'}
        className={`${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1'} flex-shrink-0 touch-manipulation`}
      />
    </div>
  );
};

export default InviteCodeDisplay;