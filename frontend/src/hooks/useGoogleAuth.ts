import { useState, useEffect, useCallback } from 'react';
import { googleService, GoogleIntegrationResponse, GoogleAuthRequest } from '../services/googleService';
import { useGoogleErrorHandler } from './useGoogleErrorHandler';

export interface GoogleAuthState {
  integration: GoogleIntegrationResponse | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isTokenValid: boolean;
  googleError: any;
  isOffline: boolean;
  retryCount: number;
}

export interface GoogleAuthActions {
  initiateAuth: (state?: string) => Promise<void>;
  completeAuth: (authRequest: GoogleAuthRequest) => Promise<boolean>;
  refreshIntegration: () => Promise<void>;
  revokeIntegration: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  retryWithErrorHandling: (retryFn: () => Promise<void>) => Promise<void>;
}

export function useGoogleAuth(): GoogleAuthState & GoogleAuthActions {
  const [integration, setIntegration] = useState<GoogleIntegrationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const errorHandler = useGoogleErrorHandler();

  const isAuthenticated = integration !== null && integration.is_active;
  const isTokenValid = integration?.is_token_valid ?? false;

  /**
   * Load current integration status
   */
  const refreshIntegration = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const integrationData = await googleService.getIntegration();
      setIntegration(integrationData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Google integration';
      setError(errorMessage);
      errorHandler.handleError(err);
      console.error('Error refreshing integration:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate Google OAuth flow
   */
  const initiateAuth = useCallback(async (state?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const authUrlResponse = await googleService.getAuthUrl(state);
      
      if (authUrlResponse.success) {
        // Redirect to Google OAuth
        window.location.href = authUrlResponse.auth_url;
      } else {
        throw new Error(authUrlResponse.message || 'Failed to get authorization URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Google authentication';
      setError(errorMessage);
      errorHandler.handleError(err);
      console.error('Error initiating auth:', err);
      setIsLoading(false);
    }
  }, []);

  /**
   * Complete Google OAuth flow with authorization code
   */
  const completeAuth = useCallback(async (authRequest: GoogleAuthRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const authResponse = await googleService.authenticate(authRequest);
      
      if (authResponse.success && authResponse.integration) {
        setIntegration(authResponse.integration);
        return true;
      } else {
        throw new Error(authResponse.message || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete Google authentication';
      setError(errorMessage);
      errorHandler.handleError(err);
      console.error('Error completing auth:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Revoke Google integration
   */
  const revokeIntegration = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await googleService.revokeIntegration();
      
      if (result.success) {
        setIntegration(null);
        return true;
      } else {
        throw new Error(result.message || 'Failed to revoke integration');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke Google integration';
      setError(errorMessage);
      errorHandler.handleError(err);
      console.error('Error revoking integration:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh Google access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await googleService.refreshToken();
      
      if (result.success && result.has_valid_token) {
        // Refresh integration data to get updated token status
        await refreshIntegration();
        return true;
      } else {
        throw new Error(result.message || 'Failed to refresh token');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh Google token';
      setError(errorMessage);
      errorHandler.handleError(err);
      console.error('Error refreshing token:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshIntegration]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    errorHandler.clearError();
  }, [errorHandler]);

  // Load integration on mount
  useEffect(() => {
    refreshIntegration();
  }, [refreshIntegration]);

  return {
    // State
    integration,
    isLoading,
    error,
    isAuthenticated,
    isTokenValid,
    
    // Actions
    initiateAuth,
    completeAuth,
    refreshIntegration,
    revokeIntegration,
    refreshToken,
    clearError,
    
    // Error handling
    googleError: errorHandler.error,
    isOffline: errorHandler.isOffline,
    retryCount: errorHandler.retryCount,
    retryWithErrorHandling: errorHandler.retry,
  };
}