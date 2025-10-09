import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { googleService } from '../../services/googleService';

interface GoogleOAuthCallbackProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

export const GoogleOAuthCallback: React.FC<GoogleOAuthCallbackProps> = ({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeAuth } = useGoogleAuth();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Google authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the callback URL
        const callbackData = googleService.parseCallbackUrl(window.location.href);
        
        if (callbackData.error) {
          throw new Error(callbackData.error === 'access_denied' 
            ? 'Google authentication was cancelled' 
            : `Google authentication error: ${callbackData.error}`
          );
        }

        if (!callbackData.code) {
          throw new Error('No authorization code received from Google');
        }

        // Complete the authentication
        const redirectUri = googleService.getRedirectUri();
        const success = await completeAuth({
          authorization_code: callbackData.code,
          redirect_uri: redirectUri,
        });

        if (success) {
          setStatus('success');
          setMessage('Google Workspace connected successfully!');
          onSuccess?.();
          
          // Redirect after a short delay
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 2000);
        } else {
          throw new Error('Failed to complete Google authentication');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setStatus('error');
        setMessage(errorMessage);
        onError?.(errorMessage);
        
        // Redirect to dashboard after error display
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 5000);
      }
    };

    handleCallback();
  }, [location, completeAuth, navigate, redirectTo, onSuccess, onError]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4" role="img" aria-label="Status">
              {getStatusIcon()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Google Authentication
            </h1>
            <p className={`text-lg font-medium ${getStatusColor()}`}>
              {message}
            </p>
          </div>

          {status === 'processing' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-700">
                  You can now use Google Calendar, Drive, and Meet features in your dashboard.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">
                  Please try connecting to Google Workspace again from your dashboard.
                </p>
              </div>
              <button
                onClick={() => navigate(redirectTo, { replace: true })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;