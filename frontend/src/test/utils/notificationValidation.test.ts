import { describe, it, expect } from 'vitest'
import {
  isValidNotificationType,
  isValidNotification,
  isValidNotificationPreference,
  isValidStudentJoinedData,
  isValidAttendanceMarkedData,
  isValidClassJoinedData,
  isValidAttendanceFailedData,
  isValidJoinFailedData,
  isValidNotificationData,
  isValidNotificationArray,
  isValidNotificationPreferenceArray,
  hasStudentJoinedData,
  hasAttendanceMarkedData,
  hasClassJoinedData,
  hasAttendanceFailedData,
  hasJoinFailedData
} from '../../utils/notificationValidation'
import { NotificationType, type Notification } from '../../types'

describe('Notification Validation Utilities', () => {
  describe('isValidNotificationType', () => {
    it('should validate correct notification types', () => {
      expect(isValidNotificationType(NotificationType.STUDENT_JOINED)).toBe(true)
      expect(isValidNotificationType(NotificationType.ATTENDANCE_MARKED)).toBe(true)
      expect(isValidNotificationType(NotificationType.ATTENDANCE_FAILED)).toBe(true)
      expect(isValidNotificationType(NotificationType.CLASS_JOINED)).toBe(true)
      expect(isValidNotificationType(NotificationType.JOIN_FAILED)).toBe(true)
    })

    it('should reject invalid notification types', () => {
      expect(isValidNotificationType('invalid_type')).toBe(false)
      expect(isValidNotificationType(123)).toBe(false)
      expect(isValidNotificationType(null)).toBe(false)
      expect(isValidNotificationType(undefined)).toBe(false)
    })
  })

  describe('isValidNotification', () => {
    const validNotification = {
      id: 'test-id',
      recipient_id: 'user-123',
      sender_id: 'user-456',
      type: NotificationType.STUDENT_JOINED,
      title: 'Test Title',
      message: 'Test Message',
      data: { test: 'data' },
      is_read: false,
      created_at: '2024-01-01T00:00:00Z'
    }

    it('should validate a complete notification', () => {
      expect(isValidNotification(validNotification)).toBe(true)
    })

    it('should validate notification without optional fields', () => {
      const minimalNotification = {
        id: 'test-id',
        recipient_id: 'user-123',
        type: NotificationType.CLASS_JOINED,
        title: 'Test Title',
        message: 'Test Message',
        is_read: true,
        created_at: '2024-01-01T00:00:00Z'
      }
      expect(isValidNotification(minimalNotification)).toBe(true)
    })

    it('should reject invalid notifications', () => {
      expect(isValidNotification(null)).toBe(false)
      expect(isValidNotification(undefined)).toBe(false)
      expect(isValidNotification('string')).toBe(false)
      expect(isValidNotification({})).toBe(false)
      
      // Missing required fields
      expect(isValidNotification({ ...validNotification, id: undefined })).toBe(false)
      expect(isValidNotification({ ...validNotification, recipient_id: undefined })).toBe(false)
      expect(isValidNotification({ ...validNotification, type: 'invalid' })).toBe(false)
      expect(isValidNotification({ ...validNotification, is_read: 'not_boolean' })).toBe(false)
    })
  })

  describe('isValidNotificationPreference', () => {
    const validPreference = {
      id: 'pref-123',
      user_id: 'user-123',
      notification_type: NotificationType.STUDENT_JOINED,
      enabled: true,
      created_at: '2024-01-01T00:00:00Z'
    }

    it('should validate a complete preference', () => {
      expect(isValidNotificationPreference(validPreference)).toBe(true)
    })

    it('should validate preference without optional fields', () => {
      const minimalPreference = {
        user_id: 'user-123',
        notification_type: NotificationType.ATTENDANCE_MARKED,
        enabled: false
      }
      expect(isValidNotificationPreference(minimalPreference)).toBe(true)
    })

    it('should reject invalid preferences', () => {
      expect(isValidNotificationPreference(null)).toBe(false)
      expect(isValidNotificationPreference({})).toBe(false)
      expect(isValidNotificationPreference({ ...validPreference, user_id: undefined })).toBe(false)
      expect(isValidNotificationPreference({ ...validPreference, notification_type: 'invalid' })).toBe(false)
      expect(isValidNotificationPreference({ ...validPreference, enabled: 'not_boolean' })).toBe(false)
    })
  })

  describe('Data structure validators', () => {
    describe('isValidStudentJoinedData', () => {
      const validData = {
        student_name: 'John Doe',
        subject_name: 'Math',
        subject_code: 'MATH101',
        joined_at: '2024-01-01T00:00:00Z'
      }

      it('should validate correct data', () => {
        expect(isValidStudentJoinedData(validData)).toBe(true)
      })

      it('should reject invalid data', () => {
        expect(isValidStudentJoinedData(null)).toBe(false)
        expect(isValidStudentJoinedData({})).toBe(false)
        expect(isValidStudentJoinedData({ ...validData, student_name: undefined })).toBe(false)
        expect(isValidStudentJoinedData({ ...validData, subject_code: 123 })).toBe(false)
      })
    })

    describe('isValidAttendanceMarkedData', () => {
      const validData = {
        subject_name: 'Physics',
        session_name: 'Lab 1',
        total_students: 25,
        present_count: 23,
        marked_at: '2024-01-01T00:00:00Z'
      }

      it('should validate correct data', () => {
        expect(isValidAttendanceMarkedData(validData)).toBe(true)
      })

      it('should reject invalid data', () => {
        expect(isValidAttendanceMarkedData(null)).toBe(false)
        expect(isValidAttendanceMarkedData({ ...validData, total_students: 'not_number' })).toBe(false)
        expect(isValidAttendanceMarkedData({ ...validData, present_count: undefined })).toBe(false)
      })
    })

    describe('isValidClassJoinedData', () => {
      const validData = {
        subject_name: 'Chemistry',
        teacher_name: 'Dr. Smith',
        invite_code: 'CHEM123'
      }

      it('should validate correct data', () => {
        expect(isValidClassJoinedData(validData)).toBe(true)
      })

      it('should reject invalid data', () => {
        expect(isValidClassJoinedData(null)).toBe(false)
        expect(isValidClassJoinedData({ ...validData, teacher_name: undefined })).toBe(false)
      })
    })

    describe('isValidJoinFailedData', () => {
      const validData = {
        subject_name: 'History',
        invite_code: 'HIST456',
        error_message: 'Invalid code',
        failed_at: '2024-01-01T00:00:00Z'
      }

      it('should validate correct data with subject_name', () => {
        expect(isValidJoinFailedData(validData)).toBe(true)
      })

      it('should validate correct data without subject_name', () => {
        const { subject_name, ...dataWithoutSubject } = validData
        expect(isValidJoinFailedData(dataWithoutSubject)).toBe(true)
      })

      it('should reject invalid data', () => {
        expect(isValidJoinFailedData(null)).toBe(false)
        expect(isValidJoinFailedData({ ...validData, invite_code: undefined })).toBe(false)
        expect(isValidJoinFailedData({ ...validData, error_message: 123 })).toBe(false)
      })
    })
  })

  describe('isValidNotificationData', () => {
    it('should validate data based on notification type', () => {
      const studentData = {
        student_name: 'John',
        subject_name: 'Math',
        subject_code: 'MATH101',
        joined_at: '2024-01-01T00:00:00Z'
      }

      expect(isValidNotificationData(NotificationType.STUDENT_JOINED, studentData)).toBe(true)
      expect(isValidNotificationData(NotificationType.ATTENDANCE_MARKED, studentData)).toBe(false)
    })

    it('should allow undefined data', () => {
      expect(isValidNotificationData(NotificationType.STUDENT_JOINED, undefined)).toBe(true)
      expect(isValidNotificationData(NotificationType.STUDENT_JOINED, null)).toBe(true)
    })
  })

  describe('Array validators', () => {
    it('should validate notification arrays', () => {
      const validNotifications = [
        {
          id: '1',
          recipient_id: 'user-1',
          type: NotificationType.STUDENT_JOINED,
          title: 'Title 1',
          message: 'Message 1',
          is_read: false,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          recipient_id: 'user-2',
          type: NotificationType.CLASS_JOINED,
          title: 'Title 2',
          message: 'Message 2',
          is_read: true,
          created_at: '2024-01-01T01:00:00Z'
        }
      ]

      expect(isValidNotificationArray(validNotifications)).toBe(true)
      expect(isValidNotificationArray([])).toBe(true)
      expect(isValidNotificationArray('not_array')).toBe(false)
      expect(isValidNotificationArray([{ invalid: 'notification' }])).toBe(false)
    })

    it('should validate preference arrays', () => {
      const validPreferences = [
        {
          user_id: 'user-1',
          notification_type: NotificationType.STUDENT_JOINED,
          enabled: true
        },
        {
          user_id: 'user-1',
          notification_type: NotificationType.ATTENDANCE_MARKED,
          enabled: false
        }
      ]

      expect(isValidNotificationPreferenceArray(validPreferences)).toBe(true)
      expect(isValidNotificationPreferenceArray([])).toBe(true)
      expect(isValidNotificationPreferenceArray('not_array')).toBe(false)
    })
  })

  describe('Type guards', () => {
    const baseNotification: Notification = {
      id: 'test-id',
      recipient_id: 'user-123',
      type: NotificationType.STUDENT_JOINED,
      title: 'Test',
      message: 'Test message',
      is_read: false,
      created_at: '2024-01-01T00:00:00Z'
    }

    it('should identify notifications with StudentJoinedData', () => {
      const notification = {
        ...baseNotification,
        type: NotificationType.STUDENT_JOINED,
        data: {
          student_name: 'John',
          subject_name: 'Math',
          subject_code: 'MATH101',
          joined_at: '2024-01-01T00:00:00Z'
        }
      }

      expect(hasStudentJoinedData(notification)).toBe(true)
      expect(hasAttendanceMarkedData(notification)).toBe(false)
    })

    it('should identify notifications with AttendanceMarkedData', () => {
      const notification = {
        ...baseNotification,
        type: NotificationType.ATTENDANCE_MARKED,
        data: {
          subject_name: 'Physics',
          session_name: 'Lab 1',
          total_students: 25,
          present_count: 23,
          marked_at: '2024-01-01T00:00:00Z'
        }
      }

      expect(hasAttendanceMarkedData(notification)).toBe(true)
      expect(hasStudentJoinedData(notification)).toBe(false)
    })

    it('should handle notifications without data', () => {
      const notification = {
        ...baseNotification,
        type: NotificationType.STUDENT_JOINED
      }

      expect(hasStudentJoinedData(notification)).toBe(false)
    })
  })
})