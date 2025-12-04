-- Check and Fix RLS Policies for Organizations
-- Run this in your Supabase SQL Editor

-- Step 1: Check existing policies
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

-- Step 2: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'organizations';

-- Step 3: Drop and recreate the SELECT policy with correct settings
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;

CREATE POLICY "organizations_select_policy"
ON public.organizations
FOR SELECT
TO authenticated, anon
USING (true);

-- Step 4: Ensure other policies exist
-- Insert policy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'organizations_insert_policy'
    ) THEN
        CREATE POLICY "organizations_insert_policy"
        ON public.organizations
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Update policy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'organizations_update_policy'
    ) THEN
        CREATE POLICY "organizations_update_policy"
        ON public.organizations
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;

-- Step 6: Verify - you should now see your organizations
SELECT 
    organization_id,
    name,
    description,
    domain,
    is_active,
    created_at
FROM public.organizations
ORDER BY created_at DESC;
