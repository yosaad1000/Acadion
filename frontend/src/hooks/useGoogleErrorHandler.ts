import { useState, useCallback } from 'react';
import { GoogleError, parseGoogleError } from '../components/GoogleIntegration/GoogleErrorHandler';

export interface GoogleErrorState {
  error: GoogleError | null;
  isOffline: boolean;
  retryCount: number;
  lastRetryAt: Date | null;
}

export interface GoogleErrorActions {
  handleError: (error: any) => void;
  clearError: () => void;
  retry: (retryFn: () => Promise<void>) => Promise<void>;
  setOfflineMode: (offline: boolean) => void;
}

export function useGoogleErrorHandler(): GoogleErrorState & GoogleErrorActions {
  const [error, setError] = useState<GoogleError | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryAt, setLastRetryAt] = useState<Date | null>(null);

  const handleError = useCallback((rawError: any) => {
    const parsedError = parseGoogleError(rawError);
    setError(parsedError);
    
    // Auto-detect offline state for network errors
    if (parsedError.type === 'network') {
      setIsOffline(true);
    }
    
    console.error('Google Integration Error:', parsedError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setLastRetryAt(null);
  }, []);

  const setOfflineMode = useCallback((offline: boolean) => {
    setIsOffline(offline);
    if (!offline) {
      // Clear network-related errors when coming back online
      setError(prev => prev?.type === 'network' ? null : prev);
    }
  }, []);

  const retry = useCallback(async (retryFn: () => Promise<void>) => {
    try {
      setLastRetryAt(new Date());
      setRetryCount(prev => prev + 1);
      
      // Clear previous error before retry
      setError(null);
      
      await retryFn();
      
      // Success - reset retry count
      setRetryCount(0);
      setIsOffline(false);
    } catch (retryError) {
      handleError(retryError);
    }
  }, [handleError]);

  return {
    // State
    error,
    isOffline,
    retryCount,
    lastRetryAt,
    
    // Actions
    handleError,
    clearError,
    retry,
    setOfflineMode,
  };
}