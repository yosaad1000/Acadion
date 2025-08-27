-- Debug script to check what's causing infinite loading

-- Check if tables exist
SELECT 
    'users table exists' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) as result;

SELECT 
    'user_roles table exists' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
    ) as result;

-- Check users table structure
SELECT 'users table columns' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current users
SELECT 'current users' as info;
SELECT auth_user_id, email, name, active_role, created_at
FROM users 
ORDER BY created_at DESC
LIMIT 5;

-- Check user roles
SELECT 'current user_roles' as info;
SELECT ur.auth_user_id, u.email, ur.role_type, ur.institution_context, ur.is_active
FROM user_roles ur
LEFT JOIN users u ON ur.auth_user_id = u.auth_user_id
ORDER BY ur.created_at DESC
LIMIT 10;

-- Check auth.users (to see if OAuth users exist)
SELECT 'auth users count' as info;
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Check if there are auth users without profiles
SELECT 'auth users without profiles' as info;
SELECT au.id, au.email, au.raw_user_meta_data->>'user_type' as oauth_user_type
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NULL
LIMIT 5;