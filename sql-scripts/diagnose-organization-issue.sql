-- Diagnostic Script for Organization Creation Issue
-- Run this in your Supabase SQL Editor to diagnose the problem

-- 1. Check if organizations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
) AS table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'organizations';

-- 4. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organizations';

-- 5. Check current user and role
SELECT current_user, current_role;

-- 6. Try to select from organizations table
SELECT COUNT(*) as total_organizations FROM organizations;

-- 7. Check recent organizations (if any)
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;

-- 8. Test insert permission (this will fail if RLS blocks it, but shows the error)
-- Uncomment the line below to test:
-- INSERT INTO organizations (name, description) VALUES ('Test Org', 'Test Description');
