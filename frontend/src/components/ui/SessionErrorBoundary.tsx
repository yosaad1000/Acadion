import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SessionServerError } from './SessionErrorState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class SessionErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SessionErrorBoundary caught an error:', error, errorInfo);
    
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
        context: 'session-management'
      };

      console.error('Session Error Report:', errorReport);
      
      // In a real application, send to error reporting service
      // errorReportingService.captureException(error, { 
      //   tags: { context: 'session-management' },
      //   extra: errorReport 
      // });
    } catch (reportingError) {
      console.error('Failed to log session error to service:', reportingError);
    }
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }, 100);
  };

  handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.resetErrorBoundary();
  };

  handleGoBack = () => {
    if (this.props.onGoBack) {
      this.props.onGoBack();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default session error UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <SessionServerError
            onRetry={this.handleRetry}
            onGoBack={this.handleGoBack}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage with session components
export const withSessionErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <SessionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </SessionErrorBoundary>
  );

  WrappedComponent.displayName = `withSessionErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default SessionErrorBoundary;