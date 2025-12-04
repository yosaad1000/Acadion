-- FINAL FIX for Organizations RLS
-- This will definitely fix the INSERT issue
-- Run this in your Supabase SQL Editor

-- Step 1: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to update organizations" ON public.organizations;

-- Step 2: Create simple, permissive policies

-- Allow SELECT for everyone (authenticated and anonymous)
CREATE POLICY "allow_all_select"
ON public.organizations
FOR SELECT
USING (true);

-- Allow INSERT for authenticated users
CREATE POLICY "allow_authenticated_insert"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow UPDATE for authenticated users
CREATE POLICY "allow_authenticated_update"
ON public.organizations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow DELETE for authenticated users
CREATE POLICY "allow_authenticated_delete"
ON public.organizations
FOR DELETE
TO authenticated
USING (true);

-- Step 3: Grant permissions
GRANT ALL ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;

-- Step 4: Verify policies are created
SELECT 
    policyname,
    cmd as operation,
    roles,
    permissive
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd;

-- Step 5: Test - you should see all organizations now
SELECT 
    organization_id,
    name,
    description,
    is_active,
    created_at
FROM public.organizations
ORDER BY created_at DESC;
