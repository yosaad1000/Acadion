# Fix Multiple Sessions Per Day - Step by Step Guide

## Problem Identified
The cloud Supabase database still has the old unique constraint that prevents multiple attendance records per day for the same student and subject. The constraint `attendance_subject_id_student_id_date_key` needs to be replaced with a new one that includes `session_id`.

## Error Message
```
duplicate key value violates unique constraint "attendance_subject_id_student_id_date_key"
Key (subject_id, student_id, date)=(xxx, yyy, 2025-08-26) already exists.
```

## Solution Steps

### Step 1: Apply Database Migration
Go to your Supabase dashboard → SQL Editor and run this SQL:

```sql
-- Drop the old constraint that prevents multiple records per day
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_subject_id_student_id_date_key;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_subject_id_date_key;

-- Create the new constraint that allows multiple sessions per day
-- but prevents duplicates within the same session
ALTER TABLE attendance ADD CONSTRAINT attendance_unique_per_session 
    UNIQUE(student_id, subject_id, date, session_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(subject_id, date, session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_time ON attendance(date, session_time);

-- Update any records that have NULL session_id
UPDATE attendance 
SET 
    session_id = 'default',
    session_name = 'Default Session',
    session_time = '09:00:00'
WHERE session_id IS NULL;

-- Make session_id NOT NULL and set defaults
ALTER TABLE attendance ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN session_id SET DEFAULT 'default';
ALTER TABLE attendance ALTER COLUMN session_name SET DEFAULT 'Default Session';
```

### Step 2: Verify the Fix
After running the SQL, test by creating multiple attendance records:

1. Go to the Take Attendance page
2. Mark some students as present (this creates records with 'default' session)
3. Click "Manage Sessions" → "Create New Session"
4. Mark the same students as present again
5. Both sessions should be saved successfully

### Step 3: Check Results
- The attendance dashboard should show multiple sessions
- Each session should have its own statistics
- The session timeline should display multiple sessions

## Current Status

### ✅ What's Working
- Session columns exist in the database
- Frontend generates unique session IDs correctly
- Session management UI is implemented
- Backend API supports session parameters

### ❌ What's Broken
- Old database constraint prevents multiple records per day
- Migration wasn't fully applied to cloud database

### 🔧 What Needs to be Fixed
- Run the SQL migration in Supabase dashboard
- Drop old constraint and create new session-aware constraint

## Expected Behavior After Fix

### Before Fix
- Only one attendance record per student per day
- Error when trying to create second session
- Dashboard shows only "default" sessions

### After Fix
- Multiple attendance records per student per day (different sessions)
- Teachers can create morning, afternoon, evening sessions
- Dashboard shows session breakdown and timeline
- Each session has independent statistics

## Testing the Fix

Run this test after applying the migration:

```python
# Test creating multiple sessions for the same student/day
# Should work without constraint violations

# Morning session
POST /api/attendance/manual
{
  "student_id": "student-uuid",
  "subject_id": "subject-uuid", 
  "date": "2025-08-26",
  "status": "present",
  "session_id": "morning_session",
  "session_name": "Morning Session",
  "session_time": "09:00"
}

# Afternoon session (same student, same day)
POST /api/attendance/manual
{
  "student_id": "student-uuid",
  "subject_id": "subject-uuid",
  "date": "2025-08-26", 
  "status": "present",
  "session_id": "afternoon_session",
  "session_name": "Afternoon Session",
  "session_time": "14:00"
}
```

Both requests should succeed (201 status code).

## Files Already Updated
- ✅ `backend/app/models/attendance.py` - Session fields added
- ✅ `backend/app/routers/attendance.py` - Session endpoints added
- ✅ `backend/app/services/local_supabase.py` - Session methods added
- ✅ `frontend/src/pages/TakeAttendance.tsx` - Session management UI
- ✅ `frontend/src/pages/AttendanceDashboard.tsx` - Session analytics

## Only Missing
- ❌ Database constraint fix (needs manual SQL execution in Supabase dashboard)

Once the SQL is run in the Supabase dashboard, the multiple sessions feature will work completely!