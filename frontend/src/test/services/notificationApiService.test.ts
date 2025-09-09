import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationApiService, getJsonResponse } from '../../services/notificationApiService';
import { createNetworkError } from '../../utils/errorHandling';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn()
    }
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('notificationApiService', () => {
  const mockSession = {
    access_token: 'mock-token-123'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Get the mocked supabase
    const { supabase } = await import('../../lib/supabase');
    
    // Default successful session mock
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    // Default successful fetch mock
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getNotifications', () => {
    it('should make GET request to notifications endpoint', async () => {
      await notificationApiService.getNotifications();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications',
        expect.objectContaining({
          method: undefined, // GET is default
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123'
          })
        })
      );
    });

    it('should include limit parameter when provided', async () => {
      await notificationApiService.getNotifications(10);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications?limit=10',
        expect.any(Object)
      );
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      const response = await notificationApiService.getNotifications();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject({ name: 'AbortError' }), 100);
        })
      );

      await expect(notificationApiService.getNotifications()).rejects.toThrow('Request timeout');
      
      // Should have retried
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should refresh session on 401 error', async () => {
      const { supabase } = await import('../../lib/supabase');
      const newSession = { access_token: 'new-token-456' };
      
      mockFetch
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
      
      (supabase.auth.refreshSession as any).mockResolvedValue({
        data: { session: newSession }
      });

      const response = await notificationApiService.getNotifications();

      expect(supabase.auth.refreshSession).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('should throw error when no session token available', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
      (supabase.auth.refreshSession as any).mockResolvedValue({ data: { session: null } });

      await expect(notificationApiService.getNotifications()).rejects.toThrow('No valid session token');
    });
  });

  describe('markNotificationRead', () => {
    it('should make PATCH request to mark notification as read', async () => {
      await notificationApiService.markNotificationRead('notification-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/notification-123/read',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123'
          })
        })
      );
    });

    it('should use write retry options', async () => {
      mockFetch
        .mockRejectedValueOnce(createNetworkError('Network error', 500, true))
        .mockResolvedValue(new Response('{}', { status: 200 }));

      const response = await notificationApiService.markNotificationRead('notification-123');

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry (write has maxAttempts: 2)
      expect(response.status).toBe(200);
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should make PATCH request to mark all notifications as read', async () => {
      await notificationApiService.markAllNotificationsRead();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/mark-all-read',
        expect.objectContaining({
          method: 'PATCH'
        })
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should make GET request to unread count endpoint', async () => {
      await notificationApiService.getUnreadCount();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/unread-count',
        expect.any(Object)
      );
    });
  });

  describe('getNotificationPreferences', () => {
    it('should make GET request to preferences endpoint', async () => {
      await notificationApiService.getNotificationPreferences();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/preferences',
        expect.any(Object)
      );
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should make PUT request with preferences data', async () => {
      const preferences = [
        {
          user_id: 'user-123',
          notification_type: 'student_joined' as any,
          enabled: true
        }
      ];

      await notificationApiService.updateNotificationPreferences(preferences);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/preferences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(preferences),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use critical retry options for preferences', async () => {
      mockFetch
        .mockRejectedValueOnce(createNetworkError('Network error', 500, true))
        .mockRejectedValueOnce(createNetworkError('Network error', 500, true))
        .mockResolvedValue(new Response('{}', { status: 200 }));

      const response = await notificationApiService.updateNotificationPreferences([]);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries (critical has more retries)
      expect(response.status).toBe(200);
    });
  });

  describe('clearAllNotifications', () => {
    it('should make DELETE request to clear all notifications', async () => {
      await notificationApiService.clearAllNotifications();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/clear-all',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockSession.access_token}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use write retry options', async () => {
      mockFetch
        .mockRejectedValueOnce(createNetworkError('Network error', 500, true))
        .mockResolvedValueOnce(new Response('', { status: 200 }));

      await notificationApiService.clearAllNotifications();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteNotification', () => {
    it('should make DELETE request to delete specific notification', async () => {
      await notificationApiService.deleteNotification('notification-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/notification-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockSession.access_token}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use write retry options', async () => {
      mockFetch
        .mockRejectedValueOnce(createNetworkError('Network error', 500, true))
        .mockResolvedValueOnce(new Response('', { status: 200 }));

      await notificationApiService.deleteNotification('notification-123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should return circuit breaker status', () => {
      const status = notificationApiService.getCircuitBreakerStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('isHealthy');
    });

    it('should reset circuit breaker', () => {
      expect(() => {
        notificationApiService.resetCircuitBreaker();
      }).not.toThrow();
    });

    it('should fail fast when circuit breaker is open', async () => {
      // Trigger circuit breaker to open by causing multiple failures
      const networkError = createNetworkError('Network error', 500, true);
      mockFetch.mockRejectedValue(networkError);

      // Make multiple failed requests to open circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await notificationApiService.getNotifications();
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should fail fast due to open circuit breaker
      await expect(notificationApiService.getNotifications()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors (5xx)', async () => {
      mockFetch.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

      await expect(notificationApiService.getNotifications()).rejects.toThrow('Server error');
    });

    it('should handle rate limiting (429)', async () => {
      mockFetch.mockResolvedValue(new Response('Rate Limited', { status: 429 }));

      await expect(notificationApiService.getNotifications()).rejects.toThrow('Rate limited');
    });

    it('should handle client errors (4xx)', async () => {
      mockFetch.mockResolvedValue(new Response('Bad Request', { status: 400 }));

      await expect(notificationApiService.getNotifications()).rejects.toThrow('Client error');
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValue(new Response('Forbidden', { status: 403 }));

      await expect(notificationApiService.getNotifications()).rejects.toThrow('Client error');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not retry
    });
  });

  describe('Request Timeout', () => {
    it('should timeout requests after 30 seconds', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      const promise = notificationApiService.getNotifications();
      
      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);
      
      await expect(promise).rejects.toThrow('Request timeout');
    });
  });
});

describe('getJsonResponse', () => {
  it('should parse JSON response successfully', async () => {
    const mockData = { notifications: [] };
    const response = new Response(JSON.stringify(mockData), { status: 200 });

    const result = await getJsonResponse(response);

    expect(result).toEqual(mockData);
  });

  it('should throw error for invalid JSON', async () => {
    const response = new Response('invalid json', { status: 200 });

    await expect(getJsonResponse(response)).rejects.toThrow('Invalid JSON response');
  });

  it('should include response status in error', async () => {
    const response = new Response('invalid json', { status: 500 });

    try {
      await getJsonResponse(response);
    } catch (error: any) {
      expect(error.status).toBe(500);
    }
  });
});