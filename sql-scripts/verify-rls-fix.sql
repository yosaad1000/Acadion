-- Verify RLS Fix
-- Run this AFTER running FINAL-FIX-RLS.sql

-- 1. Check if policies exist
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

-- 2. Test INSERT (this should work now)
BEGIN;
    INSERT INTO public.organizations (name, description, is_active)
    VALUES ('Test Org ' || NOW()::text, 'Test Description', true)
    RETURNING organization_id, name, created_at;
ROLLBACK;

-- 3. Show all organizations
SELECT 
    organization_id,
    name,
    description,
    domain,
    is_active,
    created_at
FROM public.organizations
ORDER BY created_at DESC;
