import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationProvider, useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { notificationApiService } from '../../services/notificationApiService';
import { createNetworkError } from '../../utils/errorHandling';
import { ConnectionState } from '../../services/realtimeConnectionManager';

// Mock dependencies
vi.mock('../../contexts/AuthContext');
vi.mock('../../services/notificationApiService');
vi.mock('../../hooks/useNetworkStatus');

const mockUseAuth = vi.mocked(useAuth);
const mockNotificationApiService = vi.mocked(notificationApiService);

// Mock network status hook
vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkRecovery: vi.fn(() => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'wifi'
  }))
}));

// Test component to access context
const TestComponent: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    retryConnection,
    clearError
  } = useNotifications();

  return (
    <div>
      <div data-testid="notifications-count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="connection-state">{connectionStatus.state}</div>
      <div data-testid="fallback-active">{connectionStatus.fallbackActive.toString()}</div>
      <button onClick={() => markAsRead('test-id')} data-testid="mark-read-btn">
        Mark Read
      </button>
      <button onClick={markAllAsRead} data-testid="mark-all-read-btn">
        Mark All Read
      </button>
      <button onClick={() => updatePreferences([])} data-testid="update-prefs-btn">
        Update Preferences
      </button>
      <button onClick={retryConnection} data-testid="retry-connection-btn">
        Retry Connection
      </button>
      <button onClick={clearError} data-testid="clear-error-btn">
        Clear Error
      </button>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <NotificationProvider>
      <TestComponent />
    </NotificationProvider>
  );
};

describe('NotificationContext Error Handling', () => {
  const mockUser = {
    auth_user_id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default auth mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn()
    });

    // Default API service mocks
    mockNotificationApiService.getNotifications.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );
    mockNotificationApiService.getNotificationPreferences.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Error Handling', () => {
    it('should handle network errors when fetching notifications', async () => {
      const networkError = createNetworkError('Network connection failed', undefined, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(networkError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network connection failed');
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('should handle server errors (5xx) when fetching notifications', async () => {
      const serverError = createNetworkError('Server error: Internal server error', 500, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(serverError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Server error: Internal server error');
      });
    });

    it('should handle authentication errors (401)', async () => {
      const authError = createNetworkError('Unauthorized', 401, false);
      mockNotificationApiService.getNotifications.mockRejectedValue(authError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Unauthorized');
      });
    });

    it('should handle rate limiting errors (429)', async () => {
      const rateLimitError = createNetworkError('Rate limited', 429, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(rateLimitError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Rate limited');
      });
    });
  });

  describe('Optimistic Updates and Rollback', () => {
    it('should rollback optimistic update when markAsRead fails', async () => {
      const mockNotifications = [
        {
          id: 'test-id',
          recipient_id: 'test-user-id',
          type: 'student_joined',
          title: 'Test',
          message: 'Test message',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockNotificationApiService.getNotifications.mockResolvedValue(
        new Response(JSON.stringify(mockNotifications), { status: 200 })
      );

      const networkError = createNetworkError('Failed to mark as read', 500, true);
      mockNotificationApiService.markNotificationRead.mockRejectedValue(networkError);

      renderWithProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
      });

      // Try to mark as read (should fail and rollback)
      await act(async () => {
        screen.getByTestId('mark-read-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to mark as read');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('1'); // Should be rolled back
      });
    });

    it('should rollback optimistic update when markAllAsRead fails', async () => {
      const mockNotifications = [
        {
          id: 'test-id-1',
          recipient_id: 'test-user-id',
          type: 'student_joined',
          title: 'Test 1',
          message: 'Test message 1',
          is_read: false,
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'test-id-2',
          recipient_id: 'test-user-id',
          type: 'attendance_marked',
          title: 'Test 2',
          message: 'Test message 2',
          is_read: false,
          created_at: '2023-01-01T01:00:00Z'
        }
      ];

      mockNotificationApiService.getNotifications.mockResolvedValue(
        new Response(JSON.stringify(mockNotifications), { status: 200 })
      );

      const networkError = createNetworkError('Failed to mark all as read', 500, true);
      mockNotificationApiService.markAllNotificationsRead.mockRejectedValue(networkError);

      renderWithProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
      });

      // Try to mark all as read (should fail and rollback)
      await act(async () => {
        screen.getByTestId('mark-all-read-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to mark all as read');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2'); // Should be rolled back
      });
    });

    it('should rollback optimistic update when updatePreferences fails', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          user_id: 'test-user-id',
          notification_type: 'student_joined',
          enabled: true,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockNotificationApiService.getNotificationPreferences.mockResolvedValue(
        new Response(JSON.stringify(mockPreferences), { status: 200 })
      );

      const networkError = createNetworkError('Failed to update preferences', 500, true);
      mockNotificationApiService.updateNotificationPreferences.mockRejectedValue(networkError);

      renderWithProvider();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Try to update preferences (should fail and rollback)
      await act(async () => {
        screen.getByTestId('update-prefs-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to update preferences');
      });
    });
  });

  describe('Connection State Management', () => {
    it('should show disconnected state initially', () => {
      renderWithProvider();

      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.DISCONNECTED);
      expect(screen.getByTestId('fallback-active')).toHaveTextContent('false');
    });

    it('should handle connection retry', async () => {
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('retry-connection-btn').click();
      });

      // Should clear error when retrying
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Error Management', () => {
    it('should clear error when clearError is called', async () => {
      const networkError = createNetworkError('Test error', 500, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(networkError);

      renderWithProvider();

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error');
      });

      // Clear the error
      await act(async () => {
        screen.getByTestId('clear-error-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    it('should not show error when offline and network error occurs', async () => {
      // Mock offline state
      const { useNetworkRecovery } = await import('../../hooks/useNetworkStatus');
      vi.mocked(useNetworkRecovery).mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: 'none',
        wasOffline: true
      });

      const networkError = createNetworkError('Network connection failed', undefined, true);
      networkError.isNetworkError = true;
      mockNotificationApiService.getNotifications.mockRejectedValue(networkError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Should not show error when offline
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should handle circuit breaker open state', async () => {
      const circuitBreakerError = createNetworkError('Circuit breaker is open', undefined, false);
      mockNotificationApiService.getNotifications.mockRejectedValue(circuitBreakerError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Circuit breaker is open');
      });
    });

    it('should reset circuit breaker on retry', async () => {
      mockNotificationApiService.resetCircuitBreaker = vi.fn();

      renderWithProvider();

      await act(async () => {
        screen.getByTestId('retry-connection-btn').click();
      });

      // Circuit breaker reset should be called during retry
      expect(mockNotificationApiService.resetCircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeouts', async () => {
      const timeoutError = createNetworkError('Request timeout', undefined, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(timeoutError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Request timeout');
      });
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent API failures gracefully', async () => {
      const networkError = createNetworkError('Network error', 500, true);
      mockNotificationApiService.getNotifications.mockRejectedValue(networkError);
      mockNotificationApiService.getNotificationPreferences.mockRejectedValue(networkError);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Should show error from notifications fetch (preferences errors are not shown)
      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
    });
  });
});