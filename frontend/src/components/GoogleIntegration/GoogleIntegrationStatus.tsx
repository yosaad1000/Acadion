import React from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import GoogleAuthButton from './GoogleAuthButton';

interface GoogleIntegrationStatusProps {
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const GoogleIntegrationStatus: React.FC<GoogleIntegrationStatusProps> = ({
  showActions = true,
  compact = false,
  className = '',
}) => {
  const {
    integration,
    isAuthenticated,
    isTokenValid,
    isLoading,
    error,
    refreshIntegration,
  } = useGoogleAuth();

  const getStatusInfo = () => {
    if (!isAuthenticated) {
      return {
        status: 'Not Connected',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: '⚪',
        description: 'Google Workspace is not connected',
      };
    }

    if (!isTokenValid) {
      return {
        status: 'Token Expired',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: '⚠️',
        description: 'Google token needs to be refreshed',
      };
    }

    return {
      status: 'Connected',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      icon: '✅',
      description: 'Google Workspace is connected and active',
    };
  };

  const statusInfo = getStatusInfo();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-sm" role="img" aria-label="Status">
          {statusInfo.icon}
        </span>
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.status}
        </span>
        {isLoading && (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-blue-600" />
        )}
      </div>
    );
  }

  return (
    <div className={`google-integration-status ${className}`}>
      <div className={`rounded-lg border p-4 ${statusInfo.bgColor} border-gray-200`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Google Workspace">
              🔗
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Google Workspace</h3>
                <span className="text-lg" role="img" aria-label="Status">
                  {statusInfo.icon}
                </span>
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                )}
              </div>
              <p className={`text-sm ${statusInfo.color} font-medium`}>
                {statusInfo.status}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>

          {showActions && (
            <div className="flex flex-col gap-2">
              <GoogleAuthButton
                variant="connect"
                size="sm"
                onSuccess={() => {
                  console.log('Google authentication successful');
                }}
                onError={(error) => {
                  console.error('Google authentication error:', error);
                }}
              />
              <GoogleAuthButton
                variant="refresh"
                size="sm"
                onSuccess={() => {
                  console.log('Google token refreshed successfully');
                }}
                onError={(error) => {
                  console.error('Google token refresh error:', error);
                }}
              />
              <GoogleAuthButton
                variant="disconnect"
                size="sm"
                onSuccess={() => {
                  console.log('Google integration disconnected');
                }}
                onError={(error) => {
                  console.error('Google disconnection error:', error);
                }}
              />
            </div>
          )}
        </div>

        {integration && isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Integration ID:</span>
                <p className="text-gray-600 font-mono text-xs mt-1 break-all">
                  {integration.integration_id}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Connected:</span>
                <p className="text-gray-600 mt-1">
                  {new Date(integration.created_at).toLocaleDateString()}
                </p>
              </div>
              {integration.google_calendar_id && (
                <div>
                  <span className="font-medium text-gray-700">Calendar:</span>
                  <p className="text-gray-600 mt-1">✅ Connected</p>
                </div>
              )}
              {integration.google_drive_folder_id && (
                <div>
                  <span className="font-medium text-gray-700">Drive:</span>
                  <p className="text-gray-600 mt-1">✅ Connected</p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-sm text-red-700">{error}</span>
              <button
                onClick={refreshIntegration}
                className="ml-auto text-sm text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleIntegrationStatus;