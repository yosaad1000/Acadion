-- Check if the trigger and function exist and are working
-- Run this in Supabase SQL Editor

-- Check if the trigger function exists
SELECT 'Checking trigger function...' as status;
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if the trigger exists
SELECT 'Checking trigger...' as status;
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check what columns exist in users table
SELECT 'Users table structure...' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if users table exists and what's in it
SELECT 'Current users table content...' as status;
SELECT * FROM public.users LIMIT 5;

-- Check current users in auth.users vs public.users
SELECT 'Auth users vs Public users...' as status;
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.created_at as auth_created,
  u.auth_user_id,
  u.name as user_name,
  u.active_role
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
ORDER BY au.created_at DESC
LIMIT 10;

-- Check user_roles table structure and content
SELECT 'User roles table structure...' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'User roles content...' as status;
SELECT * FROM user_roles ORDER BY created_at DESC LIMIT 10;