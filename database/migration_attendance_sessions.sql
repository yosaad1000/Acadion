-- Migration: Support Multiple Attendance Sessions Per Day
-- This migration removes unique constraints and adds session tracking
-- Run this in your Supabase SQL Editor

-- STEP 1: Remove unique constraint to allow multiple sessions per day
-- First check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Drop the unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_subject_id_student_id_date_key' 
        AND table_name = 'attendance'
    ) THEN
        ALTER TABLE attendance DROP CONSTRAINT attendance_subject_id_student_id_date_key;
        RAISE NOTICE 'Dropped unique constraint: attendance_subject_id_student_id_date_key';
    END IF;
    
    -- Also check for other possible constraint names
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_student_id_subject_id_date_key' 
        AND table_name = 'attendance'
    ) THEN
        ALTER TABLE attendance DROP CONSTRAINT attendance_student_id_subject_id_date_key;
        RAISE NOTICE 'Dropped unique constraint: attendance_student_id_subject_id_date_key';
    END IF;
END $$;

-- STEP 2: Add session tracking columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS session_timestamp TIMESTAMP DEFAULT NOW();

-- STEP 3: Update existing records to have session_timestamp if null
UPDATE attendance 
SET session_timestamp = created_at 
WHERE session_timestamp IS NULL;

-- STEP 4: Add user profile update tracking columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Note: updated_at column already exists in the users table from the original schema

-- STEP 5: Create index for efficient session queries
CREATE INDEX IF NOT EXISTS idx_attendance_session 
ON attendance(subject_id, date, session_timestamp);

-- STEP 6: Create index for session_id queries
CREATE INDEX IF NOT EXISTS idx_attendance_session_id 
ON attendance(session_id);

-- STEP 7: Update the existing update_updated_at_column function to ensure it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- STEP 8: Ensure the trigger exists for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 9: Create a function to track password changes
CREATE OR REPLACE FUNCTION track_password_change()
RETURNS TRIGGER AS $
BEGIN
    -- Only update password_changed_at if password_hash actually changed
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        NEW.password_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

-- STEP 10: Create trigger for password change tracking
DROP TRIGGER IF EXISTS track_password_change_trigger ON users;
CREATE TRIGGER track_password_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION track_password_change();

-- STEP 11: Verify the changes
SELECT 'Migration completed successfully!' as status;

-- Show current attendance table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance' 
ORDER BY ordinal_position;

-- Show current users table structure (relevant columns)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('updated_at', 'password_changed_at')
ORDER BY ordinal_position;

-- Show indexes on attendance table
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'attendance'
ORDER BY indexname;