# Design Document

## Overview

This design document outlines the technical approach for implementing attendance data persistence fixes, student count corrections, unenrollment functionality, user profile management, and class settings features in the Acadion platform. The solution builds upon the existing FastAPI backend with Supabase database and React TypeScript frontend architecture.

## Architecture

### System Components

The implementation will leverage the existing three-tier architecture:

1. **Frontend Layer**: React TypeScript components with Tailwind CSS
2. **API Layer**: FastAPI routers with authentication middleware  
3. **Data Layer**: Supabase PostgreSQL database with REST API

### Key Architectural Decisions

- **Database Schema Extensions**: Add new columns and modify existing tables to support multiple attendance sessions and profile management
- **API Endpoint Enhancements**: Extend existing routers and create new endpoints for unenrollment and profile management
- **Frontend Component Updates**: Modify existing pages and create new components for enhanced user management
- **State Management**: Utilize existing React context for authentication and local state for component-specific data

## Components and Interfaces

### Backend Components

#### 1. Database Schema Updates

**Attendance Table Modifications**:
- Remove unique constraint on (student_id, subject_id, date) to allow multiple sessions per day
- Add `session_timestamp` column for precise session tracking
- Add `session_id` for grouping related attendance records

**User Profile Management**:
- Extend `users` table with `updated_at` timestamp
- Add password change tracking fields
- Maintain existing face registration fields

#### 2. API Router Extensions

**Attendance Router (`/api/attendance`)**:
- Modify existing endpoints to handle multiple sessions
- Add session grouping logic for dashboard statistics
- Enhance face recognition endpoint to create unique sessions

**New Profile Router (`/api/profile`)**:
- GET /api/profile - Get current user profile
- PUT /api/profile - Update profile information  
- POST /api/profile/password - Change password
- POST /api/profile/face - Update face registration
- DELETE /api/profile/face - Remove face registration

**Subjects Router Extensions (`/api/subjects`)**:
- DELETE /api/subjects/{subject_id}/enrollment - Unenroll current user
- PUT /api/subjects/{subject_id} - Update class information (teachers only)
- DELETE /api/subjects/{subject_id}/students/{student_id} - Remove student (teachers only)

#### 3. Service Layer Enhancements

**LocalSupabase Service Extensions**:
- `unenroll_student(subject_id, student_id)` - Remove enrollment
- `update_user_profile(user_id, profile_data)` - Update user information
- `change_user_password(user_id, old_password, new_password)` - Password management
- `update_subject_info(subject_id, subject_data)` - Class information updates
- `get_attendance_sessions(subject_id)` - Group attendance by sessions

### Frontend Components

#### 1. Enhanced Existing Components

**StudentDashboard Updates**:
- Add "Unenroll" button to each class card
- Implement confirmation modal for unenrollment
- Update class list after successful unenrollment

**TeacherDashboard Updates**:
- Fix student count display using corrected API calls
- Add settings icon to class cards
- Maintain existing quick actions and stats

**ClassRoom Component Updates**:
- Add settings button in class header
- Implement class settings modal/page
- Show accurate student counts

#### 2. New Components

**ProfileSettings Component**:
- Personal information form (name, email)
- Password change form with current password verification
- Face registration management
- Profile update confirmation

**ClassSettings Component**:
- Class information editing form
- Enrolled students list with removal options
- Class management actions

**UnenrollConfirmation Component**:
- Confirmation dialog for unenrollment
- Warning about data loss
- Action buttons

#### 3. Component Integration

**Profile Page Enhancement**:
- Replace existing basic profile with comprehensive ProfileSettings
- Add navigation tabs for different settings sections
- Implement real-time updates and validation

**New Class Settings Page**:
- Accessible from class header settings button
- Teacher-only access with proper authorization
- Integrated with existing class navigation

## Data Models

### Database Schema Changes

#### Attendance Table Updates
```sql
-- Remove unique constraint to allow multiple sessions
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_subject_date_unique;

-- Add session tracking
ALTER TABLE attendance ADD COLUMN session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE attendance ADD COLUMN session_timestamp TIMESTAMP DEFAULT NOW();

-- Create index for efficient session queries
CREATE INDEX idx_attendance_session ON attendance(subject_id, date, session_timestamp);
```

#### User Profile Tracking
```sql
-- Add profile update tracking
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### API Data Models

#### Profile Update Models
```python
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileResponse(BaseModel):
    user_id: str
    name: str
    email: str
    user_type: str
    is_face_registered: bool
    updated_at: datetime
```

#### Class Management Models
```python
class ClassUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class EnrolledStudent(BaseModel):
    user_id: str
    name: str
    email: str
    is_face_registered: bool
    enrollment_date: datetime
```

### Frontend Type Definitions

```typescript
interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ClassSettingsData {
  name: string;
  description: string;
  enrolledStudents: EnrolledStudent[];
}

interface AttendanceSession {
  session_id: string;
  date: string;
  timestamp: string;
  students: AttendanceRecord[];
}
```

## Error Handling

### Backend Error Handling

#### Authentication Errors
- 401 Unauthorized for invalid tokens
- 403 Forbidden for insufficient permissions
- Proper error messages for profile access

#### Validation Errors
- 400 Bad Request for invalid profile data
- Password complexity validation
- Email format validation
- Duplicate email handling

#### Database Errors
- Handle constraint violations gracefully
- Rollback transactions on failure
- Proper error logging for debugging

### Frontend Error Handling

#### Form Validation
- Real-time validation for profile forms
- Password strength indicators
- Email format validation
- Required field validation

#### API Error Handling
- Display user-friendly error messages
- Handle network connectivity issues
- Retry mechanisms for failed requests
- Loading states during operations

#### User Experience
- Confirmation dialogs for destructive actions
- Success notifications for completed operations
- Graceful degradation for missing data
- Accessibility compliance for error states

## Testing Strategy

### Backend Testing

#### Unit Tests
- Test attendance session creation logic
- Validate profile update operations
- Test password change security
- Verify unenrollment functionality

#### Integration Tests
- Test complete attendance marking flow
- Validate profile management endpoints
- Test class settings operations
- Verify authentication and authorization

#### Database Tests
- Test schema migrations
- Validate data integrity constraints
- Test concurrent attendance marking
- Verify cascade delete operations

### Frontend Testing

#### Component Tests
- Test ProfileSettings form validation
- Test ClassSettings component behavior
- Test UnenrollConfirmation dialog
- Test error state handling

#### Integration Tests
- Test complete profile update flow
- Test unenrollment user journey
- Test class settings management
- Test attendance session display

#### End-to-End Tests
- Test complete user profile management
- Test teacher class management workflow
- Test student unenrollment process
- Test attendance marking and display

### Performance Testing

#### Database Performance
- Test attendance queries with large datasets
- Validate session grouping performance
- Test concurrent user profile updates
- Monitor database connection pooling

#### Frontend Performance
- Test component rendering with large student lists
- Validate form submission performance
- Test image upload for face registration
- Monitor bundle size impact

## Security Considerations

### Authentication and Authorization
- Verify user ownership for profile updates
- Ensure teachers can only manage their classes
- Validate student enrollment before unenrollment
- Implement proper session management

### Data Protection
- Hash passwords using secure algorithms
- Validate file uploads for face registration
- Sanitize user input in all forms
- Implement rate limiting for sensitive operations

### Privacy Compliance
- Allow users to delete their face data
- Provide data export capabilities
- Implement audit logging for profile changes
- Ensure GDPR compliance for user data

## Implementation Phases

### Phase 1: Database and Backend Core
1. Implement database schema changes
2. Update LocalSupabase service methods
3. Create profile management router
4. Extend subjects router for unenrollment

### Phase 2: Attendance System Fixes
1. Modify attendance marking logic
2. Update student count calculations
3. Implement session grouping
4. Fix dashboard statistics

### Phase 3: Frontend Components
1. Create ProfileSettings component
2. Implement ClassSettings component
3. Add unenrollment functionality
4. Update existing dashboards

### Phase 4: Integration and Testing
1. Integrate all components
2. Implement comprehensive testing
3. Performance optimization
4. Security audit and fixes

This design provides a comprehensive foundation for implementing all the requirements while maintaining system integrity and user experience quality.