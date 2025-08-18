-- Test script to verify the attendance sessions migration
-- Run this after running the migration script

-- Test 1: Verify attendance table structure
SELECT 'Testing attendance table structure...' as test;

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name IN ('session_id', 'session_timestamp')
ORDER BY ordinal_position;

-- Test 2: Verify unique constraint is removed
SELECT 'Testing unique constraints...' as test;

SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'attendance' 
AND constraint_type = 'UNIQUE';

-- Test 3: Verify indexes exist
SELECT 'Testing indexes...' as test;

SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'attendance'
AND indexname IN ('idx_attendance_session', 'idx_attendance_session_id')
ORDER BY indexname;

-- Test 4: Verify users table has profile tracking columns
SELECT 'Testing users table structure...' as test;

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('updated_at', 'password_changed_at')
ORDER BY ordinal_position;

-- Test 5: Verify triggers exist
SELECT 'Testing triggers...' as test;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND trigger_name IN ('update_users_updated_at', 'track_password_change_trigger')
ORDER BY trigger_name;

-- Test 6: Insert test attendance records to verify multiple sessions work
SELECT 'Testing multiple attendance sessions...' as test;

-- Note: This test assumes you have test users and subjects
-- Replace with actual UUIDs from your database if needed
DO $$ 
DECLARE
    test_subject_id UUID;
    test_student_id UUID;
    test_teacher_id UUID;
BEGIN
    -- Get first available subject and student for testing
    SELECT subject_id INTO test_subject_id FROM subjects LIMIT 1;
    SELECT user_id INTO test_student_id FROM users WHERE user_type = 'student' LIMIT 1;
    SELECT user_id INTO test_teacher_id FROM users WHERE user_type = 'teacher' LIMIT 1;
    
    IF test_subject_id IS NOT NULL AND test_student_id IS NOT NULL THEN
        -- Try to insert multiple attendance records for the same day
        INSERT INTO attendance (subject_id, student_id, date, status, marked_by, method, session_id, session_timestamp)
        VALUES 
            (test_subject_id, test_student_id, CURRENT_DATE, 'present', test_teacher_id, 'manual', uuid_generate_v4(), NOW()),
            (test_subject_id, test_student_id, CURRENT_DATE, 'present', test_teacher_id, 'face_recognition', uuid_generate_v4(), NOW() + INTERVAL '2 hours');
        
        RAISE NOTICE 'Successfully inserted multiple attendance records for the same day';
        
        -- Clean up test data
        DELETE FROM attendance 
        WHERE subject_id = test_subject_id 
        AND student_id = test_student_id 
        AND date = CURRENT_DATE;
        
        RAISE NOTICE 'Test data cleaned up';
    ELSE
        RAISE NOTICE 'No test data available - skipping attendance insertion test';
    END IF;
END $$;

SELECT 'Migration verification complete!' as result;