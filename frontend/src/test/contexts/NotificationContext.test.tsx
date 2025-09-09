import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { NotificationProvider, useNotifications } from '../../contexts/NotificationContext'
import { AuthProvider } from '../../contexts/AuthContext'
import { NotificationType, type Notification, type NotificationPreference } from '../../types'
import * as apiModule from '../../lib/api'
import * as supabaseModule from '../../lib/supabase'

// Mock the API module
vi.mock('../../lib/api', () => ({
  api: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  }
}))

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn((callback) => {
          callback('SUBSCRIBED')
          return { unsubscribe: vi.fn() }
        })
      }))
    }))
  }
}))

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      auth_user_id: 'test-user-id',
      email: 'test@example.com'
    },
    isAuthenticated: true
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Test component to access the context
const TestComponent = () => {
  const {
    notifications,
    unreadCount,
    loading,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refreshNotifications,
    refreshPreferences
  } = useNotifications()

  return (
    <div>
      <div data-testid="notifications-count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="preferences-count">{preferences.length}</div>
      <button onClick={() => markAsRead('test-id')} data-testid="mark-read">Mark Read</button>
      <button onClick={markAllAsRead} data-testid="mark-all-read">Mark All Read</button>
      <button onClick={() => updatePreferences([])} data-testid="update-preferences">Update Preferences</button>
      <button onClick={refreshNotifications} data-testid="refresh-notifications">Refresh Notifications</button>
      <button onClick={refreshPreferences} data-testid="refresh-preferences">Refresh Preferences</button>
    </div>
  )
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    recipient_id: 'test-user-id',
    sender_id: 'sender-1',
    type: NotificationType.STUDENT_JOINED,
    title: 'Student Joined',
    message: 'A student joined your class',
    data: {
      student_name: 'John Doe',
      subject_name: 'Math 101',
      subject_code: 'MATH101',
      joined_at: '2023-01-01T10:00:00Z'
    },
    is_read: false,
    created_at: '2023-01-01T10:00:00Z'
  },
  {
    id: '2',
    recipient_id: 'test-user-id',
    type: NotificationType.ATTENDANCE_MARKED,
    title: 'Attendance Marked',
    message: 'Attendance has been marked',
    data: {
      subject_name: 'Math 101',
      session_name: 'Session 1',
      total_students: 25,
      present_count: 23,
      marked_at: '2023-01-01T11:00:00Z'
    },
    is_read: true,
    created_at: '2023-01-01T11:00:00Z'
  }
]

const mockPreferences: NotificationPreference[] = [
  {
    id: '1',
    user_id: 'test-user-id',
    notification_type: NotificationType.STUDENT_JOINED,
    enabled: true,
    created_at: '2023-01-01T09:00:00Z'
  },
  {
    id: '2',
    user_id: 'test-user-id',
    notification_type: NotificationType.ATTENDANCE_MARKED,
    enabled: false,
    created_at: '2023-01-01T09:00:00Z'
  }
]

describe('NotificationContext', () => {
  const mockApi = apiModule.api as any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default API responses
    mockApi.getNotifications.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotifications)
    })
    
    mockApi.getNotificationPreferences.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPreferences)
    })
    
    mockApi.markNotificationRead.mockResolvedValue({ ok: true })
    mockApi.markAllNotificationsRead.mockResolvedValue({ ok: true })
    mockApi.updateNotificationPreferences.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should provide initial context values', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Initially loading should be true
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Check that notifications and preferences were loaded
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('2')
    expect(screen.getByTestId('preferences-count')).toHaveTextContent('2')
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1') // Only one unread notification
  })

  it('should fetch notifications and preferences on initialization', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(mockApi.getNotifications).toHaveBeenCalledTimes(1)
      expect(mockApi.getNotificationPreferences).toHaveBeenCalledTimes(1)
    })
  })

  it('should mark notification as read', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Mark notification as read
    await act(async () => {
      screen.getByTestId('mark-read').click()
    })

    expect(mockApi.markNotificationRead).toHaveBeenCalledWith('test-id')
  })

  it('should mark all notifications as read', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Mark all notifications as read
    await act(async () => {
      screen.getByTestId('mark-all-read').click()
    })

    expect(mockApi.markAllNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it('should update notification preferences', async () => {
    const newPreferences: NotificationPreference[] = [
      {
        user_id: 'test-user-id',
        notification_type: NotificationType.STUDENT_JOINED,
        enabled: false
      }
    ]

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Update preferences
    await act(async () => {
      screen.getByTestId('update-preferences').click()
    })

    expect(mockApi.updateNotificationPreferences).toHaveBeenCalledWith([])
  })

  it('should refresh notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Clear previous calls
    mockApi.getNotifications.mockClear()

    // Refresh notifications
    await act(async () => {
      screen.getByTestId('refresh-notifications').click()
    })

    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1)
  })

  it('should refresh preferences', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Clear previous calls
    mockApi.getNotificationPreferences.mockClear()

    // Refresh preferences
    await act(async () => {
      screen.getByTestId('refresh-preferences').click()
    })

    expect(mockApi.getNotificationPreferences).toHaveBeenCalledTimes(1)
  })

  it('should handle API errors gracefully', async () => {
    // Mock API to return error
    mockApi.getNotifications.mockResolvedValue({
      ok: false,
      status: 500
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Should still render without crashing
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('0')
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should calculate unread count correctly', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    // Should show 1 unread (first notification is unread, second is read)
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1')
  })

  it('should setup real-time subscription', async () => {
    const mockChannel = vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn((callback) => {
          callback('SUBSCRIBED')
          return { unsubscribe: vi.fn() }
        })
      }))
    }))

    const mockSupabase = supabaseModule.supabase as any
    mockSupabase.channel = mockChannel

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith('notifications')
    })
  })

  it('should throw error when used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useNotifications()
      return <div>Test</div>
    }

    expect(() => {
      render(<TestComponentOutsideProvider />)
    }).toThrow('useNotifications must be used within a NotificationProvider')
  })
})