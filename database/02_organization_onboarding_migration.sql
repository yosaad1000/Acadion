-- Migration: Organization Onboarding Schema Updates
-- Description: Add domain field to organizations table and update user roles to include admin
-- Date: 2024-11-26
-- Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

-- Begin transaction to ensure atomicity
BEGIN;

-- 1. Add domain field to organizations table
-- This field will store the organization's domain (e.g., "university.edu")
-- It's optional but must be unique when provided
ALTER TABLE public.organizations 
ADD COLUMN domain varchar(255);

-- Add unique constraint for domain (excluding nulls)
-- This ensures no two active organizations can have the same domain
CREATE UNIQUE INDEX organizations_domain_unique 
ON public.organizations (domain) 
WHERE domain IS NOT NULL AND is_active = true;

-- 2. Update users table active_role constraint to include 'admin'
-- First, drop the existing constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_active_role_check;

-- Add the updated constraint with admin role included
ALTER TABLE public.users 
ADD CONSTRAINT users_active_role_check 
CHECK (active_role IN ('admin', 'teacher', 'student'));

-- 3. Add comment to document the domain field purpose
COMMENT ON COLUMN public.organizations.domain IS 'Organization domain (e.g., university.edu) - optional but unique when provided';

-- 4. Add comment to document the updated role constraint
COMMENT ON CONSTRAINT users_active_role_check ON public.users IS 'Valid user roles: admin (organization management), teacher (class management), student (class participation)';

-- Commit the transaction
COMMIT;

-- Verification queries (for testing purposes - these are comments)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'organizations' AND column_name = 'domain';

-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'users_active_role_check';