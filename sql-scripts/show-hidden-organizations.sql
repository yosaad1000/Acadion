-- Show Hidden Organizations
-- Run this to see organizations that RLS is hiding from you

-- Temporarily disable RLS to see ALL data
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Show all organizations
SELECT 
    organization_id,
    name,
    description,
    domain,
    is_active,
    created_at,
    updated_at
FROM public.organizations
ORDER BY created_at DESC;

-- Re-enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
