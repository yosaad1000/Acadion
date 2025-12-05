# Design Document

## Overview

This design addresses comprehensive platform improvements including critical bugs, missing features, and user experience enhancements. The solution encompasses:

1. **Session Time Validation Fix**: Implement grace period and proper timezone handling
2. **Complete Student Dashboard**: Full session visibility with attendance tracking
3. **Full CRUD Operations**: Edit/delete functionality for all entities
4. **Google Integrations**: Complete Drive and Calendar integration
5. **Error Handling Overhaul**: Replace debug logging with user-friendly feedback
6. **Real-time Updates**: Live synchronization across user sessions
7. **Navigation Enhancement**: Consistent breadcrumbs and mobile optimization
8. **Search and Filtering**: Comprehensive search across all entities
9. **Notification System Fix**: Proper storage management and real notifications
10. **Bulk Operations**: Efficient management of large datasets

## Architecture

### Session Time Validation Enhancement

**Current Issue:**
- Frontend validation compares session datetime with current time without grace period
- Timezone inconsistencies between frontend (local) and backend (UTC)
- Validation fails for legitimate "current time" sessions

**Solution:**
```typescript
interface ValidationConfig {
  gracePeriodMinutes: number; // 5 minutes default
  timezoneHandling: 'utc' | 'local';
  allowCurrentTime: boolean;
}

// Enhanced validation with timezone awareness
function validateSessionDateTime(
  sessionDate: string, 
  sessionTime: string, 
  config: ValidationConfig
): ValidationResult {
  const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
  const now = new Date();
  const gracePeriod = config.gracePeriodMinutes * 60 * 1000;
  
  // Convert to UTC for comparison
  const sessionUTC = new Date(sessionDateTime.getTime() - sessionDateTime.getTimezoneOffset() * 60000);
  const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  
  if (sessionUTC < nowUTC) {
    const timeDiff = nowUTC.getTime() - sessionUTC.getTime();
    
    if (timeDiff <= gracePeriod) {
      return { isValid: true, warnings: ['Session time is very recent'] };
    } else {
      return { isValid: false, errors: ['Session time cannot be in the past'] };
    }
  }
  
  return { isValid: true };
}
```

### Student Dashboard Architecture

**Current State:**
- Shows only enrolled subjects, not individual sessions
- No attendance status visibility
- Missing real-time updates

**Target Architecture:**
```typescript
interface StudentDashboardData {
  upcomingSessions: StudentSession[];
  todaySessions: StudentSession[];
  recentSessions: StudentSession[];
  attendanceStats: AttendanceStats;
  notifications: Notification[];
}

interface StudentSession {
  session_id: string;
  name: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  session_date: string;
  attendance_status: 'present' | 'absent' | 'pending' | 'processing';
  google_meet_link?: string;
  google_calendar_link?: string;
  assignments: Assignment[];
}

// Real-time subscription service
class StudentDashboardService {
  private wsConnection: WebSocket;
  private fallbackInterval: NodeJS.Timeout;
  
  subscribeToUpdates(userId: string) {
    // WebSocket for real-time updates
    this.wsConnection = new WebSocket(`ws://api/student/${userId}/updates`);
    
    // Fallback polling every 2 minutes
    this.fallbackInterval = setInterval(() => {
      if (this.wsConnection.readyState !== WebSocket.OPEN) {
        this.fetchLatestData();
      }
    }, 120000);
  }
}
```

### CRUD Operations Design

**Edit/Delete UI Pattern:**
```typescript
interface ActionMenuProps {
  item: Session | Subject | Assignment;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canDuplicate: boolean;
  };
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onDuplicate?: (item: any) => void;
}

// Confirmation dialog for destructive actions
interface DeleteConfirmationData {
  itemType: 'session' | 'subject' | 'assignment';
  itemName: string;
  cascadeEffects: {
    sessions?: number;
    students?: number;
    assignments?: number;
  };
  warnings: string[];
}
```

**Backend CRUD Endpoints:**
```python
# Subject management
@router.put("/subjects/{subject_id}")
async def update_subject(subject_id: UUID, update: SubjectUpdate):
    """Update subject details with validation"""

@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: UUID, force: bool = False):
    """Delete subject with cascade validation"""

# Session management  
@router.put("/sessions/{session_id}")
async def update_session(session_id: UUID, update: SessionUpdate):
    """Update session with Google Calendar sync"""

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: UUID):
    """Delete session and cleanup related data"""
```

### Google Drive Integration

**Architecture:**
```typescript
interface GoogleDriveService {
  // Authentication
  authenticate(): Promise<void>;
  isAuthenticated(): boolean;
  
  // Folder management
  createAssignmentFolder(assignmentId: string, name: string): Promise<DriveFolder>;
  createSessionNotesFolder(sessionId: string, name: string): Promise<DriveFolder>;
  
  // File operations
  uploadFile(file: File, folderId: string): Promise<DriveFile>;
  shareFolder(folderId: string, emails: string[]): Promise<void>;
  
  // Integration with assignments
  linkAssignmentToDrive(assignmentId: string, folderId: string): Promise<void>;
}

// Assignment with Drive integration
interface AssignmentWithDrive extends Assignment {
  google_drive_folder_id?: string;
  google_drive_link?: string;
  drive_permissions: {
    students_can_view: boolean;
    students_can_edit: boolean;
    students_can_upload: boolean;
  };
}
```

### Google Calendar Integration

**Session Calendar Sync:**
```typescript
interface GoogleCalendarService {
  // Event management
  createSessionEvent(session: Session): Promise<CalendarEvent>;
  updateSessionEvent(eventId: string, session: Session): Promise<CalendarEvent>;
  deleteSessionEvent(eventId: string): Promise<void>;
  
  // Meeting integration
  generateMeetLink(eventId: string): Promise<string>;
  
  // Student calendar access
  shareEventWithStudents(eventId: string, studentEmails: string[]): Promise<void>;
}

// Session with calendar integration
interface SessionWithCalendar extends Session {
  google_calendar_event_id?: string;
  google_calendar_link?: string;
  google_meet_link?: string;
  calendar_sync_enabled: boolean;
}
```

### Error Handling System

**Replace Debug Logging:**
```typescript
// Current problematic pattern
console.log('🔍 DEBUG: Processing student:', student); // Remove all debug logs

// New user-friendly error system
interface UserFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actions?: FeedbackAction[];
  dismissible: boolean;
  duration?: number;
}

interface FeedbackAction {
  label: string;
  action: () => void;
  style: 'primary' | 'secondary' | 'danger';
}

class FeedbackService {
  showError(title: string, message: string, actions?: FeedbackAction[]) {
    // Show user-friendly error toast/modal
  }
  
  showSuccess(message: string) {
    // Show success confirmation
  }
  
  showLoading(message: string): LoadingHandle {
    // Show loading state with cancellation
  }
}
```

### Real-time Updates Architecture

**WebSocket Implementation:**
```typescript
interface RealtimeService {
  // Connection management
  connect(userId: string, userRole: string): void;
  disconnect(): void;
  
  // Event subscriptions
  subscribeToUserSessions(callback: (sessions: Session[]) => void): void;
  subscribeToSubjectUpdates(subjectId: string, callback: (update: any) => void): void;
  
  // Fallback mechanisms
  enablePollingFallback(interval: number): void;
  handleConnectionLoss(): void;
}

// Backend WebSocket handler
class SessionUpdateHandler:
    async def handle_session_created(self, session_data):
        # Notify all enrolled students
        enrolled_students = await get_enrolled_students(session_data.subject_id)
        for student in enrolled_students:
            await self.send_to_user(student.user_id, {
                'type': 'session_created',
                'data': session_data
            })
    
    async def handle_session_updated(self, session_data):
        # Notify all participants
        participants = await get_session_participants(session_data.session_id)
        for participant in participants:
            await self.send_to_user(participant.user_id, {
                'type': 'session_updated', 
                'data': session_data
            })
```

### Search and Filtering System

**Universal Search Architecture:**
```typescript
interface SearchService {
  // Global search across all entities
  globalSearch(query: string, filters: SearchFilters): Promise<SearchResults>;
  
  // Entity-specific search
  searchSessions(query: string, filters: SessionFilters): Promise<Session[]>;
  searchStudents(query: string, filters: StudentFilters): Promise<Student[]>;
  searchSubjects(query: string, filters: SubjectFilters): Promise<Subject[]>;
}

interface SearchFilters {
  dateRange?: { start: Date; end: Date };
  entityTypes?: ('session' | 'subject' | 'student' | 'assignment')[];
  userRole?: 'teacher' | 'student';
}

// Advanced filtering UI
interface FilterPanel {
  dateRangePicker: DateRangePicker;
  statusFilter: MultiSelect<AttendanceStatus>;
  subjectFilter: MultiSelect<Subject>;
  quickFilters: QuickFilterButton[];
}
```

### Notification System Fix

**Current Issues:**
- Dummy notifications persist in database
- Deletions don't sync with Supabase
- Inconsistent notification states

**Fixed Architecture:**
```typescript
interface NotificationService {
  // Real notification management
  createNotification(type: NotificationType, data: any, recipients: string[]): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  
  // Cleanup operations
  removeDummyNotifications(): Promise<void>;
  syncWithSupabase(): Promise<void>;
}

// Notification types based on real events
enum NotificationType {
  SESSION_CREATED = 'session_created',
  ASSIGNMENT_DUE = 'assignment_due',
  ATTENDANCE_TAKEN = 'attendance_taken',
  GRADE_POSTED = 'grade_posted',
  CLASS_ANNOUNCEMENT = 'class_announcement'
}

// Proper Supabase integration
class SupabaseNotificationService {
  async deleteNotification(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('notification_id', id);
      
    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
    
    // Also remove from real-time subscriptions
    this.realtimeService.notifyNotificationDeleted(id);
  }
}
```

### Bulk Operations Design

**Bulk Management Interface:**
```typescript
interface BulkOperationService {
  // Student management
  bulkEnrollStudents(subjectId: string, studentIds: string[]): Promise<BulkResult>;
  bulkRemoveStudents(subjectId: string, studentIds: string[]): Promise<BulkResult>;
  
  // Session management
  createRecurringSessions(template: SessionTemplate, schedule: RecurrenceRule): Promise<BulkResult>;
  bulkUpdateSessions(sessionIds: string[], updates: Partial<Session>): Promise<BulkResult>;
  
  // Attendance management
  bulkUpdateAttendance(sessionId: string, updates: AttendanceUpdate[]): Promise<BulkResult>;
}

interface BulkResult {
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors: BulkError[];
  warnings: string[];
}

// Progress tracking for bulk operations
interface BulkProgressTracker {
  onProgress: (completed: number, total: number) => void;
  onComplete: (result: BulkResult) => void;
  onError: (error: Error) => void;
  cancel: () => void;
}
```

## Data Models

### Enhanced Session Model

```typescript
interface EnhancedSession extends Session {
  // Google integrations
  google_calendar_event_id?: string;
  google_calendar_link?: string;
  google_meet_link?: string;
  
  // Drive integration
  google_drive_folder_id?: string;
  google_drive_link?: string;
  
  // Permissions
  can_edit: boolean;
  can_delete: boolean;
  can_duplicate: boolean;
  
  // Real-time status
  last_updated: string;
  updated_by: string;
}
```

### Student Dashboard Models

```typescript
interface StudentDashboardState {
  sessions: {
    upcoming: StudentSession[];
    today: StudentSession[];
    recent: StudentSession[];
    loading: boolean;
    error?: string;
  };
  
  attendance: {
    stats: AttendanceStats;
    recentActivity: AttendanceRecord[];
    loading: boolean;
  };
  
  notifications: {
    unread: Notification[];
    recent: Notification[];
    loading: boolean;
  };
}

interface AttendanceStats {
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  streakDays: number;
  missedSessions: number;
}
```

## Performance Considerations

### Real-time Updates Optimization
- WebSocket connection pooling
- Message batching for bulk updates
- Automatic reconnection with exponential backoff
- Fallback to polling when WebSocket fails

### Search Performance
- Elasticsearch integration for full-text search
- Indexed database queries for filters
- Client-side caching of recent searches
- Debounced search input (300ms delay)

### Bulk Operations Optimization
- Background job processing for large operations
- Progress streaming via WebSocket
- Chunked processing to avoid timeouts
- Rollback mechanisms for failed operations

### Mobile Performance
- Lazy loading of non-critical components
- Image optimization and caching
- Touch gesture optimization
- Reduced network requests through batching

## Security Considerations

### Google Integration Security
- OAuth 2.0 with proper scope limitations
- Token refresh handling
- Secure storage of credentials
- Permission validation before operations

### Real-time Security
- User authentication for WebSocket connections
- Message validation and sanitization
- Rate limiting for real-time events
- Proper authorization checks

### Bulk Operations Security
- Permission validation for each item in bulk
- Audit logging for bulk changes
- Rate limiting to prevent abuse
- Rollback capabilities for security incidents