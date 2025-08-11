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
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
        copied 
          ? 'text-green-700 bg-green-50 border border-green-200' 
          : 'text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100'
      } ${className}`}
      title={copied ? 'Copied!' : `Copy ${label}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3 w-3 mr-1" />
          {showLabel && 'Copied!'}
        </>
      ) : (
        <>
          <ClipboardIcon className="h-3 w-3 mr-1" />
          {showLabel && label}
        </>
      )}
    </button>
  );
};

export default CopyButton;