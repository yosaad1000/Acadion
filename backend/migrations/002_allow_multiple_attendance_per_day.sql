-- Migration to allow multiple attendance records per day
-- This removes the unique constraint and adds session tracking

-- Drop the existing unique constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_subject_id_date_key;

-- Add session_id column to track multiple sessions per day
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id VARCHAR(50);

-- Add session_name column for human-readable session names
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_name VARCHAR(100);

-- Add session_time column to track specific time of attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_time TIME;

-- Create a new unique constraint that includes session_id
-- This allows multiple attendance records per day but prevents duplicates within the same session
ALTER TABLE attendance ADD CONSTRAINT attendance_unique_per_session 
    UNIQUE(student_id, subject_id, date, session_id);

-- Create index for better performance on session queries
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(subject_id, date, session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_time ON attendance(date, session_time);

-- Update existing records to have a default session_id
UPDATE attendance 
SET 
    session_id = 'default',
    session_name = 'Default Session',
    session_time = '09:00:00'
WHERE session_id IS NULL;

-- Make session_id NOT NULL after updating existing records
ALTER TABLE attendance ALTER COLUMN session_id SET NOT NULL;

-- Add default value for future records
ALTER TABLE attendance ALTER COLUMN session_id SET DEFAULT 'default';
ALTER TABLE attendance ALTER COLUMN session_name SET DEFAULT 'Default Session';