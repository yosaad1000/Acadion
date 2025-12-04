-- Diagnose Authentication and RLS Issues
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'organizations';

-- 2. Check ALL policies (should show 4 policies)
SELECT 
    policyname,
    cmd as operation,
    roles,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd, policyname;

-- 3. Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 4. Try INSERT as superuser (this should always work)
INSERT INTO public.organizations (name, description, is_active)
VALUES ('Test From SQL Editor', 'Created directly in SQL', true)
RETURNING organization_id, name, created_at;

-- 5. Show all organizations
SELECT * FROM public.organizations ORDER BY created_at DESC;
