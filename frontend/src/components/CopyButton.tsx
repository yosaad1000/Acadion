import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

const CopyButton: React.FC<CopyButtonProps> = ({ 
  text, 
  label = "Copy", 
  className = "",
  showLabel = true 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors touch-manipulation min-h-[32px] ${
        copied 
          ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
      } ${className}`}
      title={copied ? 'Copied!' : `Copy ${label}`}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${label} to clipboard`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          {showLabel && <span className="hidden xs:inline">Copied!</span>}
        </>
      ) : (
        <>
          <ClipboardIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          {showLabel && <span className="hidden xs:inline">{label}</span>}
        </>
      )}
    </button>
  );
};

export default CopyButton;