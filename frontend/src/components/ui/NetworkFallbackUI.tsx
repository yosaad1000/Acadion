/**
 * Comprehensive network error fallback UI component
 */

import React from 'react';
import { 
  ExclamationTriangleIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  HomeIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { NetworkErrorState } from '../../types';

interface NetworkFallbackUIProps {
  errorState: NetworkErrorState;
  showRetryButton?: boolean;
  showGoBackButton?: boolean;
  showGoHomeButton?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onGoBack?: () => void;
  onGoHome?: () => void;
}

const NetworkFallbackUI: React.FC<NetworkFallbackUIProps> = ({
  errorState,
  showRetryButton = true,
  showGoBackButton = false,
  showGoHomeButton = false,
  className = '',
  size = 'md',
  onGoBack,
  onGoHome
}) => {
  const getErrorIcon = () => {
    const iconSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
    const iconColor = 'text-gray-400';
    
    switch (errorState.errorType) {
      case 'network':
        return <WifiIcon className={`${iconSize} ${iconColor}`} />;
      case 'server':
        return <ServerIcon className={`${iconSize} ${iconColor}`} />;
      case 'permission':
        return <ShieldExclamationIcon className={`${iconSize} ${iconColor}`} />;
      case 'notFound':
        return <DocumentMagnifyingGlassIcon className={`${iconSize} ${iconColor}`} />;
      default:
        return <ExclamationTriangleIcon className={`${iconSize} ${iconColor}`} />;
    }
  };

  const getErrorTitle = () => {
    switch (errorState.errorType) {
      case 'network':
        return 'Connection Problem';
      case 'server':
        return 'Server Error';
      case 'permission':
        return 'Access Denied';
      case 'notFound':
        return 'Not Found';
      case 'validation':
        return 'Invalid Data';
      default:
        return 'Something Went Wrong';
    }
  };

  const getErrorDescription = () => {
    switch (errorState.errorType) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'server':
        return 'Our servers are experiencing issues. Please try again in a moment.';
      case 'permission':
        return 'You don\'t have permission to access this resource.';
      case 'notFound':
        return 'The resource you\'re looking for could not be found.';
      case 'validation':
        return 'The information provided is invalid. Please check your inputs.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const getSuggestions = () => {
    switch (errorState.errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable any VPN or proxy',
          'Contact your network administrator if the problem persists'
        ];
      case 'server':
        return [
          'Wait a few minutes and try again',
          'Check our status page for updates',
          'Contact support if the issue continues'
        ];
      case 'permission':
        return [
          'Make sure you\'re logged in with the correct account',
          'Contact your teacher or administrator for access',
          'Check if your account has the necessary permissions'
        ];
      case 'notFound':
        return [
          'Check the URL for typos',
          'Go back to the previous page',
          'Use the navigation menu to find what you\'re looking for'
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support if the problem continues'
        ];
    }
  };

  const containerSize = {
    sm: 'p-4 max-w-sm',
    md: 'p-6 max-w-md',
    lg: 'p-8 max-w-lg'
  };

  const textSize = {
    sm: { title: 'text-lg', message: 'text-sm', suggestions: 'text-xs' },
    md: { title: 'text-xl', message: 'text-sm', suggestions: 'text-sm' },
    lg: { title: 'text-2xl', message: 'text-base', suggestions: 'text-sm' }
  };

  return (
    <div className={`
      flex flex-col items-center justify-center text-center
      ${containerSize[size]} mx-auto ${className}
    `}>
      {/* Error Icon */}
      <div className="mb-4">
        {getErrorIcon()}
      </div>

      {/* Error Title */}
      <h3 className={`font-semibold text-gray-900 mb-2 ${textSize[size].title}`}>
        {getErrorTitle()}
      </h3>

      {/* Error Message */}
      <p className={`text-gray-600 mb-4 ${textSize[size].message}`}>
        {errorState.message}
      </p>

      {/* Additional Description */}
      <p className={`text-gray-500 mb-6 ${textSize[size].suggestions}`}>
        {getErrorDescription()}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {showRetryButton && errorState.retryable && errorState.retryAction && (
          <button
            onClick={errorState.retryAction}
            className="
              inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
              text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-200
            "
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}

        {showGoBackButton && onGoBack && (
          <button
            onClick={onGoBack}
            className="
              inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md
              text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-200
            "
          >
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Go Back
          </button>
        )}

        {showGoHomeButton && onGoHome && (
          <button
            onClick={onGoHome}
            className="
              inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md
              text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-200
            "
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Go Home
          </button>
        )}
      </div>

      {/* Suggestions */}
      {size !== 'sm' && (
        <div className="w-full">
          <details className="text-left">
            <summary className={`cursor-pointer text-gray-600 hover:text-gray-800 font-medium ${textSize[size].suggestions}`}>
              What can I do?
            </summary>
            <div className="mt-3 space-y-2">
              <ul className={`text-gray-500 space-y-1 ${textSize[size].suggestions}`}>
                {getSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      )}

      {/* Offline Indicator */}
      {errorState.errorType === 'network' && !navigator.onLine && (
        <div className="mt-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className={`text-yellow-800 ${textSize[size].suggestions}`}>
            <WifiIcon className="h-4 w-4 inline mr-1" />
            You appear to be offline
          </p>
        </div>
      )}
    </div>
  );
};

// Predefined fallback components for common scenarios
export const SessionLoadErrorFallback: React.FC<{
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({ onRetry, onGoBack, className }) => {
  const errorState: NetworkErrorState = {
    hasError: true,
    errorType: 'network',
    message: 'Failed to load sessions for this class.',
    retryable: true,
    retryAction: onRetry
  };

  return (
    <NetworkFallbackUI
      errorState={errorState}
      showRetryButton={true}
      showGoBackButton={true}
      onGoBack={onGoBack}
      className={className}
    />
  );
};

export const SessionNotFoundFallback: React.FC<{
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ onGoBack, onGoHome, className }) => {
  const errorState: NetworkErrorState = {
    hasError: true,
    errorType: 'notFound',
    message: 'The session you\'re looking for doesn\'t exist or has been removed.',
    retryable: false
  };

  return (
    <NetworkFallbackUI
      errorState={errorState}
      showRetryButton={false}
      showGoBackButton={true}
      showGoHomeButton={true}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
      className={className}
    />
  );
};

export const SessionPermissionErrorFallback: React.FC<{
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}> = ({ onGoBack, onGoHome, className }) => {
  const errorState: NetworkErrorState = {
    hasError: true,
    errorType: 'permission',
    message: 'You don\'t have permission to access this session.',
    retryable: false
  };

  return (
    <NetworkFallbackUI
      errorState={errorState}
      showRetryButton={false}
      showGoBackButton={true}
      showGoHomeButton={true}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
      className={className}
    />
  );
};

export const NetworkConnectionFallback: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => {
  const errorState: NetworkErrorState = {
    hasError: true,
    errorType: 'network',
    message: 'Unable to connect to the server.',
    retryable: true,
    retryAction: onRetry
  };

  return (
    <NetworkFallbackUI
      errorState={errorState}
      showRetryButton={true}
      className={className}
    />
  );
};

export default NetworkFallbackUI;