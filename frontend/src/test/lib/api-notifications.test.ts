import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../../lib/api'
import { NotificationType, type NotificationPreference } from '../../types'

// Mock the fetch function
global.fetch = vi.fn()

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } }
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'new-mock-token' } }
      })
    }
  }
}))

describe('Notification API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as any).mockClear()
  })

  describe('getNotifications', () => {
    it('should call the correct endpoint without limit', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await api.getNotifications()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })

    it('should call the correct endpoint with limit parameter', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await api.getNotifications(10)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications?limit=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('markNotificationRead', () => {
    it('should call the correct endpoint with PATCH method', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const notificationId = 'test-notification-id'
      await api.markNotificationRead(notificationId)

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/notifications/${notificationId}/read`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('markAllNotificationsRead', () => {
    it('should call the correct endpoint with PATCH method', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await api.markAllNotificationsRead()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/mark-all-read',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('getUnreadCount', () => {
    it('should call the correct endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ count: 5 }),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await api.getUnreadCount()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/unread-count',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('getNotificationPreferences', () => {
    it('should call the correct endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await api.getNotificationPreferences()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/preferences',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should call the correct endpoint with PUT method and preferences data', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const preferences: NotificationPreference[] = [
        {
          user_id: 'user-123',
          notification_type: NotificationType.STUDENT_JOINED,
          enabled: true
        },
        {
          user_id: 'user-123',
          notification_type: NotificationType.ATTENDANCE_MARKED,
          enabled: false
        }
      ]

      await api.updateNotificationPreferences(preferences)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/preferences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(preferences),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })

    it('should handle empty preferences array', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(''),
        status: 200,
        statusText: 'OK'
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const preferences: NotificationPreference[] = []

      await api.updateNotificationPreferences(preferences)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/preferences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify([]),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      )
    })
  })

  describe('API error handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(api.getNotifications()).rejects.toThrow('Network error')
    })

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Endpoint not found')
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const response = await api.getNotifications()
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Type safety', () => {
    it('should enforce correct types for notification preferences', () => {
      // This test ensures TypeScript compilation catches type errors
      const validPreferences: NotificationPreference[] = [
        {
          user_id: 'user-123',
          notification_type: NotificationType.STUDENT_JOINED,
          enabled: true
        }
      ]

      // This should compile without errors
      expect(() => api.updateNotificationPreferences(validPreferences)).not.toThrow()
    })

    it('should work with all notification types', () => {
      const allTypesPreferences: NotificationPreference[] = Object.values(NotificationType).map(type => ({
        user_id: 'user-123',
        notification_type: type,
        enabled: true
      }))

      expect(allTypesPreferences).toHaveLength(5)
      expect(() => api.updateNotificationPreferences(allTypesPreferences)).not.toThrow()
    })
  })
})