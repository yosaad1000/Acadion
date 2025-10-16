import React, { useState, useEffect } from 'react';
import { 
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface NetworkErrorStateProps {
  onRetry?: () => void;
  onDismiss?: () => void;
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  onRetry,
  onDismiss,
  autoRetry = false,
  retryInterval = 5000,
  maxRetries = 3,
  className = '',
  size = 'md'
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
      if (onRetry) {
        onRetry();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onRetry]);

  useEffect(() => {
    let intervalId: number;
    let countdownId: number;

    if (autoRetry && !isOnline && retryCount < maxRetries) {
      setCountdown(retryInterval / 1000);
      
      countdownId = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      intervalId = window.setTimeout(() => {
        handleRetry();
      }, retryInterval);
    }

    return () => {
      if (intervalId) clearTimeout(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
  }, [autoRetry, isOnline, retryCount, retryInterval, maxRetries]);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Test network connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setIsOnline(true);
        setRetryCount(0);
        if (onRetry) {
          onRetry();
        }
      } else {
        throw new Error('Network test failed');
      }
    } catch (error) {
      console.error('Network retry failed:', error);
      // Will retry automatically if autoRetry is enabled
    } finally {
      setIsRetrying(false);
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

  const sizeClasses = getSizeClasses();

  if (isOnline) {
    return (
      <div className={`text-center ${sizeClasses.container} ${className}`}>
        <div className={sizeClasses.spacing}>
          <div className="flex justify-center">
            <CheckCircleIcon className={`${sizeClasses.icon} text-green-500 dark:text-green-400`} />
          </div>
          
          <div>
            <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${sizeClasses.title}`}>
              Connection Restored
            </h3>
            
            <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.message}`}>
              Your internet connection has been restored. You can continue using the application.
            </p>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center ${sizeClasses.container} ${className}`}>
      <div className={sizeClasses.spacing}>
        {/* Icon */}
        <div className="flex justify-center">
          {isRetrying ? (
            <div className={`${sizeClasses.icon} animate-spin`}>
              <ArrowPathIcon className="w-full h-full text-blue-500 dark:text-blue-400" />
            </div>
          ) : (
            <WifiIcon className={`${sizeClasses.icon} text-red-500 dark:text-red-400`} />
          )}
        </div>
        
        {/* Title and Message */}
        <div>
          <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${sizeClasses.title}`}>
            {isRetrying ? 'Reconnecting...' : 'No Internet Connection'}
          </h3>
          
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.message} max-w-md mx-auto`}>
            {isRetrying 
              ? 'Attempting to reconnect to the internet...'
              : 'Please check your internet connection and try again. Some features may not work without an active connection.'
            }
          </p>

          {autoRetry && countdown > 0 && retryCount < maxRetries && (
            <p className={`mt-2 text-sm text-blue-600 dark:text-blue-400`}>
              Retrying in {countdown} seconds... (Attempt {retryCount + 1} of {maxRetries})
            </p>
          )}

          {retryCount >= maxRetries && (
            <p className={`mt-2 text-sm text-yellow-600 dark:text-yellow-400`}>
              Maximum retry attempts reached. Please check your connection and try manually.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying || (autoRetry && retryCount >= maxRetries)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Continue Offline
            </button>
          )}
        </div>

        {/* Connection Tips */}
        <details className="mt-4 text-left max-w-md mx-auto">
          <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-center">
            Connection Troubleshooting
          </summary>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300">
            <ul className="space-y-1 list-disc list-inside">
              <li>Check your WiFi or mobile data connection</li>
              <li>Try refreshing the page</li>
              <li>Restart your router or modem</li>
              <li>Contact your internet service provider if the problem persists</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};

export default NetworkErrorState;