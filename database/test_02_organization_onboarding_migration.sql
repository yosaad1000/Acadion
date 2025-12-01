-- Test Script: Organization Onboarding Migration
-- Description: Test the schema changes for organization domains and admin roles
-- This script should be run after applying the migration to verify functionality

-- Test 1: Verify domain column was added to organizations table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations' 
  AND column_name = 'domain';

-- Expected result: Should show domain column with varchar(255), nullable

-- Test 2: Verify unique constraint on domain exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'organizations' 
  AND indexname = 'organizations_domain_unique';

-- Expected result: Should show the unique index with WHERE clause for non-null active organizations

-- Test 3: Verify updated user role constraint
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_active_role_check';

-- Expected result: Should show constraint allowing 'admin', 'teacher', 'student'

-- Test 4: Test inserting organization with domain
INSERT INTO public.organizations (name, domain, description) 
VALUES ('Test University', 'test.edu', 'Test organization for migration verification')
RETURNING organization_id, name, domain, is_active, created_at;

-- Test 5: Test domain uniqueness constraint
-- This should fail with unique constraint violation
-- INSERT INTO public.organizations (name, domain, description) 
-- VALUES ('Another University', 'test.edu', 'Should fail due to duplicate domain');

-- Test 6: Test inserting organization without domain (should work)
INSERT INTO public.organizations (name, description) 
VALUES ('Test College', 'Test organization without domain')
RETURNING organization_id, name, domain, is_active, created_at;

-- Test 7: Test creating user with admin role
-- First create a test auth user (this would normally be done by Supabase Auth)
-- For testing purposes, we'll assume an auth user exists
-- INSERT INTO public.users (auth_user_id, organization_id, email, name, active_role)
-- SELECT 
--     gen_random_uuid(), -- This would be a real auth.users.id in practice
--     organization_id,
--     'admin@test.edu',
--     'Test Admin',
--     'admin'
-- FROM public.organizations 
-- WHERE name = 'Test University'
-- RETURNING user_id, name, active_role;

-- Test 8: Test that existing roles still work
-- INSERT INTO public.users (auth_user_id, organization_id, email, name, active_role)
-- SELECT 
--     gen_random_uuid(),
--     organization_id,
--     'teacher@test.edu',
--     'Test Teacher',
--     'teacher'
-- FROM public.organizations 
-- WHERE name = 'Test University'
-- RETURNING user_id, name, active_role;

-- Test 9: Test invalid role should fail
-- This should fail with check constraint violation
-- INSERT INTO public.users (auth_user_id, organization_id, email, name, active_role)
-- SELECT 
--     gen_random_uuid(),
--     organization_id,
--     'invalid@test.edu',
--     'Invalid Role User',
--     'invalid_role'
-- FROM public.organizations 
-- WHERE name = 'Test University';

-- Cleanup test data
DELETE FROM public.organizations WHERE name IN ('Test University', 'Test College');

-- Final verification: Check that existing data is intact
SELECT COUNT(*) as existing_organizations FROM public.organizations;
SELECT COUNT(*) as existing_users FROM public.users;

-- Show sample of existing data to verify it's still accessible
SELECT organization_id, name, domain, is_active 
FROM public.organizations 
WHERE is_active = true 
LIMIT 3;

SELECT user_id, name, active_role, organization_id 
FROM public.users 
WHERE deleted_at IS NULL 
LIMIT 3;