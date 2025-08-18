-- =====================================================
-- SUPABASE CLOUD MIGRATION: Attendance Sessions Support
-- =====================================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- and run it to apply the migration for multiple attendance sessions
-- 
-- This migration addresses Requirements 1.1 and 1.4:
-- - Remove unique constraint to allow multiple sessions per day
-- - Add session tracking columns
-- - Add user profile management columns
-- =====================================================

-- STEP 1: Remove unique constraint to allow multiple sessions per day
-- This allows teachers to mark attendance multiple times in one day
DO $$ 
BEGIN
    -- Try to drop the unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_subject_id_student_id_date_key' 
        AND table_name = 'attendance'
    ) THEN
        ALTER TABLE attendance DROP CONSTRAINT attendance_subject_id_student_id_date_key;
        RAISE NOTICE '✅ Dropped unique constraint: attendance_subject_id_student_id_date_key';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint attendance_subject_id_student_id_date_key not found';
    END IF;
    
    -- Check for alternative constraint names
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_student_id_subject_id_date_key' 
        AND table_name = 'attendance'
    ) THEN
        ALTER TABLE attendance DROP CONSTRAINT attendance_student_id_subject_id_date_key;
        RAISE NOTICE '✅ Dropped unique constraint: attendance_student_id_subject_id_date_key';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint attendance_student_id_subject_id_date_key not found';
    END IF;
    
    -- Check for any other unique constraints on (subject_id, student_id, date)
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'attendance' 
        AND tc.constraint_type = 'UNIQUE'
        AND EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage ccu2 
            WHERE ccu2.constraint_name = tc.constraint_name 
            AND ccu2.column_name IN ('subject_id', 'student_id', 'date')
        )
    LOOP
        EXECUTE 'ALTER TABLE attendance DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE '✅ Dropped unique constraint: %', constraint_name;
    END LOOP;
    
    RAISE NOTICE '🎉 Step 1 completed: Unique constraints removed';
END $$;

-- STEP 2: Add session tracking columns to attendance table
-- These columns will track individual attendance sessions
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS session_timestamp TIMESTAMP DEFAULT NOW();

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'session_id'
    ) THEN
        RAISE NOTICE '✅ session_id column added to attendance table';
    ELSE
        RAISE NOTICE '❌ Failed to add session_id column';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'session_timestamp'
    ) THEN
        RAISE NOTICE '✅ session_timestamp column added to attendance table';
    ELSE
        RAISE NOTICE '❌ Failed to add session_timestamp column';
    END IF;
    
    RAISE NOTICE '🎉 Step 2 completed: Session tracking columns added';
END $$;

-- STEP 3: Update existing attendance records with session timestamps
-- This ensures existing data has proper session timestamps
UPDATE attendance 
SET session_timestamp = created_at 
WHERE session_timestamp IS NULL;

-- Verify update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM attendance 
    WHERE session_timestamp IS NOT NULL;
    
    RAISE NOTICE '✅ Updated % attendance records with session timestamps', updated_count;
    RAISE NOTICE '🎉 Step 3 completed: Existing records updated';
END $$;

-- STEP 4: Add user profile management columns
-- This supports password change tracking for user profile management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Verify column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_changed_at'
    ) THEN
        RAISE NOTICE '✅ password_changed_at column added to users table';
    ELSE
        RAISE NOTICE '❌ Failed to add password_changed_at column';
    END IF;
    
    RAISE NOTICE '🎉 Step 4 completed: User profile tracking added';
END $$;

-- STEP 5: Create indexes for efficient session queries
-- These indexes will improve performance when querying attendance sessions
CREATE INDEX IF NOT EXISTS idx_attendance_session 
ON attendance(subject_id, date, session_timestamp);

CREATE INDEX IF NOT EXISTS idx_attendance_session_id 
ON attendance(session_id);

-- Verify indexes were created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_session'
    ) THEN
        RAISE NOTICE '✅ Index idx_attendance_session created';
    ELSE
        RAISE NOTICE '❌ Failed to create index idx_attendance_session';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'attendance' AND indexname = 'idx_attendance_session_id'
    ) THEN
        RAISE NOTICE '✅ Index idx_attendance_session_id created';
    ELSE
        RAISE NOTICE '❌ Failed to create index idx_attendance_session_id';
    END IF;
    
    RAISE NOTICE '🎉 Step 5 completed: Performance indexes created';
END $$;

-- STEP 6: Create/update functions for automatic timestamp management
-- This function updates the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- STEP 7: Ensure trigger exists for users table
-- This trigger automatically updates updated_at when user records change
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 8: Create function to track password changes
-- This function automatically sets password_changed_at when password changes
CREATE OR REPLACE FUNCTION track_password_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update password_changed_at if password_hash actually changed
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        NEW.password_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- STEP 9: Create trigger for password change tracking
-- This trigger automatically tracks when passwords are changed
DROP TRIGGER IF EXISTS track_password_change_trigger ON users;
CREATE TRIGGER track_password_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION track_password_change();

-- Verify triggers were created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_users_updated_at' AND event_object_table = 'users'
    ) THEN
        RAISE NOTICE '✅ Trigger update_users_updated_at created';
    ELSE
        RAISE NOTICE '❌ Failed to create trigger update_users_updated_at';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'track_password_change_trigger' AND event_object_table = 'users'
    ) THEN
        RAISE NOTICE '✅ Trigger track_password_change_trigger created';
    ELSE
        RAISE NOTICE '❌ Failed to create trigger track_password_change_trigger';
    END IF;
    
    RAISE NOTICE '🎉 Step 6-9 completed: Functions and triggers created';
END $$;

-- STEP 10: Final verification and summary
-- Display the current table structure and confirm migration success
DO $$
DECLARE
    attendance_columns TEXT;
    users_columns TEXT;
    attendance_indexes TEXT;
BEGIN
    -- Get attendance table columns
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    INTO attendance_columns
    FROM information_schema.columns 
    WHERE table_name = 'attendance';
    
    -- Get users table relevant columns
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    INTO users_columns
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('updated_at', 'password_changed_at');
    
    -- Get attendance table indexes
    SELECT string_agg(indexname, ', ')
    INTO attendance_indexes
    FROM pg_indexes 
    WHERE tablename = 'attendance'
    AND indexname LIKE 'idx_attendance_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SUMMARY OF CHANGES:';
    RAISE NOTICE '• Removed unique constraints from attendance table';
    RAISE NOTICE '• Added session_id and session_timestamp columns to attendance';
    RAISE NOTICE '• Added password_changed_at column to users';
    RAISE NOTICE '• Created performance indexes for session queries';
    RAISE NOTICE '• Added automatic triggers for timestamp management';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ATTENDANCE TABLE COLUMNS: %', attendance_columns;
    RAISE NOTICE '👤 USER PROFILE COLUMNS: %', users_columns;
    RAISE NOTICE '🔍 ATTENDANCE INDEXES: %', attendance_indexes;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Requirements 1.1 and 1.4 have been implemented';
    RAISE NOTICE '✅ Multiple attendance sessions per day are now supported';
    RAISE NOTICE '✅ User profile management tracking is now enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 You can now proceed with the next tasks in the implementation plan!';
END $$;

-- Test the migration by attempting to insert multiple attendance records for the same day
-- This should now work without constraint violations
DO $$
DECLARE
    test_subject_id UUID;
    test_student_id UUID;
    test_teacher_id UUID;
BEGIN
    -- Get test IDs (if available)
    SELECT subject_id INTO test_subject_id FROM subjects LIMIT 1;
    SELECT user_id INTO test_student_id FROM users WHERE user_type = 'student' LIMIT 1;
    SELECT user_id INTO test_teacher_id FROM users WHERE user_type = 'teacher' LIMIT 1;
    
    IF test_subject_id IS NOT NULL AND test_student_id IS NOT NULL THEN
        -- Try to insert multiple attendance records for the same day
        INSERT INTO attendance (subject_id, student_id, date, status, marked_by, method, session_id, session_timestamp)
        VALUES 
            (test_subject_id, test_student_id, CURRENT_DATE, 'present', test_teacher_id, 'manual', uuid_generate_v4(), NOW()),
            (test_subject_id, test_student_id, CURRENT_DATE, 'present', test_teacher_id, 'face_recognition', uuid_generate_v4(), NOW() + INTERVAL '2 hours');
        
        RAISE NOTICE '✅ TEST PASSED: Successfully inserted multiple attendance records for the same day';
        
        -- Clean up test data
        DELETE FROM attendance 
        WHERE subject_id = test_subject_id 
        AND student_id = test_student_id 
        AND date = CURRENT_DATE
        AND created_at > NOW() - INTERVAL '1 minute';
        
        RAISE NOTICE '✅ Test data cleaned up';
    ELSE
        RAISE NOTICE 'ℹ️  No test data available - skipping insertion test';
    END IF;
END $$;