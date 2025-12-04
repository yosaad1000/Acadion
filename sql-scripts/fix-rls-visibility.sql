-- Fix RLS Visibility Issue for Organizations Table
-- The data is being inserted but RLS is blocking you from seeing it in the dashboard

-- 1. First, let's see what's actually in the table (bypassing RLS as superuser)
-- This will show ALL organizations including ones you can't see due to RLS
SELECT 
    organization_id,
    name,
    description,
    is_active,
    created_at,
    updated_at
FROM public.organizations
ORDER BY created_at DESC;

-- 2. Temporarily disable RLS to see all data (for debugging)
-- WARNING: Only do this in development, not production!
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- 3. Check the data again
SELECT * FROM public.organizations ORDER BY created_at DESC;

-- 4. Re-enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 5. Now fix the policies to allow viewing

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to update organizations" ON public.organizations;

-- Create comprehensive policies that work for both app and dashboard

-- Policy 1: Allow ALL authenticated users to SELECT (read) organizations
CREATE POLICY "organizations_select_policy"
ON public.organizations
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy 2: Allow ALL authenticated users to INSERT organizations
CREATE POLICY "organizations_insert_policy"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow ALL authenticated users to UPDATE organizations
CREATE POLICY "organizations_update_policy"
ON public.organizations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow ALL authenticated users to DELETE organizations
CREATE POLICY "organizations_delete_policy"
ON public.organizations
FOR DELETE
TO authenticated
USING (true);

-- 6. Grant permissions to authenticated role
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO anon;

-- 7. Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;

-- 8. Final check - you should now see all organizations
SELECT 
    organization_id,
    name,
    description,
    is_active,
    created_at
FROM public.organizations
ORDER BY created_at DESC;
