import { describe, it, expect } from 'vitest'
import { 
  NotificationType, 
  type Notification, 
  type NotificationPreference,
  type StudentJoinedData,
  type AttendanceMarkedData,
  type ClassJoinedData,
  type AttendanceFailedData,
  type JoinFailedData
} from '../../types'

describe('Notification Types', () => {
  describe('NotificationType enum', () => {
    it('should have all required notification types', () => {
      expect(NotificationType.STUDENT_JOINED).toBe('student_joined')
      expect(NotificationType.ATTENDANCE_MARKED).toBe('attendance_marked')
      expect(NotificationType.ATTENDANCE_FAILED).toBe('attendance_failed')
      expect(NotificationType.CLASS_JOINED).toBe('class_joined')
      expect(NotificationType.JOIN_FAILED).toBe('join_failed')
    })

    it('should have exactly 5 notification types', () => {
      const types = Object.values(NotificationType)
      expect(types).toHaveLength(5)
    })
  })

  describe('Notification interface', () => {
    it('should validate a complete notification object', () => {
      const notification: Notification = {
        id: 'test-id',
        recipient_id: 'user-123',
        sender_id: 'user-456',
        type: NotificationType.STUDENT_JOINED,
        title: 'Student Joined',
        message: 'A student has joined your class',
        data: { student_name: 'John Doe' },
        is_read: false,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(notification.id).toBe('test-id')
      expect(notification.recipient_id).toBe('user-123')
      expect(notification.sender_id).toBe('user-456')
      expect(notification.type).toBe(NotificationType.STUDENT_JOINED)
      expect(notification.title).toBe('Student Joined')
      expect(notification.message).toBe('A student has joined your class')
      expect(notification.data).toEqual({ student_name: 'John Doe' })
      expect(notification.is_read).toBe(false)
      expect(notification.created_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should validate a notification without optional fields', () => {
      const notification: Notification = {
        id: 'test-id',
        recipient_id: 'user-123',
        type: NotificationType.CLASS_JOINED,
        title: 'Class Joined',
        message: 'You have successfully joined a class',
        is_read: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(notification.sender_id).toBeUndefined()
      expect(notification.data).toBeUndefined()
      expect(notification.is_read).toBe(true)
    })
  })

  describe('NotificationPreference interface', () => {
    it('should validate a complete notification preference object', () => {
      const preference: NotificationPreference = {
        id: 'pref-123',
        user_id: 'user-123',
        notification_type: NotificationType.STUDENT_JOINED,
        enabled: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(preference.id).toBe('pref-123')
      expect(preference.user_id).toBe('user-123')
      expect(preference.notification_type).toBe(NotificationType.STUDENT_JOINED)
      expect(preference.enabled).toBe(true)
      expect(preference.created_at).toBe('2024-01-01T00:00:00Z')
    })

    it('should validate a notification preference without optional fields', () => {
      const preference: NotificationPreference = {
        user_id: 'user-123',
        notification_type: NotificationType.ATTENDANCE_MARKED,
        enabled: false
      }

      expect(preference.id).toBeUndefined()
      expect(preference.created_at).toBeUndefined()
      expect(preference.enabled).toBe(false)
    })
  })

  describe('Notification data structures', () => {
    it('should validate StudentJoinedData', () => {
      const data: StudentJoinedData = {
        student_name: 'John Doe',
        subject_name: 'Mathematics',
        subject_code: 'MATH101',
        joined_at: '2024-01-01T10:00:00Z'
      }

      expect(data.student_name).toBe('John Doe')
      expect(data.subject_name).toBe('Mathematics')
      expect(data.subject_code).toBe('MATH101')
      expect(data.joined_at).toBe('2024-01-01T10:00:00Z')
    })

    it('should validate AttendanceMarkedData', () => {
      const data: AttendanceMarkedData = {
        subject_name: 'Physics',
        session_name: 'Lab Session 1',
        total_students: 25,
        present_count: 23,
        marked_at: '2024-01-01T14:00:00Z'
      }

      expect(data.subject_name).toBe('Physics')
      expect(data.session_name).toBe('Lab Session 1')
      expect(data.total_students).toBe(25)
      expect(data.present_count).toBe(23)
      expect(data.marked_at).toBe('2024-01-01T14:00:00Z')
    })

    it('should validate ClassJoinedData', () => {
      const data: ClassJoinedData = {
        subject_name: 'Chemistry',
        teacher_name: 'Dr. Smith',
        invite_code: 'CHEM123'
      }

      expect(data.subject_name).toBe('Chemistry')
      expect(data.teacher_name).toBe('Dr. Smith')
      expect(data.invite_code).toBe('CHEM123')
    })

    it('should validate AttendanceFailedData', () => {
      const data: AttendanceFailedData = {
        subject_name: 'Biology',
        error_message: 'Face recognition failed',
        failed_at: '2024-01-01T09:00:00Z'
      }

      expect(data.subject_name).toBe('Biology')
      expect(data.error_message).toBe('Face recognition failed')
      expect(data.failed_at).toBe('2024-01-01T09:00:00Z')
    })

    it('should validate JoinFailedData', () => {
      const data: JoinFailedData = {
        subject_name: 'History',
        invite_code: 'HIST456',
        error_message: 'Invalid invite code',
        failed_at: '2024-01-01T11:00:00Z'
      }

      expect(data.subject_name).toBe('History')
      expect(data.invite_code).toBe('HIST456')
      expect(data.error_message).toBe('Invalid invite code')
      expect(data.failed_at).toBe('2024-01-01T11:00:00Z')
    })

    it('should validate JoinFailedData without optional subject_name', () => {
      const data: JoinFailedData = {
        invite_code: 'INVALID123',
        error_message: 'Code not found',
        failed_at: '2024-01-01T11:00:00Z'
      }

      expect(data.subject_name).toBeUndefined()
      expect(data.invite_code).toBe('INVALID123')
      expect(data.error_message).toBe('Code not found')
      expect(data.failed_at).toBe('2024-01-01T11:00:00Z')
    })
  })

  describe('Type compatibility', () => {
    it('should allow notification with StudentJoinedData', () => {
      const studentJoinedData: StudentJoinedData = {
        student_name: 'Alice Johnson',
        subject_name: 'Computer Science',
        subject_code: 'CS101',
        joined_at: '2024-01-01T12:00:00Z'
      }

      const notification: Notification = {
        id: 'notif-1',
        recipient_id: 'teacher-123',
        sender_id: 'student-456',
        type: NotificationType.STUDENT_JOINED,
        title: 'New Student Joined',
        message: 'Alice Johnson has joined Computer Science',
        data: studentJoinedData,
        is_read: false,
        created_at: '2024-01-01T12:00:00Z'
      }

      expect(notification.data).toEqual(studentJoinedData)
      expect(notification.type).toBe(NotificationType.STUDENT_JOINED)
    })

    it('should allow notification with AttendanceMarkedData', () => {
      const attendanceData: AttendanceMarkedData = {
        subject_name: 'English Literature',
        session_name: 'Morning Class',
        total_students: 30,
        present_count: 28,
        marked_at: '2024-01-01T08:00:00Z'
      }

      const notification: Notification = {
        id: 'notif-2',
        recipient_id: 'teacher-123',
        type: NotificationType.ATTENDANCE_MARKED,
        title: 'Attendance Marked',
        message: 'Attendance has been marked for English Literature',
        data: attendanceData,
        is_read: false,
        created_at: '2024-01-01T08:05:00Z'
      }

      expect(notification.data).toEqual(attendanceData)
      expect(notification.type).toBe(NotificationType.ATTENDANCE_MARKED)
    })
  })
})