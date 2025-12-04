-- Allow Anonymous Organization Creation
-- This allows users to create organizations WITHOUT being logged in
-- Run this in Supabase SQL Editor

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.organizations;

-- Create new INSERT policy that allows BOTH authenticated AND anonymous users
CREATE POLICY "allow_all_insert"
ON public.organizations
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Verify the policy was created
SELECT 
    policyname,
    cmd as operation,
    roles,
    permissive
FROM pg_policies
WHERE tablename = 'organizations'
AND cmd = 'INSERT';

-- Test INSERT (should work now even without authentication)
BEGIN;
    INSERT INTO public.organizations (name, description, is_active)
    VALUES ('Test Anon Org ' || NOW()::text, 'Created without auth', true)
    RETURNING organization_id, name, created_at;
ROLLBACK;
