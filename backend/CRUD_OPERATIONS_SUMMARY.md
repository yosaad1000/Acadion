# Backend CRUD Operations Summary

## Complete API Endpoints by Category

### 🔐 Authentication & Authorization

#### `/api/auth` - Authentication
- **POST** `/register` - Register new user
- **POST** `/login` - User login
- **GET** `/me` - Get current user info
- **POST** `/logout` - User logout
- **GET** `/google/url` - Get Google OAuth URL
- **POST** `/google/callback` - Handle Google OAuth callback
- **POST** `/register-face` - Register user face for recognition

#### `/api/supabase-auth` - Supabase Authentication
- **GET** `/me` - Get current user info (Supabase auth)

### 👥 User Management

#### `/api/students` - Student Management
- **GET** `/` - Get all students
- **POST** `/` - Create new student
- **GET** `/{student_id}` - Get specific student
- **DELETE** `/{student_id}` - Delete student
- **POST** `/{student_id}/upload-photo` - Upload student photo
- **POST** `/recognize` - Recognize student from photo
- **GET** `/{student_id}/sessions` - Get student sessions with attendance

### 📚 Academic Management

#### `/api/subjects` - Subject Management
- **POST** `/` - Create new subject
- **GET** `/` - Get user's subjects (teacher's created or student's enrolled)
- **GET** `/{subject_id}` - Get specific subject details
- **PUT** `/{subject_id}` - Update subject
- **DELETE** `/{subject_id}` - Delete subject
- **POST** `/join` - Join subject with invite code
- **GET** `/{subject_id}/students` - Get students enrolled in subject

#### `/api/sessions` - Session Management
- **POST** `/` - Create new session
- **GET** `/` - Get sessions (with subject_id filter)
- **GET** `/subject/{subject_id}` - Get sessions by subject ID
- **GET** `/{session_id}` - Get specific session
- **PUT** `/{session_id}` - Update session
- **DELETE** `/{session_id}` - Delete session
- **POST** `/{session_id}/attendance` - Mark attendance taken for session

##### Session Assignments (Nested under sessions)
- **POST** `/{session_id}/assignments` - Create assignment for session
- **GET** `/{session_id}/assignments` - Get session assignments
- **GET** `/{session_id}/assignments/{assignment_id}` - Get specific assignment
- **PUT** `/{session_id}/assignments/{assignment_id}` - Update assignment
- **DELETE** `/{session_id}/assignments/{assignment_id}` - Delete assignment

#### `/api/assignments` - Assignment Management
- **GET** `/my-assignments` - Get user's assignments (with optional subject filter)
- **GET** `/{assignment_id}` - Get specific assignment
- **GET** `/{assignment_id}/submissions` - Get assignment submissions
- **GET** `/{assignment_id}/my-submission` - Get user's submission
- **PUT** `/{assignment_id}/my-submission` - Update user's submission

### 📊 Attendance Management

#### `/api/attendance` - Attendance Tracking
- **POST** `/mark-face` - Mark attendance using face recognition
- **GET** `/{subject_id}` - Get attendance records for subject
- **GET** `/{subject_id}/dashboard` - Get attendance dashboard data
- **POST** `/save-batch` - Save batch attendance records
- **POST** `/manual` - Mark manual attendance
- **GET** `/{subject_id}/sessions` - Get attendance sessions
- **GET** `/{subject_id}/sessions/{session_id}` - Get session attendance

#### `/api/async-attendance` - Asynchronous Attendance Processing
- **POST** `/submit` - Submit attendance image for async processing
- **GET** `/job/{job_id}` - Get job status
- **GET** `/jobs` - Get user's jobs
- **DELETE** `/job/{job_id}` - Cancel job
- **POST** `/process-sync` - Process attendance synchronously
- **GET** `/stats` - Get service statistics
- **GET** `/health` - Health check

### 🔍 Face Recognition

#### `/api/face-recognition` - Face Recognition Management
- **GET** `/service/status` - Get face recognition service status
- **POST** `/register` - Register student face
- **DELETE** `/face/{user_id}` - Delete student face data
- **PUT** `/face/{user_id}/subjects` - Update face recognition subjects
- **GET** `/metrics` - Get face recognition metrics (admin only)
- **POST** `/test-connection` - Test face recognition service connection

### 🔔 Notifications

#### `/api/notifications` - Notification Management
- **GET** `/` - Get user notifications (with pagination)
- **PATCH** `/{notification_id}/read` - Mark notification as read
- **PATCH** `/mark-all-read` - Mark all notifications as read
- **GET** `/unread-count` - Get unread notification count
- **GET** `/stats` - Get notification statistics
- **GET** `/preferences` - Get notification preferences
- **PUT** `/preferences` - Update notification preferences
- **DELETE** `/clear-all` - Clear all notifications
- **DELETE** `/{notification_id}` - Delete specific notification

### 🔗 Google Integration

#### `/api/google` - Google Workspace Integration
- **GET** `/auth-url` - Get Google OAuth authorization URL
- **POST** `/authenticate` - Authenticate with Google
- **GET** `/integration` - Get user's Google integration
- **DELETE** `/integration` - Revoke Google integration
- **POST** `/refresh-token` - Refresh Google access token
- **GET** `/calendar/primary` - Get primary Google Calendar
- **POST** `/calendar/events` - Create Google Calendar event
- **PUT** `/calendar/events/{event_id}` - Update Google Calendar event
- **DELETE** `/calendar/events/{event_id}` - Delete Google Calendar event

### 🧪 Testing & Debugging

#### `/api/test` - Test Endpoints
- **GET** `/ping` - Simple ping test
- **POST** `/echo` - Echo test for POST requests

### ⚙️ System Management

#### Root Level Endpoints
- **GET** `/` - API root information
- **GET** `/api/health` - System health check

#### Configuration Management
- **GET** `/api/config/info` - Get configuration info
- **GET** `/api/config/status` - Get configuration status
- **GET** `/api/config/health` - Get configuration health
- **GET** `/api/config/summary` - Get secure configuration summary
- **POST** `/api/config/refresh` - Refresh configuration
- **POST** `/api/config/validate` - Validate configuration

#### Performance Monitoring
- **GET** `/api/cache/health` - Get cache health status
- **GET** `/api/cache/stats` - Get cache statistics
- **GET** `/api/connections/stats` - Get connection pool statistics

## CRUD Operations Summary by Entity

### 📊 Complete CRUD Entities

#### **Subjects**
- ✅ **Create**: POST `/api/subjects`
- ✅ **Read**: GET `/api/subjects`, GET `/api/subjects/{id}`
- ✅ **Update**: PUT `/api/subjects/{id}`
- ✅ **Delete**: DELETE `/api/subjects/{id}`

#### **Sessions**
- ✅ **Create**: POST `/api/sessions`
- ✅ **Read**: GET `/api/sessions`, GET `/api/sessions/{id}`
- ✅ **Update**: PUT `/api/sessions/{id}`
- ✅ **Delete**: DELETE `/api/sessions/{id}`

#### **Assignments** (within sessions)
- ✅ **Create**: POST `/api/sessions/{session_id}/assignments`
- ✅ **Read**: GET `/api/sessions/{session_id}/assignments/{id}`
- ✅ **Update**: PUT `/api/sessions/{session_id}/assignments/{id}`
- ✅ **Delete**: DELETE `/api/sessions/{session_id}/assignments/{id}`

#### **Notifications**
- ✅ **Create**: Automatic via system events
- ✅ **Read**: GET `/api/notifications`
- ✅ **Update**: PATCH `/api/notifications/{id}/read`
- ✅ **Delete**: DELETE `/api/notifications/{id}`

#### **Google Calendar Events**
- ✅ **Create**: POST `/api/google/calendar/events`
- ✅ **Read**: GET `/api/google/calendar/primary`
- ✅ **Update**: PUT `/api/google/calendar/events/{id}`
- ✅ **Delete**: DELETE `/api/google/calendar/events/{id}`

### 📊 Partial CRUD Entities

#### **Students**
- ✅ **Create**: POST `/api/students`
- ✅ **Read**: GET `/api/students`, GET `/api/students/{id}`
- ❌ **Update**: Not implemented
- ✅ **Delete**: DELETE `/api/students/{id}`

#### **Users** (Authentication)
- ✅ **Create**: POST `/api/auth/register`
- ✅ **Read**: GET `/api/auth/me`
- ❌ **Update**: Not implemented (except face registration)
- ❌ **Delete**: Not implemented

#### **Face Recognition Data**
- ✅ **Create**: POST `/api/face-recognition/register`
- ✅ **Read**: GET `/api/face-recognition/service/status`
- ✅ **Update**: PUT `/api/face-recognition/face/{user_id}/subjects`
- ✅ **Delete**: DELETE `/api/face-recognition/face/{user_id}`

### 📊 Read-Only or Specialized Operations

#### **Attendance Records**
- ✅ **Create**: POST `/api/attendance/mark-face`, POST `/api/attendance/manual`
- ✅ **Read**: GET `/api/attendance/{subject_id}`
- ❌ **Update**: Not typically updated (audit trail)
- ❌ **Delete**: Not implemented (audit trail)

#### **Assignment Submissions**
- ❌ **Create**: Not directly exposed (created via update)
- ✅ **Read**: GET `/api/assignments/{id}/my-submission`
- ✅ **Update**: PUT `/api/assignments/{id}/my-submission`
- ❌ **Delete**: Not implemented

## Key Features

### 🔒 Security Features
- JWT-based authentication
- Role-based access control (student, teacher, admin)
- Supabase integration for user management
- Google OAuth integration

### 🤖 AI/ML Features
- Face recognition for attendance
- Asynchronous image processing
- Face encoding storage and matching

### 🔄 Integration Features
- Google Workspace integration (Calendar, Drive)
- Real-time notifications
- Batch operations for attendance

### 📈 Performance Features
- Caching system with Redis
- Connection pooling
- Asynchronous processing
- Background job management

### 🛠️ Monitoring & Debugging
- Health checks for all services
- Performance metrics
- Configuration management
- Comprehensive logging

## Total Endpoint Count: **80+ endpoints** across 12 main categories

The backend provides a comprehensive API covering all aspects of student management, from authentication and user management to advanced features like AI-powered attendance tracking and Google Workspace integration.