import React from 'react';

export interface GoogleError {
  type: 'auth' | 'api' | 'network' | 'quota' | 'permission' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

interface GoogleErrorHandlerProps {
  error: GoogleError | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showDismiss?: boolean;
  className?: string;
}

export const GoogleErrorHandler: React.FC<GoogleErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = true,
  className = '',
}) => {
  if (!error) return null;

  const errorObj: GoogleError = typeof error === 'string' 
    ? { type: 'unknown', message: error, timestamp: new Date() }
    : error;

  const getErrorIcon = () => {
    switch (errorObj.type) {
      case 'auth':
        return '🔐';
      case 'network':
        return '🌐';
      case 'quota':
        return '⏱️';
      case 'permission':
        return '🚫';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = () => {
    switch (errorObj.type) {
      case 'auth':
        return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'network':
        return 'border-blue-300 bg-blue-50 text-blue-800';
      case 'quota':
        return 'border-orange-300 bg-orange-50 text-orange-800';
      case 'permission':
        return 'border-red-300 bg-red-50 text-red-800';
      default:
        return 'border-red-300 bg-red-50 text-red-800';
    }
  };

  const getErrorTitle = () => {
    switch (errorObj.type) {
      case 'auth':
        return 'Authentication Error';
      case 'network':
        return 'Network Error';
      case 'quota':
        return 'Quota Exceeded';
      case 'permission':
        return 'Permission Denied';
      default:
        return 'Error';
    }
  };

  const getSuggestion = () => {
    switch (errorObj.type) {
      case 'auth':
        return 'Please reconnect your Google account or refresh your authentication.';
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'quota':
        return 'Google API quota exceeded. Please try again later or contact support.';
      case 'permission':
        return 'You don\'t have permission to access this resource. Contact your administrator.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  };

  return (
    <div className={`google-error-handler ${className}`}>
      <div className={`border rounded-lg p-4 ${getErrorColor()}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0" role="img" aria-label="Error">
            {getErrorIcon()}
          </span>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{getErrorTitle()}</h4>
            <p className="text-sm mb-2">{errorObj.message}</p>
            <p className="text-xs opacity-75 mb-3">{getSuggestion()}</p>
            
            {errorObj.code && (
              <p className="text-xs font-mono opacity-60 mb-3">
                Error Code: {errorObj.code}
              </p>
            )}
            
            <div className="flex gap-2">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-white border border-current rounded text-xs font-medium hover:bg-opacity-10 transition-colors"
                >
                  Try Again
                </button>
              )}
              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-xs font-medium hover:bg-white hover:bg-opacity-10 rounded transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const parseGoogleError = (error: any): GoogleError => {
  const timestamp = new Date();
  
  // Handle network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Unable to connect to Google services',
      timestamp,
    };
  }
  
  // Handle HTTP errors
  if (error.message && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth',
        message: 'Google authentication expired or invalid',
        code: '401',
        timestamp,
      };
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return {
        type: 'permission',
        message: 'Access denied to Google resource',
        code: '403',
        timestamp,
      };
    }
    
    if (message.includes('quota') || message.includes('429')) {
      return {
        type: 'quota',
        message: 'Google API quota exceeded',
        code: '429',
        timestamp,
      };
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        timestamp,
      };
    }
  }
  
  // Default error
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    details: error,
    timestamp,
  };
};

export default GoogleErrorHandler;