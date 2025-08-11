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
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2', 
    lg: 'text-base px-4 py-3'
  };

  const fontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent clicking the parent card
  };

  return (
    <div 
      className={`inline-flex items-center space-x-2 ${className}`}
      onClick={handleClick}
    >
      <div className={`bg-gray-50 rounded border ${sizeClasses[size]}`}>
        {showLabel && (
          <span className={`text-gray-600 mr-2 ${fontSizeClasses[size]}`}>
            Code:
          </span>
        )}
        <span className={`font-mono font-semibold text-gray-900 ${fontSizeClasses[size]}`}>
          {code}
        </span>
      </div>
      <CopyButton 
        text={code} 
        label="Copy Code"
        showLabel={size !== 'sm'}
        className={size === 'sm' ? 'px-1.5 py-0.5' : ''}
      />
    </div>
  );
};

export default InviteCodeDisplay;