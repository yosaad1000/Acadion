-- Verification Script for Organization Onboarding Migration
-- Run this BEFORE applying the migration to see current state
-- Then run AFTER applying to verify changes

-- =============================================================================
-- PRE-MIGRATION VERIFICATION
-- =============================================================================

-- Check current organizations table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Check current user role constraint
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%active_role%';

-- Count existing data
SELECT 
    'organizations' as table_name,
    COUNT(*) as record_count
FROM public.organizations
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM public.users;

-- =============================================================================
-- POST-MIGRATION VERIFICATION (run after applying migration)
-- =============================================================================

-- Verify domain column exists
-- Expected: Should show domain column with varchar(255), nullable
/*
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations' 
  AND column_name = 'domain';
*/

-- Verify unique index on domain
-- Expected: Should show organizations_domain_unique index
/*
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'organizations' 
  AND indexname = 'organizations_domain_unique';
*/

-- Verify updated role constraint
-- Expected: Should show constraint allowing 'admin', 'teacher', 'student'
/*
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_active_role_check';
*/

-- Test data integrity (should return same counts as before)
/*
SELECT 
    'organizations' as table_name,
    COUNT(*) as record_count
FROM public.organizations
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM public.users;
*/