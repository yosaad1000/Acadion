import React from 'react';
import { 
  ExclamationTriangleIcon,
  WifiIcon,
  LockClosedIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface SessionErrorStateProps {
  type: 'network' | 'permission' | 'notFound' | 'server' | 'unknown';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SessionErrorState: React.FC<SessionErrorStateProps> = ({
  type,
  title,
  message,
  onRetry,
  onGoBack,
  className = '',
  size = 'md'
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: WifiIcon,
          defaultTitle: 'Connection Problem',
          defaultMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
          iconColor: 'text-red-500 dark:text-red-400',
          showRetry: true,
          retryText: 'Try Again'
        };
      case 'permission':
        return {
          icon: LockClosedIcon,
          defaultTitle: 'Access Denied',
          defaultMessage: 'You don\'t have permission to access this class. Please check that you\'re enrolled or contact your teacher.',
          iconColor: 'text-yellow-500 dark:text-yellow-400',
          showRetry: false,
          retryText: 'Go to Dashboard'
        };
      case 'notFound':
        return {
          icon: DocumentMagnifyingGlassIcon,
          defaultTitle: 'Not Found',
          defaultMessage: 'The class or session you\'re looking for doesn\'t exist or has been removed.',
          iconColor: 'text-gray-500 dark:text-gray-400',
          showRetry: false,
          retryText: 'Go Back'
        };
      case 'server':
        return {
          icon: ExclamationTriangleIcon,
          defaultTitle: 'Server Error',
          defaultMessage: 'The server is temporarily unavailable. Please try again in a moment.',
          iconColor: 'text-orange-500 dark:text-orange-400',
          showRetry: true,
          retryText: 'Try Again'
        };
      default:
        return {
          icon: ExclamationTriangleIcon,
          defaultTitle: 'Something Went Wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
          iconColor: 'text-red-500 dark:text-red-400',
          showRetry: true,
          retryText: 'Try Again'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-6',
          icon: 'h-8 w-8',
          title: 'text-base',
          message: 'text-sm',
          spacing: 'space-y-3'
        };
      case 'md':
        return {
          container: 'py-12',
          icon: 'h-12 w-12',
          title: 'text-lg',
          message: 'text-base',
          spacing: 'space-y-4'
        };
      case 'lg':
        return {
          container: 'py-16',
          icon: 'h-16 w-16',
          title: 'text-xl',
          message: 'text-lg',
          spacing: 'space-y-6'
        };
      default:
        return {
          container: 'py-12',
          icon: 'h-12 w-12',
          title: 'text-lg',
          message: 'text-base',
          spacing: 'space-y-4'
        };
    }
  };

  const config = getErrorConfig();
  const sizeClasses = getSizeClasses();
  const Icon = config.icon;

  return (
    <div className={`text-center ${sizeClasses.container} ${className}`}>
      <div className={sizeClasses.spacing}>
        {/* Icon */}
        <div className="flex justify-center">
          <Icon className={`${sizeClasses.icon} ${config.iconColor}`} />
        </div>
        
        {/* Title and Message */}
        <div>
          <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${sizeClasses.title}`}>
            {title || config.defaultTitle}
          </h3>
          
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.message} max-w-md mx-auto`}>
            {message || config.defaultMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
          {config.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              {config.retryText}
            </button>
          )}
          
          {!config.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {config.retryText}
            </button>
          )}
          
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Predefined session error components for common scenarios
export const SessionNetworkError: React.FC<{
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({ onRetry, onGoBack, className }) => (
  <SessionErrorState
    type="network"
    onRetry={onRetry}
    onGoBack={onGoBack}
    className={className}
  />
);

export const SessionPermissionError: React.FC<{
  onGoBack?: () => void;
  className?: string;
}> = ({ onGoBack, className }) => (
  <SessionErrorState
    type="permission"
    onRetry={onGoBack}
    className={className}
  />
);

export const SessionNotFoundError: React.FC<{
  onGoBack?: () => void;
  className?: string;
}> = ({ onGoBack, className }) => (
  <SessionErrorState
    type="notFound"
    onRetry={onGoBack}
    className={className}
  />
);

export const SessionServerError: React.FC<{
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({ onRetry, onGoBack, className }) => (
  <SessionErrorState
    type="server"
    onRetry={onRetry}
    onGoBack={onGoBack}
    className={className}
  />
);

export default SessionErrorState;