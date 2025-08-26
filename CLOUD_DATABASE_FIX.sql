-- SQL to run in Supabase SQL Editor to fix the constraint issue
-- This will allow multiple attendance sessions per day

-- Step 1: Drop the old constraint that prevents multiple records per day
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_subject_id_student_id_date_key;

-- Step 2: Drop any other similar constraints
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_subject_id_date_key;

-- Step 3: Create the new constraint that allows multiple sessions per day
-- but prevents duplicates within the same session
ALTER TABLE attendance ADD CONSTRAINT attendance_unique_per_session 
    UNIQUE(student_id, subject_id, date, session_id);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(subject_id, date, session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_time ON attendance(date, session_time);

-- Step 5: Update any records that have NULL session_id
UPDATE attendance 
SET 
    session_id = 'default',
    session_name = 'Default Session',
    session_time = '09:00:00'
WHERE session_id IS NULL;

-- Step 6: Make session_id NOT NULL and set defaults
ALTER TABLE attendance ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN session_id SET DEFAULT 'default';
ALTER TABLE attendance ALTER COLUMN session_name SET DEFAULT 'Default Session';