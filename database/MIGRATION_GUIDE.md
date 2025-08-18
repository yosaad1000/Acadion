# Database Migration Guide: Attendance Sessions Support

## Overview

This migration adds support for multiple attendance sessions per day and user profile management tracking. It addresses the requirements for fixing attendance data persistence and adding user management features.

## Changes Made

### 1. Attendance Table Modifications

#### Removed Constraints
- Removed unique constraint on `(subject_id, student_id, date)` to allow multiple attendance sessions per day
- This enables teachers to mark attendance multiple times in a single day

#### Added Columns
- `session_id` (UUID): Unique identifier for each attendance session
- `session_timestamp` (TIMESTAMP): Precise timestamp when attendance was marked

#### Added Indexes
- `idx_attendance_session`: Composite index on `(subject_id, date, session_timestamp)` for efficient session queries
- `idx_attendance_session_id`: Index on `session_id` for session-specific lookups

### 2. Users Table Enhancements

#### Added Columns
- `password_changed_at` (TIMESTAMP): Tracks when user last changed their password

#### Enhanced Triggers
- Updated `update_users_updated_at` trigger to track profile updates
- Added `track_password_change_trigger` to automatically set `password_changed_at` when password changes

### 3. Backend Service Updates

#### LocalSupabase Service Enhancements
- `get_attendance_sessions()`: Retrieve attendance records grouped by sessions
- `update_user_profile()`: Update user profile information
- `change_user_password()`: Change user password with tracking
- `update_user_face_encoding()`: Update face registration data
- `update_subject_info()`: Update class/subject information
- `unenroll_student()`: Remove student enrollment
- `remove_student_from_subject()`: Teacher action to remove students

#### Attendance Marking Updates
- Modified `mark_attendance()` to include session tracking
- Automatic generation of `session_id` and `session_timestamp`
- Support for multiple attendance records per day

## Migration Steps

### 1. Run the Migration Script

Execute the migration script in your Supabase SQL Editor:

```sql
-- Run this file in Supabase SQL Editor
\i database/migration_attendance_sessions.sql
```

### 2. Verify Migration Success

Run the test script to verify all changes were applied correctly:

```sql
-- Run this file to test the migration
\i database/test_migration.sql
```

### 3. Update Application Code

The backend service (`LocalSupabase`) has been updated with new methods. No additional code changes are required for this task.

## Requirements Addressed

### Requirement 1.1: Multiple Attendance Sessions
- ✅ Removed unique constraint to allow multiple sessions per day
- ✅ Added session tracking with `session_id` and `session_timestamp`
- ✅ Updated attendance marking logic to support sessions

### Requirement 1.4: Session Tracking
- ✅ Added database columns for session identification
- ✅ Created indexes for efficient session queries
- ✅ Updated backend service methods

## Database Schema Changes Summary

### Before Migration
```sql
-- Attendance table had unique constraint
UNIQUE(subject_id, student_id, date)

-- Users table basic structure
users (
    user_id,
    email,
    name,
    user_type,
    password_hash,
    face_encoding_id,
    is_face_registered,
    created_at,
    updated_at
)
```

### After Migration
```sql
-- Attendance table allows multiple sessions
-- No unique constraint on date

-- Enhanced attendance table
attendance (
    id,
    subject_id,
    student_id,
    date,
    status,
    marked_by,
    confidence_score,
    method,
    created_at,
    session_id,           -- NEW
    session_timestamp     -- NEW
)

-- Enhanced users table
users (
    user_id,
    email,
    name,
    user_type,
    password_hash,
    face_encoding_id,
    is_face_registered,
    created_at,
    updated_at,
    password_changed_at   -- NEW
)
```

## Testing

### Manual Testing Steps

1. **Test Multiple Sessions**:
   ```sql
   -- Should succeed (multiple records for same day)
   INSERT INTO attendance (subject_id, student_id, date, status, session_id)
   VALUES 
     ('subject-1', 'student-1', '2024-01-15', 'present', uuid_generate_v4()),
     ('subject-1', 'student-1', '2024-01-15', 'present', uuid_generate_v4());
   ```

2. **Test Profile Updates**:
   ```sql
   -- Should update updated_at automatically
   UPDATE users SET name = 'New Name' WHERE user_id = 'test-user-id';
   
   -- Should update password_changed_at automatically
   UPDATE users SET password_hash = 'new-hash' WHERE user_id = 'test-user-id';
   ```

### Backend Testing

Use the updated `LocalSupabase` service methods:

```python
# Test multiple attendance sessions
await local_supabase.mark_attendance({
    "subject_id": "subject-1",
    "student_id": "student-1", 
    "date": "2024-01-15",
    "status": "present"
})

# Test profile updates
await local_supabase.update_user_profile("user-1", {
    "name": "Updated Name"
})

# Test password change
await local_supabase.change_user_password("user-1", "old-hash", "new-hash")
```

## Rollback Plan

If you need to rollback this migration:

```sql
-- Remove new columns
ALTER TABLE attendance DROP COLUMN IF EXISTS session_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS session_timestamp;
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;

-- Remove indexes
DROP INDEX IF EXISTS idx_attendance_session;
DROP INDEX IF EXISTS idx_attendance_session_id;

-- Remove triggers
DROP TRIGGER IF EXISTS track_password_change_trigger ON users;

-- Re-add unique constraint (if needed)
ALTER TABLE attendance ADD CONSTRAINT attendance_unique_daily 
UNIQUE (subject_id, student_id, date);
```

## Next Steps

After this migration is complete, you can proceed with:

1. **Task 2**: Extend LocalSupabase Service Methods (partially complete)
2. **Task 3**: Create Profile Management API Router
3. **Task 4**: Extend Subjects Router for Class Management
4. **Task 5**: Fix Attendance System Issues (partially complete)

## Support

If you encounter any issues with this migration:

1. Check the Supabase logs for detailed error messages
2. Verify your database permissions allow schema modifications
3. Ensure all referenced tables and columns exist
4. Run the test script to identify specific issues

## Files Created/Modified

- `database/migration_attendance_sessions.sql` - Main migration script
- `database/test_migration.sql` - Migration verification script
- `database/MIGRATION_GUIDE.md` - This documentation
- `backend/app/services/local_supabase.py` - Updated service methods