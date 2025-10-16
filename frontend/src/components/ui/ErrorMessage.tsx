import React from 'react';
import { 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  dismissible?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'error',
  title,
  message,
  details,
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  dismissible = false,
  className = '',
  size = 'md'
}) => {
  const getIcon = () => {
    const iconClasses = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    
    switch (type) {
      case 'error':
        return <ExclamationCircleIcon className={`${iconClasses} text-red-500 dark:text-red-400`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClasses} text-yellow-500 dark:text-yellow-400`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClasses} text-blue-500 dark:text-blue-400`} />;
      case 'success':
        return <CheckCircleIcon className={`${iconClasses} text-green-500 dark:text-green-400`} />;
      default:
        return <ExclamationCircleIcon className={`${iconClasses} text-red-500 dark:text-red-400`} />;
    }
  };

  const getBackgroundClasses = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  const getTextClasses = () => {
    switch (type) {
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      case 'success':
        return 'text-green-800 dark:text-green-200';
      default:
        return 'text-red-800 dark:text-red-200';
    }
  };

  const getButtonClasses = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white';
    }
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-sm',
    lg: 'p-6 text-base'
  };

  return (
    <div className={`
      border rounded-lg ${getBackgroundClasses()} ${sizeClasses[size]} ${className}
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`font-medium ${getTextClasses()} ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
              {title}
            </h3>
          )}
          
          <div className={`${title ? 'mt-1' : ''} ${getTextClasses()}`}>
            <p>{message}</p>
            
            {details && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium hover:underline">
                  Show Details
                </summary>
                <div className="mt-2 text-xs opacity-75">
                  <pre className="whitespace-pre-wrap font-mono">{details}</pre>
                </div>
              </details>
            )}
          </div>

          {(onRetry || onDismiss) && (
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md
                    ${getButtonClasses()}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                    transition-colors duration-200
                  `}
                >
                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                  {retryText}
                </button>
              )}
              
              {onDismiss && dismissible && (
                <button
                  onClick={onDismiss}
                  className={`
                    inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md
                    bg-transparent hover:bg-black hover:bg-opacity-5 dark:hover:bg-white dark:hover:bg-opacity-5
                    ${getTextClasses()}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
                    transition-colors duration-200
                  `}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${getTextClasses()} hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10
                transition-colors duration-200
              `}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Predefined error message components for common scenarios
export const NetworkErrorMessage: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorMessage
    type="error"
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
    retryText="Retry Connection"
    className={className}
  />
);

export const NotFoundErrorMessage: React.FC<{
  resource?: string;
  className?: string;
}> = ({ resource = 'resource', className }) => (
  <ErrorMessage
    type="warning"
    title="Not Found"
    message={`The ${resource} you're looking for could not be found.`}
    className={className}
  />
);

export const PermissionErrorMessage: React.FC<{
  action?: string;
  className?: string;
}> = ({ action = 'perform this action', className }) => (
  <ErrorMessage
    type="warning"
    title="Permission Denied"
    message={`You don't have permission to ${action}.`}
    className={className}
  />
);

export const ValidationErrorMessage: React.FC<{
  errors: string[];
  className?: string;
}> = ({ errors, className }) => (
  <ErrorMessage
    type="error"
    title="Validation Error"
    message="Please fix the following errors:"
    details={errors.join('\n')}
    className={className}
  />
);

// Session-specific error messages
export const SessionLoadErrorMessage: React.FC<{
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}> = ({ onRetry, onGoBack, className }) => (
  <ErrorMessage
    type="error"
    title="Failed to Load Sessions"
    message="We couldn't load the sessions for this class. This might be due to a connection issue or you may not have access to this class."
    onRetry={onRetry}
    retryText="Reload Page"
    className={className}
  />
);

export const SessionNotFoundMessage: React.FC<{
  onGoBack?: () => void;
  className?: string;
}> = ({ onGoBack, className }) => (
  <ErrorMessage
    type="warning"
    title="Session Not Found"
    message="The session you're looking for doesn't exist or has been removed."
    onRetry={onGoBack}
    retryText="Go Back to Class"
    className={className}
  />
);

export const SessionPermissionErrorMessage: React.FC<{
  onGoBack?: () => void;
  className?: string;
}> = ({ onGoBack, className }) => (
  <ErrorMessage
    type="warning"
    title="Access Denied"
    message="You don't have permission to access this session. Please check that you're enrolled in this class or contact your teacher."
    onRetry={onGoBack}
    retryText="Go Back to Dashboard"
    className={className}
  />
);

export const SessionCreateErrorMessage: React.FC<{
  onRetry?: () => void;
  onDismiss?: () => void;
  errorType?: 'network' | 'permission' | 'validation' | 'server' | 'unknown';
  className?: string;
}> = ({ onRetry, onDismiss, errorType = 'unknown', className }) => {
  const getErrorConfig = () => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to create session due to a network issue. Please check your internet connection and try again.',
          retryText: 'Retry Creation'
        };
      case 'permission':
        return {
          title: 'Permission Denied',
          message: 'You don\'t have permission to create sessions in this class. Please contact your administrator.',
          retryText: 'Go to Dashboard'
        };
      case 'validation':
        return {
          title: 'Invalid Session Data',
          message: 'The session information provided is invalid. Please check your inputs and try again.',
          retryText: 'Fix and Retry'
        };
      case 'server':
        return {
          title: 'Server Error',
          message: 'The server is temporarily unavailable. Please try again in a moment.',
          retryText: 'Try Again'
        };
      default:
        return {
          title: 'Failed to Create Session',
          message: 'We couldn\'t create the session. Please check your connection and try again.',
          retryText: 'Try Again'
        };
    }
  };

  const config = getErrorConfig();

  return (
    <ErrorMessage
      type="error"
      title={config.title}
      message={config.message}
      onRetry={onRetry}
      onDismiss={onDismiss}
      retryText={config.retryText}
      dismissible={true}
      className={className}
    />
  );
};

export default ErrorMessage;