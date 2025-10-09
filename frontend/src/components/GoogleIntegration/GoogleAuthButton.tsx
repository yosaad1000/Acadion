import React from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'connect' | 'disconnect' | 'refresh';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  variant = 'connect',
  size = 'md',
  disabled = false,
}) => {
  const {
    isAuthenticated,
    isTokenValid,
    isLoading,
    error,
    initiateAuth,
    revokeIntegration,
    refreshToken,
    clearError,
  } = useGoogleAuth();

  const handleConnect = async () => {
    try {
      clearError();
      await initiateAuth();
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Google';
      onError?.(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      clearError();
      const success = await revokeIntegration();
      if (success) {
        onSuccess?.();
      } else {
        throw new Error('Failed to disconnect from Google');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from Google';
      onError?.(errorMessage);
    }
  };

  const handleRefresh = async () => {
    try {
      clearError();
      const success = await refreshToken();
      if (success) {
        onSuccess?.();
      } else {
        throw new Error('Failed to refresh Google token');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh Google token';
      onError?.(errorMessage);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs sm:text-sm min-h-[36px]';
      case 'lg':
        return 'px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg min-h-[48px] sm:min-h-[52px]';
      default:
        return 'px-3 sm:px-4 py-2 text-sm sm:text-base min-h-[44px]';
    }
  };

  const getVariantConfig = () => {
    switch (variant) {
      case 'disconnect':
        return {
          onClick: handleDisconnect,
          text: 'Disconnect Google',
          icon: '🔗',
          bgColor: 'bg-red-600 hover:bg-red-700',
          textColor: 'text-white',
          show: isAuthenticated,
        };
      case 'refresh':
        return {
          onClick: handleRefresh,
          text: 'Refresh Token',
          icon: '🔄',
          bgColor: 'bg-yellow-600 hover:bg-yellow-700',
          textColor: 'text-white',
          show: isAuthenticated && !isTokenValid,
        };
      default:
        return {
          onClick: handleConnect,
          text: isAuthenticated ? 'Reconnect Google' : 'Connect Google Workspace',
          icon: '🔗',
          bgColor: 'bg-blue-600 hover:bg-blue-700',
          textColor: 'text-white',
          show: !isAuthenticated || !isTokenValid,
        };
    }
  };

  const config = getVariantConfig();

  if (!config.show) {
    return null;
  }

  return (
    <div className="google-auth-button">
      <button
        onClick={config.onClick}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center gap-2 
          ${getSizeClasses()}
          ${config.bgColor} ${config.textColor}
          font-medium rounded-lg
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          touch-manipulation
          ${className}
        `}
        aria-label={config.text}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span className="text-lg" role="img" aria-label="Google">
              {config.icon}
            </span>
            <span>{config.text}</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-xs sm:text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 sm:p-3">
          <div className="flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <span className="break-words">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;