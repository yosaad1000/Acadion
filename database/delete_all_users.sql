-- WARNING: This will delete ALL users and related data from your database
-- Use with extreme caution - this action cannot be undone!

-- First, disable RLS temporarily to allow deletion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Delete all related data first (in order of dependencies)
-- Delete attendance records
DELETE FROM attendance;

-- Delete any other tables that reference users
-- Add more DELETE statements here if you have other tables with foreign keys to users
-- Examples:
-- DELETE FROM enrollments;
-- DELETE FROM grades;
-- DELETE FROM face_encodings;

-- Now delete all users from your custom users table
DELETE FROM users;

-- Delete all users from Supabase auth.users table
-- This will also cascade to related auth tables
DELETE FROM auth.users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Reset any auto-increment sequences if you have them
-- (Uncomment and modify if your tables have auto-increment id columns)
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE attendance_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM users) as custom_users_count,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM attendance) as attendance_count;

SELECT 'All users and related data deleted successfully!' as status;