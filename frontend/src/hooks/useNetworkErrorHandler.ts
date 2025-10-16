import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

interface NetworkErrorHandlerOptions {
  onNetworkError?: (error: any) => void;
  onNetworkRestore?: () => void;
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
}

interface NetworkErrorState {
  hasNetworkError: boolean;
  isRetrying: boolean;
  retryCount: number;
  lastError: any;
}

export const useNetworkErrorHandler = (options: NetworkErrorHandlerOptions = {}) => {
  const {
    onNetworkError,
    onNetworkRestore,
    autoRetry = true,
    retryInterval = 5000,
    maxRetries = 3
  } = options;

  const { isOnline, wasOffline } = useNetworkStatus();
  
  const [errorState, setErrorState] = useState<NetworkErrorState>({
    hasNetworkError: false,
    isRetrying: false,
    retryCount: 0,
    lastError: null
  });

  // Handle network restoration
  useEffect(() => {
    if (isOnline && wasOffline && errorState.hasNetworkError) {
      setErrorState(prev => ({
        ...prev,
        hasNetworkError: false,
        isRetrying: false,
        retryCount: 0,
        lastError: null
      }));
      
      if (onNetworkRestore) {
        onNetworkRestore();
      }
    }
  }, [isOnline, wasOffline, errorState.hasNetworkError, onNetworkRestore]);

  // Handle network errors
  const handleNetworkError = useCallback((error: any) => {
    const isNetworkError = !isOnline || 
      error?.name === 'TypeError' || 
      error?.message?.includes('fetch') ||
      error?.type === 'network';

    if (isNetworkError) {
      setErrorState(prev => ({
        ...prev,
        hasNetworkError: true,
        lastError: error
      }));

      if (onNetworkError) {
        onNetworkError(error);
      }

      return true; // Indicates this was a network error
    }

    return false; // Not a network error
  }, [isOnline, onNetworkError]);

  // Retry function
  const retry = useCallback(async (retryFn?: () => Promise<any>) => {
    if (errorState.retryCount >= maxRetries) {
      return false;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      if (retryFn) {
        await retryFn();
      }
      
      // Test network connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setErrorState(prev => ({
          ...prev,
          hasNetworkError: false,
          isRetrying: false,
          retryCount: 0,
          lastError: null
        }));
        return true;
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: false
    }));

    return false;
  }, [errorState.retryCount, maxRetries]);

  // Auto retry effect
  useEffect(() => {
    let timeoutId: number;

    if (autoRetry && errorState.hasNetworkError && !errorState.isRetrying && errorState.retryCount < maxRetries) {
      timeoutId = window.setTimeout(() => {
        retry();
      }, retryInterval);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoRetry, errorState.hasNetworkError, errorState.isRetrying, errorState.retryCount, maxRetries, retryInterval, retry]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      hasNetworkError: false,
      isRetrying: false,
      retryCount: 0,
      lastError: null
    });
  }, []);

  // Wrapper function for API calls
  const withNetworkErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | undefined> => {
    try {
      const result = await apiCall();
      
      // Clear any existing network errors on successful call
      if (errorState.hasNetworkError) {
        clearError();
      }
      
      return result;
    } catch (error) {
      const wasNetworkError = handleNetworkError(error);
      
      if (wasNetworkError && fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      throw error;
    }
  }, [errorState.hasNetworkError, handleNetworkError, clearError]);

  return {
    ...errorState,
    isOnline,
    canRetry: errorState.retryCount < maxRetries,
    retry,
    clearError,
    handleNetworkError,
    withNetworkErrorHandling
  };
};