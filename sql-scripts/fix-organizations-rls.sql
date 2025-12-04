-- Fix Organizations Table RLS Policies
-- Run this in your Supabase SQL Editor

-- First, check if the organizations table exists
-- If not, create it
CREATE TABLE IF NOT EXISTS organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    domain TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON organizations;
DROP POLICY IF EXISTS "Allow authenticated users to insert organizations" ON organizations;
DROP POLICY IF EXISTS "Allow authenticated users to update their organization" ON organizations;

-- Create policies for organizations table

-- 1. Allow all authenticated users to read organizations
CREATE POLICY "Allow authenticated users to read organizations"
ON organizations
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow all authenticated users to create organizations
-- (You may want to restrict this later to only admins)
CREATE POLICY "Allow authenticated users to insert organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow users to update organizations
-- (You may want to add more specific rules based on user roles)
CREATE POLICY "Allow authenticated users to update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create an index on organization name for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organizations';
