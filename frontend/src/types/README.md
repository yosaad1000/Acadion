# Notification Types and Interfaces

This document describes the TypeScript types and interfaces for the notification system in the Acadion platform.

## Overview

The notification system provides real-time notifications for both teachers and students about important events such as class joining, attendance marking, and other key activities.

## Core Types

### NotificationType Enum

Defines all available notification types in the system:

```typescript
enum NotificationType {
  STUDENT_JOINED = 'student_joined',
  ATTENDANCE_MARKED = 'attendance_marked', 
  ATTENDANCE_FAILED = 'attendance_failed',
  CLASS_JOINED = 'class_joined',
  JOIN_FAILED = 'join_failed'
}
```

### Notification Interface

The main notification object structure:

```typescript
interface Notification {
  id: string;                    // Unique notification identifier
  recipient_id: string;          // User ID who receives the notification
  sender_id?: string;            // Optional: User ID who triggered the notification
  type: NotificationType;        // Type of notification
  title: string;                 // Notification title
  message: string;               // Notification message
  data?: Record<string, any>;    // Optional: Type-specific data
  is_read: boolean;              // Read status
  created_at: string;            // ISO timestamp when created
}
```

### NotificationPreference Interface

User preferences for notification types:

```typescript
interface NotificationPreference {
  id?: string;                   // Optional: Preference ID
  user_id: string;               // User ID
  notification_type: NotificationType; // Type of notification
  enabled: boolean;              // Whether this type is enabled
  created_at?: string;           // Optional: ISO timestamp when created
}
```

## Notification Data Structures

Each notification type has a specific data structure for the `data` field:

### StudentJoinedData

Used when a student joins a class:

```typescript
interface StudentJoinedData {
  student_name: string;    // Name of the student who joined
  subject_name: string;    // Name of the subject/class
  subject_code: string;    // Subject code (e.g., "MATH101")
  joined_at: string;       // ISO timestamp when student joined
}
```

**Example:**
```typescript
{
  type: NotificationType.STUDENT_JOINED,
  data: {
    student_name: "John Doe",
    subject_name: "Advanced Mathematics",
    subject_code: "MATH301",
    joined_at: "2024-01-15T10:30:00Z"
  }
}
```

### AttendanceMarkedData

Used when attendance is successfully marked:

```typescript
interface AttendanceMarkedData {
  subject_name: string;    // Name of the subject
  session_name: string;    // Name of the session (e.g., "Morning Lecture")
  total_students: number;  // Total number of enrolled students
  present_count: number;   // Number of students marked present
  marked_at: string;       // ISO timestamp when attendance was marked
}
```

**Example:**
```typescript
{
  type: NotificationType.ATTENDANCE_MARKED,
  data: {
    subject_name: "Physics Lab",
    session_name: "Lab Session 3",
    total_students: 25,
    present_count: 23,
    marked_at: "2024-01-15T14:00:00Z"
  }
}
```

### ClassJoinedData

Used when a student successfully joins a class:

```typescript
interface ClassJoinedData {
  subject_name: string;    // Name of the subject joined
  teacher_name: string;    // Name of the teacher
  invite_code: string;     // Invite code used to join
}
```

**Example:**
```typescript
{
  type: NotificationType.CLASS_JOINED,
  data: {
    subject_name: "Computer Science Fundamentals",
    teacher_name: "Dr. Sarah Wilson",
    invite_code: "CS101ABC"
  }
}
```

### AttendanceFailedData

Used when attendance marking fails:

```typescript
interface AttendanceFailedData {
  subject_name: string;    // Name of the subject
  error_message: string;   // Description of the error
  failed_at: string;       // ISO timestamp when failure occurred
}
```

**Example:**
```typescript
{
  type: NotificationType.ATTENDANCE_FAILED,
  data: {
    subject_name: "Biology Lab",
    error_message: "Face recognition failed - insufficient lighting",
    failed_at: "2024-01-15T09:15:00Z"
  }
}
```

### JoinFailedData

Used when a student fails to join a class:

```typescript
interface JoinFailedData {
  subject_name?: string;   // Optional: Name of the subject (if known)
  invite_code: string;     // Invite code that was attempted
  error_message: string;   // Description of the error
  failed_at: string;       // ISO timestamp when failure occurred
}
```

**Example:**
```typescript
{
  type: NotificationType.JOIN_FAILED,
  data: {
    subject_name: "Chemistry Lab", // Optional
    invite_code: "INVALID123",
    error_message: "Invite code has expired",
    failed_at: "2024-01-15T11:45:00Z"
  }
}
```

## API Service Functions

The notification system provides the following API functions:

### Core Notification Functions

```typescript
// Get user notifications (optionally limited)
api.getNotifications(limit?: number): Promise<Response>

// Mark a specific notification as read
api.markNotificationRead(notificationId: string): Promise<Response>

// Mark all notifications as read
api.markAllNotificationsRead(): Promise<Response>

// Get count of unread notifications
api.getUnreadCount(): Promise<Response>
```

### Preference Management Functions

```typescript
// Get user's notification preferences
api.getNotificationPreferences(): Promise<Response>

// Update user's notification preferences
api.updateNotificationPreferences(preferences: NotificationPreference[]): Promise<Response>
```

## Validation Utilities

The system includes comprehensive validation utilities in `utils/notificationValidation.ts`:

### Type Guards

```typescript
// Check if value is valid NotificationType
isValidNotificationType(value: any): value is NotificationType

// Validate complete notification object
isValidNotification(obj: any): obj is Notification

// Validate notification preference object
isValidNotificationPreference(obj: any): obj is NotificationPreference
```

### Data Structure Validators

```typescript
// Validate specific data structures
isValidStudentJoinedData(obj: any): obj is StudentJoinedData
isValidAttendanceMarkedData(obj: any): obj is AttendanceMarkedData
isValidClassJoinedData(obj: any): obj is ClassJoinedData
isValidAttendanceFailedData(obj: any): obj is AttendanceFailedData
isValidJoinFailedData(obj: any): obj is JoinFailedData

// Validate data based on notification type
isValidNotificationData(type: NotificationType, data: any): boolean
```

### Array Validators

```typescript
// Validate arrays of notifications and preferences
isValidNotificationArray(arr: any): arr is Notification[]
isValidNotificationPreferenceArray(arr: any): arr is NotificationPreference[]
```

### Specific Type Guards

```typescript
// Check if notification has specific data type
hasStudentJoinedData(notification: Notification): notification is Notification & { data: StudentJoinedData }
hasAttendanceMarkedData(notification: Notification): notification is Notification & { data: AttendanceMarkedData }
hasClassJoinedData(notification: Notification): notification is Notification & { data: ClassJoinedData }
hasAttendanceFailedData(notification: Notification): notification is Notification & { data: AttendanceFailedData }
hasJoinFailedData(notification: Notification): notification is Notification & { data: JoinFailedData }
```

## Usage Examples

### Creating a Notification

```typescript
const notification: Notification = {
  id: 'notif-123',
  recipient_id: 'teacher-456',
  sender_id: 'student-789',
  type: NotificationType.STUDENT_JOINED,
  title: 'New Student Joined',
  message: 'Alice Johnson has joined your Mathematics class',
  data: {
    student_name: 'Alice Johnson',
    subject_name: 'Advanced Mathematics',
    subject_code: 'MATH301',
    joined_at: '2024-01-15T10:30:00Z'
  },
  is_read: false,
  created_at: '2024-01-15T10:30:05Z'
}
```

### Setting User Preferences

```typescript
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
```

### Using Type Guards

```typescript
if (hasStudentJoinedData(notification)) {
  // TypeScript now knows notification.data is StudentJoinedData
  console.log(`Student ${notification.data.student_name} joined ${notification.data.subject_name}`)
}
```

## Testing

The notification types include comprehensive test coverage:

- **Type validation tests**: Verify all interfaces and enums work correctly
- **API function tests**: Mock API calls and verify correct endpoints and parameters
- **Validation utility tests**: Test all validation functions with valid and invalid data
- **Type guard tests**: Verify type guards correctly identify data structures

Run tests with:
```bash
npm run test
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 5.1**: Notification display and management interfaces
- **Requirement 7.1**: Notification preference management types

The types support all notification scenarios defined in the requirements document and provide type safety for the entire notification system.