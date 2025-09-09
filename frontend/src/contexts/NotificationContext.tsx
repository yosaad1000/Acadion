import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useNetworkRecovery } from '../hooks/useNetworkStatus';
import { 
  notificationApiService, 
  getJsonResponse 
} from '../services/notificationApiService';
import { 
  RealtimeConnectionManager, 
  ConnectionState,
  type ConnectionStatus 
} from '../services/realtimeConnectionManager';
import { createNetworkError } from '../utils/errorHandling';
import type { 
  Notification, 
  NotificationPreference, 
  NotificationType 
} from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  preferences: NotificationPreference[];
  connectionStatus: ConnectionStatus;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
  retryConnection: () => Promise<void>;
  clearError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: ConnectionState.DISCONNECTED,
    reconnectAttempts: 0,
    fallbackActive: false
  });
  const [error, setError] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useAuth();
  const connectionManagerRef = useRef<RealtimeConnectionManager | null>(null);
  const isInitializedRef = useRef(false);
  
  // Network recovery handling
  const networkStatus = useNetworkRecovery(useCallback(async () => {
    console.log('🔄 Network recovered, refreshing notifications...');
    await refreshNotifications();
    if (connectionManagerRef.current && user) {
      await connectionManagerRef.current.reconnect(user.auth_user_id);
    }
  }, [user]));

  // Calculate unread count from notifications
  const calculateUnreadCount = useCallback((notificationList: Notification[]) => {
    return notificationList.filter(n => !n.is_read).length;
  }, []);

  // Fetch notifications from API with enhanced error handling
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      console.log('🔔 Fetching notifications...');
      setError(null);
      
      const response = await notificationApiService.getNotifications();
      const data = await getJsonResponse<Notification[]>(response);
      
      console.log('✅ Notifications fetched:', data.length);
      setNotifications(data);
      setUnreadCount(calculateUnreadCount(data));
    } catch (error: any) {
      console.error('❌ Error fetching notifications:', error);
      setError(error.message || 'Failed to fetch notifications');
      
      // If it's a network error and we're offline, don't show error
      if (!networkStatus.isOnline && error.isNetworkError) {
        setError(null);
      }
    }
  }, [isAuthenticated, user, calculateUnreadCount, networkStatus.isOnline]);

  // Fetch notification preferences from API with enhanced error handling
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      console.log('⚙️ Fetching notification preferences...');
      const response = await notificationApiService.getNotificationPreferences();
      const data = await getJsonResponse<NotificationPreference[]>(response);
      
      console.log('✅ Preferences fetched:', data.length);
      setPreferences(data);
    } catch (error: any) {
      console.error('❌ Error fetching preferences:', error);
      // Don't set error for preferences as it's not critical
    }
  }, [isAuthenticated, user]);

  // Set up enhanced real-time connection with fallback
  const setupRealtimeConnection = useCallback(() => {
    if (!isAuthenticated || !user || connectionManagerRef.current) return;

    console.log('🔄 Setting up enhanced real-time notification connection...');

    const connectionManager = new RealtimeConnectionManager({
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      fallbackPollingInterval: 15000, // Poll every 15 seconds when real-time fails
      heartbeatInterval: 30000
    });

    // Subscribe to connection status changes
    connectionManager.onStatusChange(setConnectionStatus);

    // Subscribe to real-time messages
    connectionManager.onMessage((payload) => {
      console.log('🔔 Real-time notification update:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new as Notification;
        setNotifications(prev => {
          const updated = [newNotification, ...prev];
          setUnreadCount(calculateUnreadCount(updated));
          return updated;
        });
      } else if (payload.eventType === 'UPDATE') {
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => {
          const updated = prev.map(n => 
            n.id === updatedNotification.id ? updatedNotification : n
          );
          setUnreadCount(calculateUnreadCount(updated));
          return updated;
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setNotifications(prev => {
          const updated = prev.filter(n => n.id !== deletedId);
          setUnreadCount(calculateUnreadCount(updated));
          return updated;
        });
      }
    });

    // Set up fallback polling when real-time fails
    connectionManager.setFallbackCallback(async () => {
      console.log('🔄 Fallback: Polling for notifications...');
      await fetchNotifications();
    });

    connectionManagerRef.current = connectionManager;

    // Start the connection
    connectionManager.connect(user.auth_user_id).catch(error => {
      console.error('❌ Failed to start real-time connection:', error);
    });
  }, [isAuthenticated, user, calculateUnreadCount, fetchNotifications]);

  // Clean up real-time connection
  const cleanupConnection = useCallback(async () => {
    if (connectionManagerRef.current) {
      console.log('🧹 Cleaning up notification connection...');
      await connectionManagerRef.current.disconnect();
      connectionManagerRef.current = null;
    }
  }, []);

  // Initialize notifications and preferences
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isAuthenticated || !user || isInitializedRef.current) return;

      console.log('🚀 Initializing notifications for user:', user.email);
      setLoading(true);
      isInitializedRef.current = true;

      try {
        // Fetch initial data
        await Promise.all([
          fetchNotifications(),
          fetchPreferences()
        ]);

        // Set up enhanced real-time connection
        setupRealtimeConnection();
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    const resetNotifications = () => {
      if (!isAuthenticated || !user) {
        console.log('🔄 Resetting notification state...');
        setNotifications([]);
        setUnreadCount(0);
        setPreferences([]);
        setLoading(false);
        setError(null);
        cleanupConnection();
        isInitializedRef.current = false;
      }
    };

    if (isAuthenticated && user) {
      initializeNotifications();
    } else {
      resetNotifications();
    }

    // Cleanup on unmount or user change
    return () => {
      if (!isAuthenticated || !user) {
        cleanupConnection();
      }
    };
  }, [isAuthenticated, user, fetchNotifications, fetchPreferences, setupRealtimeConnection, cleanupConnection]);

  // Mark notification as read with enhanced error handling
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    const originalNotifications = notifications;
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      setUnreadCount(calculateUnreadCount(updated));
      return updated;
    });

    try {
      console.log('📖 Marking notification as read:', id);
      await notificationApiService.markNotificationRead(id);
      console.log('✅ Notification marked as read');
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      
      // Revert optimistic update on error
      setNotifications(originalNotifications);
      setUnreadCount(calculateUnreadCount(originalNotifications));
      
      // Set error message
      setError(error.message || 'Failed to mark notification as read');
      throw error;
    }
  }, [notifications, calculateUnreadCount]);

  // Mark all notifications as read with enhanced error handling
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    const originalNotifications = notifications;
    const originalUnreadCount = unreadCount;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      console.log('📖 Marking all notifications as read...');
      await notificationApiService.markAllNotificationsRead();
      console.log('✅ All notifications marked as read');
    } catch (error: any) {
      console.error('❌ Error marking all notifications as read:', error);
      
      // Revert optimistic update on error
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
      
      // Set error message
      setError(error.message || 'Failed to mark all notifications as read');
      throw error;
    }
  }, [notifications, unreadCount]);

  // Clear all notifications with enhanced error handling
  const clearAllNotifications = useCallback(async () => {
    // Optimistic update
    const originalNotifications = notifications;
    const originalUnreadCount = unreadCount;
    setNotifications([]);
    setUnreadCount(0);

    try {
      console.log('🗑️ Clearing all notifications...');
      await notificationApiService.clearAllNotifications();
      console.log('✅ All notifications cleared');
    } catch (error: any) {
      console.error('❌ Error clearing all notifications:', error);
      
      // Revert optimistic update on error
      setNotifications(originalNotifications);
      setUnreadCount(originalUnreadCount);
      
      // Set error message
      setError(error.message || 'Failed to clear all notifications');
      throw error;
    }
  }, [notifications, unreadCount]);

  // Delete individual notification with enhanced error handling
  const deleteNotification = useCallback(async (id: string) => {
    // Optimistic update
    const originalNotifications = notifications;
    const updatedNotifications = notifications.filter(n => n.id !== id);
    setNotifications(updatedNotifications);
    setUnreadCount(calculateUnreadCount(updatedNotifications));

    try {
      console.log('🗑️ Deleting notification:', id);
      await notificationApiService.deleteNotification(id);
      console.log('✅ Notification deleted');
    } catch (error: any) {
      console.error('❌ Error deleting notification:', error);
      
      // Revert optimistic update on error
      setNotifications(originalNotifications);
      setUnreadCount(calculateUnreadCount(originalNotifications));
      
      // Set error message
      setError(error.message || 'Failed to delete notification');
      throw error;
    }
  }, [notifications, calculateUnreadCount]);

  // Update notification preferences with enhanced error handling
  const updatePreferences = useCallback(async (newPreferences: NotificationPreference[]) => {
    // Optimistic update
    const originalPreferences = preferences;
    setPreferences(newPreferences);

    try {
      console.log('⚙️ Updating notification preferences...');
      await notificationApiService.updateNotificationPreferences(newPreferences);
      console.log('✅ Notification preferences updated');
    } catch (error: any) {
      console.error('❌ Error updating preferences:', error);
      
      // Revert optimistic update on error
      setPreferences(originalPreferences);
      
      // Set error message
      setError(error.message || 'Failed to update notification preferences');
      throw error;
    }
  }, [preferences]);

  // Public refresh functions
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Retry connection
  const retryConnection = useCallback(async () => {
    if (connectionManagerRef.current && user) {
      console.log('🔄 Retrying notification connection...');
      setError(null);
      await connectionManagerRef.current.reconnect(user.auth_user_id);
    }
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        preferences,
        connectionStatus,
        error,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        deleteNotification,
        updatePreferences,
        refreshNotifications,
        refreshPreferences,
        retryConnection,
        clearError,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};