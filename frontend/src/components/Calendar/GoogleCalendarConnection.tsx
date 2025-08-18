import React, { useState, useEffect } from 'react';
import { CalendarConnection } from '../../types';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface GoogleCalendarConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GoogleCalendarConnection: React.FC<GoogleCalendarConnectionProps> = ({ 
  onConnectionChange 
}) => {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calendar/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnection(data);
        onConnectionChange?.(data?.is_connected || false);
      } else {
        setConnection(null);
        onConnectionChange?.(false);
      }
    } catch (err) {
      console.error('Failed to fetch calendar status:', err);
      setError('Failed to check calendar connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirect_uri: `${window.location.origin || 'http://localhost:3000'}/calendar/callback`
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to initiate calendar connection');
      }
    } catch (err) {
      console.error('Failed to connect calendar:', err);
      setError('Failed to connect to Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConnection(null);
        onConnectionChange?.(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to disconnect calendar');
      }
    } catch (err) {
      console.error('Failed to disconnect calendar:', err);
      setError('Failed to disconnect Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
          <span className="text-gray-600">Checking calendar connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <CalendarIcon className="h-8 w-8 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Google Calendar Integration
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Google Calendar to automatically sync class schedules
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {connection?.is_connected ? (
            <>
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={connecting}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {connecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {connection?.is_connected && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-800">
            <p className="font-medium">Calendar connected successfully!</p>
            <p className="mt-1">
              Your class schedules will be automatically synced to your Google Calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConnection;