-- Fix Organization Table RLS Policies
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on organizations table (if not already enabled)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow authenticated users to update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.organizations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.organizations;

-- 3. Create new policies

-- Allow all authenticated users to read organizations
CREATE POLICY "Enable read access for authenticated users"
ON public.organizations
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert organizations
-- (In production, you may want to restrict this to admins only)
CREATE POLICY "Enable insert for authenticated users"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update organizations
CREATE POLICY "Enable update for authenticated users"
ON public.organizations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT USAGE ON SEQUENCE IF EXISTS public.organizations_organization_id_seq TO authenticated;

-- 5. Verify policies are created
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

-- 6. Test by checking if you can see the table
SELECT COUNT(*) as total_organizations FROM public.organizations;

-- 7. Show any existing organizations
SELECT * FROM public.organizations ORDER BY created_at DESC LIMIT 10;
