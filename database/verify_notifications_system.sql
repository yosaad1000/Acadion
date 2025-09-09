-- Verification Script for Notifications System
-- Run this to verify that the notifications system was set up correctly

-- Check if tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') 
        THEN '✓ notifications table exists'
        ELSE '✗ notifications table missing'
    END as notifications_table_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') 
        THEN '✓ notification_preferences table exists'
        ELSE '✗ notification_preferences table missing'
    END as preferences_table_status;

-- Check table structures
SELECT 
    'notifications' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

SELECT 
    'notification_preferences' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('notifications', 'notification_preferences')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'notification_preferences')
ORDER BY tablename, policyname;

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('notifications', 'notification_preferences')
ORDER BY event_object_table, trigger_name;

-- Check constraints
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('notifications', 'notification_preferences')
ORDER BY table_name, constraint_name;

-- Check if tables are in real-time publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('notifications', 'notification_preferences');

-- Count existing data
SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count
FROM notifications
UNION ALL
SELECT 
    'notification_preferences' as table_name,
    COUNT(*) as row_count
FROM notification_preferences;

-- Show sample notification preferences by type
SELECT 
    notification_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN enabled THEN 1 END) as enabled_users,
    COUNT(CASE WHEN NOT enabled THEN 1 END) as disabled_users
FROM notification_preferences
GROUP BY notification_type
ORDER BY notification_type;