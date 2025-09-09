import { 
  NotificationType, 
  type Notification, 
  type NotificationPreference,
  type StudentJoinedData,
  type AttendanceMarkedData,
  type ClassJoinedData,
  type AttendanceFailedData,
  type JoinFailedData
} from '../types'

/**
 * Validates if a value is a valid NotificationType
 */
export const isValidNotificationType = (value: any): value is NotificationType => {
  return Object.values(NotificationType).includes(value)
}

/**
 * Validates if an object matches the Notification interface
 */
export const isValidNotification = (obj: any): obj is Notification => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.recipient_id === 'string' &&
    (obj.sender_id === undefined || typeof obj.sender_id === 'string') &&
    isValidNotificationType(obj.type) &&
    typeof obj.title === 'string' &&
    typeof obj.message === 'string' &&
    (obj.data === undefined || typeof obj.data === 'object') &&
    typeof obj.is_read === 'boolean' &&
    typeof obj.created_at === 'string'
  )
}

/**
 * Validates if an object matches the NotificationPreference interface
 */
export const isValidNotificationPreference = (obj: any): obj is NotificationPreference => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    (obj.id === undefined || typeof obj.id === 'string') &&
    typeof obj.user_id === 'string' &&
    isValidNotificationType(obj.notification_type) &&
    typeof obj.enabled === 'boolean' &&
    (obj.created_at === undefined || typeof obj.created_at === 'string')
  )
}

/**
 * Validates StudentJoinedData structure
 */
export const isValidStudentJoinedData = (obj: any): obj is StudentJoinedData => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    typeof obj.student_name === 'string' &&
    typeof obj.subject_name === 'string' &&
    typeof obj.subject_code === 'string' &&
    typeof obj.joined_at === 'string'
  )
}

/**
 * Validates AttendanceMarkedData structure
 */
export const isValidAttendanceMarkedData = (obj: any): obj is AttendanceMarkedData => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    typeof obj.subject_name === 'string' &&
    typeof obj.session_name === 'string' &&
    typeof obj.total_students === 'number' &&
    typeof obj.present_count === 'number' &&
    typeof obj.marked_at === 'string'
  )
}

/**
 * Validates ClassJoinedData structure
 */
export const isValidClassJoinedData = (obj: any): obj is ClassJoinedData => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    typeof obj.subject_name === 'string' &&
    typeof obj.teacher_name === 'string' &&
    typeof obj.invite_code === 'string'
  )
}

/**
 * Validates AttendanceFailedData structure
 */
export const isValidAttendanceFailedData = (obj: any): obj is AttendanceFailedData => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    typeof obj.subject_name === 'string' &&
    typeof obj.error_message === 'string' &&
    typeof obj.failed_at === 'string'
  )
}

/**
 * Validates JoinFailedData structure
 */
export const isValidJoinFailedData = (obj: any): obj is JoinFailedData => {
  if (!obj || typeof obj !== 'object') return false
  
  return (
    (obj.subject_name === undefined || typeof obj.subject_name === 'string') &&
    typeof obj.invite_code === 'string' &&
    typeof obj.error_message === 'string' &&
    typeof obj.failed_at === 'string'
  )
}

/**
 * Validates notification data based on notification type
 */
export const isValidNotificationData = (type: NotificationType, data: any): boolean => {
  if (!data) return true // data is optional
  
  switch (type) {
    case NotificationType.STUDENT_JOINED:
      return isValidStudentJoinedData(data)
    case NotificationType.ATTENDANCE_MARKED:
      return isValidAttendanceMarkedData(data)
    case NotificationType.CLASS_JOINED:
      return isValidClassJoinedData(data)
    case NotificationType.ATTENDANCE_FAILED:
      return isValidAttendanceFailedData(data)
    case NotificationType.JOIN_FAILED:
      return isValidJoinFailedData(data)
    default:
      return false
  }
}

/**
 * Validates an array of notifications
 */
export const isValidNotificationArray = (arr: any): arr is Notification[] => {
  return Array.isArray(arr) && arr.every(isValidNotification)
}

/**
 * Validates an array of notification preferences
 */
export const isValidNotificationPreferenceArray = (arr: any): arr is NotificationPreference[] => {
  return Array.isArray(arr) && arr.every(isValidNotificationPreference)
}

/**
 * Type guard for checking if a notification has specific data type
 */
export const hasStudentJoinedData = (notification: Notification): notification is Notification & { data: StudentJoinedData } => {
  return notification.type === NotificationType.STUDENT_JOINED && isValidStudentJoinedData(notification.data)
}

export const hasAttendanceMarkedData = (notification: Notification): notification is Notification & { data: AttendanceMarkedData } => {
  return notification.type === NotificationType.ATTENDANCE_MARKED && isValidAttendanceMarkedData(notification.data)
}

export const hasClassJoinedData = (notification: Notification): notification is Notification & { data: ClassJoinedData } => {
  return notification.type === NotificationType.CLASS_JOINED && isValidClassJoinedData(notification.data)
}

export const hasAttendanceFailedData = (notification: Notification): notification is Notification & { data: AttendanceFailedData } => {
  return notification.type === NotificationType.ATTENDANCE_FAILED && isValidAttendanceFailedData(notification.data)
}

export const hasJoinFailedData = (notification: Notification): notification is Notification & { data: JoinFailedData } => {
  return notification.type === NotificationType.JOIN_FAILED && isValidJoinFailedData(notification.data)
}