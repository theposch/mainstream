-- ============================================================================
-- ADD PLATFORM ROLES FOR ADMIN FUNCTIONALITY
-- ============================================================================
-- Migration: Add platform_role column to users table
-- Date: 2025-12-08
-- Purpose: Enable platform-level admin roles (owner, admin, user)
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/034_add_platform_roles.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add platform_role column to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user';

-- Add constraint to ensure valid role values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_platform_role'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT valid_platform_role 
      CHECK (platform_role IN ('user', 'admin', 'owner'));
  END IF;
END $$;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_platform_role ON users(platform_role);

-- ============================================================================
-- 2. Set the first user (Christian Poschmann) as owner
-- ============================================================================

UPDATE users 
SET platform_role = 'owner' 
WHERE id = 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17';

-- ============================================================================
-- 3. Add RLS policy for admin stream access
-- ============================================================================

-- Admins and owners can view all streams (including private ones)
DROP POLICY IF EXISTS "Admins can view all streams" ON streams;

CREATE POLICY "Admins can view all streams" 
  ON streams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.platform_role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 4. Track migration
-- ============================================================================

INSERT INTO schema_migrations (version, name) 
VALUES (34, '034_add_platform_roles')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that the column was added:
--   SELECT id, username, platform_role FROM users;
--
-- Check that the owner is set:
--   SELECT * FROM users WHERE platform_role = 'owner';
--
-- Check the policy:
--   SELECT * FROM pg_policies WHERE tablename = 'streams';
-- ============================================================================

