import { supabase } from '../lib/supabase';
import type { NotificationPreference } from '../types';
import { 
  withRetry, 
  createNetworkError, 
  CircuitBreaker,
  type RetryOptions 
} from '../utils/errorHandling';

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'http://54.167.95.26:8000'  // Production backend (HTTP to avoid SSL issues)
    : 'http://localhost:8000'); // Local development

// Circuit breaker for notification API
const notificationCircuitBreaker = new CircuitBreaker(3, 30000, 2);

// Retry options for different types of operations
const RETRY_OPTIONS: Record<string, Partial<RetryOptions>> = {
  read: { maxAttempts: 3, baseDelay: 1000 },
  write: { maxAttempts: 2, baseDelay: 2000 },
  critical: { maxAttempts: 5, baseDelay: 500 }
};

/**
 * Enhanced API call with retry logic and error handling
 */
const enhancedApiCall = async (
  endpoint: string, 
  options: RequestInit = {},
  retryType: keyof typeof RETRY_OPTIONS = 'read'
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return withRetry(async () => {
    return notificationCircuitBreaker.execute(async () => {
      // Add default headers
      const defaultHeaders: Record<string, string> = {};
      
      // Only set Content-Type if body is not FormData
      if (options.body && !(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
      }
      
      // Get Supabase session token with retry
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        // Try to refresh session if no token
        const { data: { session: newSession } } = await supabase.auth.refreshSession();
        if (newSession?.access_token) {
          defaultHeaders['Authorization'] = `Bearer ${newSession.access_token}`;
        } else {
          throw createNetworkError('No valid session token', 401, false);
        }
      }

      // Merge with provided headers
      const headers = { ...defaultHeaders, ...options.headers };

      console.log('🌐 Enhanced API Call:', options.method || 'GET', url);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('📡 API Response:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          
          // Create appropriate error based on status
          if (response.status >= 500) {
            throw createNetworkError(`Server error: ${errorText}`, response.status, true);
          } else if (response.status === 429) {
            throw createNetworkError('Rate limited', response.status, true);
          } else if (response.status === 401) {
            throw createNetworkError('Unauthorized', response.status, false);
          } else if (response.status >= 400) {
            throw createNetworkError(`Client error: ${errorText}`, response.status, false);
          }
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw createNetworkError('Request timeout', undefined, true);
        }
        
        if (error.isNetworkError) {
          throw error;
        }
        
        // Handle fetch errors (network issues)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw createNetworkError('Network connection failed', undefined, true);
        }
        
        throw error;
      }
    });
  }, RETRY_OPTIONS[retryType]);
};

/**
 * Enhanced notification API service with comprehensive error handling
 */
export const notificationApiService = {
  /**
   * Get notifications with retry and error handling
   */
  async getNotifications(limit?: number): Promise<Response> {
    const params = limit ? `?limit=${limit}` : '';
    return enhancedApiCall(`/api/notifications${params}`, {}, 'read');
  },

  /**
   * Mark notification as read with retry
   */
  async markNotificationRead(notificationId: string): Promise<Response> {
    return enhancedApiCall(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }, 'write');
  },

  /**
   * Mark all notifications as read with retry
   */
  async markAllNotificationsRead(): Promise<Response> {
    return enhancedApiCall('/api/notifications/mark-all-read', {
      method: 'PATCH',
    }, 'write');
  },

  /**
   * Get unread count with retry
   */
  async getUnreadCount(): Promise<Response> {
    return enhancedApiCall('/api/notifications/unread-count', {}, 'read');
  },

  /**
   * Get notification preferences with retry
   */
  async getNotificationPreferences(): Promise<Response> {
    return enhancedApiCall('/api/notifications/preferences', {}, 'read');
  },

  /**
   * Update notification preferences with retry
   */
  async updateNotificationPreferences(preferences: NotificationPreference[]): Promise<Response> {
    return enhancedApiCall('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }, 'critical');
  },

  /**
   * Clear all notifications for the current user
   */
  async clearAllNotifications(): Promise<Response> {
    return enhancedApiCall('/api/notifications/clear-all', {
      method: 'DELETE',
    }, 'write');
  },

  /**
   * Delete a specific notification
   */
  async deleteNotification(notificationId: string): Promise<Response> {
    return enhancedApiCall(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    }, 'write');
  },

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return {
      state: notificationCircuitBreaker.getState(),
      isHealthy: notificationCircuitBreaker.getState() !== 'open'
    };
  },

  /**
   * Reset circuit breaker (for recovery scenarios)
   */
  resetCircuitBreaker() {
    notificationCircuitBreaker.reset();
    console.log('🔄 Notification circuit breaker reset');
  }
};

/**
 * Wrapper for JSON responses with error handling
 */
export const getJsonResponse = async <T>(response: Response): Promise<T> => {
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Failed to parse JSON response:', error);
    throw createNetworkError('Invalid JSON response', response.status, false);
  }
};