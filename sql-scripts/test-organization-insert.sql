-- Test Organization Insert
-- Run this in your Supabase SQL Editor to test if inserts work

-- 1. Check current user context
SELECT 
    current_user as current_user,
    session_user as session_user,
    current_role as current_role;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'organizations';

-- 3. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

-- 4. Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'organizations'
AND table_schema = 'public';

-- 5. Try a test insert (this will show the exact error if it fails)
-- This insert will be rolled back, so it won't actually create a record
BEGIN;
    INSERT INTO public.organizations (name, description, is_active)
    VALUES ('Test Organization ' || NOW()::text, 'Test Description', true)
    RETURNING *;
ROLLBACK;

-- 6. If the above worked, try a real insert
-- Uncomment the lines below to create a test organization:
/*
INSERT INTO public.organizations (name, description, is_active)
VALUES ('My Test Organization', 'This is a test organization', true)
RETURNING *;
*/

-- 7. Check if any organizations exist
SELECT 
    organization_id,
    name,
    description,
    is_active,
    created_at
FROM public.organizations
ORDER BY created_at DESC
LIMIT 10;
