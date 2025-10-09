import React, { useEffect } from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import GoogleErrorHandler from './GoogleErrorHandler';
import GoogleFallback from './GoogleFallback';
import GoogleIntegrationStatus from './GoogleIntegrationStatus';

interface GoogleIntegrationWrapperProps {
  children: React.ReactNode;
  feature?: 'calendar' | 'drive' | 'meet' | 'general';
  fallbackMode?: 'error' | 'offline' | 'disabled';
  showStatus?: boolean;
  onError?: (error: any) => void;
  className?: string;
}

export const GoogleIntegrationWrapper: React.FC<GoogleIntegrationWrapperProps> = ({
  children,
  feature = 'general',
  fallbackMode = 'error',
  showStatus = false,
  onError,
  className = '',
}) => {
  const {
    isAuthenticated,
    isTokenValid,
    isLoading,
    error,
    googleError,
    isOffline,
    retryCount,
    refreshIntegration,
    clearError,
    retryWithErrorHandling,
  } = useGoogleAuth();

  const isIntegrationReady = isAuthenticated && isTokenValid;
  const hasError = error || googleError;
  const shouldShowFallback = !isIntegrationReady || hasError || isOffline;

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (isOffline) {
        // Automatically retry when coming back online
        retryWithErrorHandling(async () => {
          await refreshIntegration();
        });
      }
    };

    const handleOffline = () => {
      // Handle offline state if needed
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOffline, retryWithErrorHandling, refreshIntegration]);

  // Report errors to parent component
  useEffect(() => {
    if (hasError && onError) {
      onError(googleError || error);
    }
  }, [hasError, googleError, error, onError]);

  const handleRetry = async () => {
    await retryWithErrorHandling(async () => {
      await refreshIntegration();
    });
  };

  const renderContent = () => {
    // Show loading state
    if (isLoading && !hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-gray-600">Loading Google integration...</span>
        </div>
      );
    }

    // Show error handler for specific errors
    if (hasError && fallbackMode === 'error') {
      return (
        <GoogleErrorHandler
          error={googleError || error}
          onRetry={handleRetry}
          onDismiss={clearError}
          showRetry={retryCount < 3} // Limit retry attempts
        />
      );
    }

    // Show fallback for offline or disabled states
    if (shouldShowFallback && (fallbackMode === 'offline' || fallbackMode === 'disabled')) {
      return (
        <GoogleFallback
          feature={feature}
          onManualAction={() => {
            // Try to refresh integration when user takes manual action
            handleRetry();
          }}
        />
      );
    }

    // Show children if integration is ready
    if (isIntegrationReady) {
      return children;
    }

    // Default fallback
    return (
      <GoogleFallback
        feature={feature}
        onManualAction={handleRetry}
      />
    );
  };

  return (
    <div className={`google-integration-wrapper ${className}`}>
      {showStatus && (
        <div className="mb-4">
          <GoogleIntegrationStatus
            showActions={!isIntegrationReady}
            compact={isIntegrationReady}
          />
        </div>
      )}
      
      {renderContent()}
      
      {/* Offline indicator */}
      {isOffline && (
        <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <span>🌐</span>
            <span>You're currently offline. Some features may not work properly.</span>
          </div>
        </div>
      )}
      
      {/* Retry indicator */}
      {retryCount > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Retry attempt: {retryCount}/3
        </div>
      )}
    </div>
  );
};

export default GoogleIntegrationWrapper;