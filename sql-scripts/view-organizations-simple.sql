-- Simple script to view all organizations
-- Run this in your Supabase SQL Editor

-- Option 1: Try to view with current RLS policies
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

-- If the above returns no results, run Option 2 below:

-- Option 2: Temporarily disable RLS to see ALL data
-- (Uncomment the lines below)
/*
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
*/
