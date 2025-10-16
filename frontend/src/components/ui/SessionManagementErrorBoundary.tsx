import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class SessionManagementErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SessionManagementErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error reporting service
    this.logErrorToService(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        context: this.props.context || 'session-management',
        retryCount: this.state.retryCount
      };

      console.error('Session Management Error Report:', errorReport);
      
      // In a real application, send to error reporting service
      // errorReportingService.captureException(error, { 
      //   tags: { context: this.props.context || 'session-management' },
      //   extra: errorReport 
      // });
    } catch (reportingError) {
      console.error('Failed to log session management error to service:', reportingError);
    }
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }, 100);
  };

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      // Too many retries, suggest going back or home
      return;
    }

    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.resetErrorBoundary();
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      window.history.back();
    }
  };

  handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/dashboard';
    }
  };

  getErrorMessage = () => {
    const { error } = this.state;
    const { context } = this.props;
    
    if (!error) return 'An unexpected error occurred';
    
    // Customize error messages based on context and error type
    if (context === 'session-creation') {
      return 'There was a problem creating the session. This might be due to invalid data or a temporary server issue.';
    } else if (context === 'session-loading') {
      return 'Unable to load sessions for this class. This could be due to network issues or access permissions.';
    } else if (context === 'session-editing') {
      return 'Failed to save changes to the session. Your changes may not have been saved.';
    }
    
    // Generic error messages based on error content
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    } else if (error.message.includes('permission') || error.message.includes('403')) {
      return 'You don\'t have permission to perform this action. Please contact your administrator.';
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The requested resource could not be found. It may have been moved or deleted.';
    }
    
    return 'An unexpected error occurred while managing sessions. Please try again.';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const errorMessage = this.getErrorMessage();

      // Enhanced session management error UI
      return (
        <div className="min-h-[400px] bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="space-y-4">
              {/* Error Icon */}
              <div className="flex justify-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-red-500 dark:text-red-400" />
              </div>
              
              {/* Error Title and Message */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xl mb-2">
                  Something Went Wrong
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 text-base mb-4">
                  {errorMessage}
                </p>

                {this.state.retryCount >= this.maxRetries && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                    Multiple retry attempts failed. Please try refreshing the page or contact support if the problem persists.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleGoBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Go Back
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
              </div>

              {/* Error Details (Collapsible) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    Show Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                    <pre className="whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                      {this.state.error.message}
                      {this.state.error.stack && '\n\n' + this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage with session components
export const withSessionManagementErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <SessionManagementErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </SessionManagementErrorBoundary>
  );

  WrappedComponent.displayName = `withSessionManagementErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default SessionManagementErrorBoundary;