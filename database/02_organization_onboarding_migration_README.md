# Organization Onboarding Migration

## Overview
This migration adds support for organization domains and admin roles to enable the organization onboarding feature.

## Changes Made

### 1. Organizations Table
- **Added**: `domain` field (varchar(255), optional)
- **Added**: Unique constraint on domain for active organizations
- **Purpose**: Store organization domains like "university.edu" for future domain-based features

### 2. Users Table  
- **Updated**: `active_role` constraint to include 'admin' role
- **Purpose**: Support organization administrators who manage the organization but may not teach

## Requirements Addressed
- 6.1: Domain field added to organizations table
- 6.2: Unique constraint on domain field
- 6.3: Admin role added to user role constraint
- 6.4: Schema changes preserve existing data
- 6.5: New organizations can store domain information

## Files Created
- `02_organization_onboarding_migration.sql` - Main migration script
- `test_02_organization_onboarding_migration.sql` - Test script
- `migration_validation.py` - Validation utility
- `02_organization_onboarding_migration_README.md` - This documentation

## How to Apply

### Prerequisites
- Database backup recommended
- Supabase service key configured
- Test in development environment first

### Steps
1. **Backup**: Create database backup
2. **Apply**: Run migration in Supabase SQL Editor
3. **Test**: Run test script to verify changes
4. **Verify**: Check existing functionality still works

## Testing
Run the test script after applying migration:
```sql
-- In Supabase SQL Editor
\i test_02_organization_onboarding_migration.sql
```

## Rollback
If needed, rollback with:
```sql
-- Remove domain column
ALTER TABLE public.organizations DROP COLUMN IF EXISTS domain;

-- Revert role constraint  
ALTER TABLE public.users DROP CONSTRAINT users_active_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_active_role_check 
CHECK (active_role IN ('teacher', 'student'));
```

## Impact Assessment
- **Low Risk**: Additive changes only
- **No Data Loss**: Existing data preserved
- **Backward Compatible**: Existing code continues to work
- **New Features**: Enables organization onboarding functionality