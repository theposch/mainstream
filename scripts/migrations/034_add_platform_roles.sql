-- ============================================================================
-- ADD PLATFORM ROLES FOR ADMIN FUNCTIONALITY
-- ============================================================================
-- Migration: Add platform_role column to users table
-- Date: 2025-12-08
-- Purpose: Support platform-level admin roles (user, admin, owner)
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/034_add_platform_roles.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add platform_role column to users table
-- ============================================================================

-- Add the column with default value 'user'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'user';

-- Add constraint to ensure valid values
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_platform_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_platform_role_check 
CHECK (platform_role IN ('user', 'admin', 'owner'));

-- Create index for efficient filtering by role
CREATE INDEX IF NOT EXISTS idx_users_platform_role 
ON users (platform_role);

-- ============================================================================
-- 2. Set the first user (by created_at) as owner if no owner exists
-- ============================================================================

-- Only set owner if no owner currently exists
DO $$
DECLARE
  first_user_id UUID;
  owner_exists BOOLEAN;
BEGIN
  -- Check if an owner already exists
  SELECT EXISTS(SELECT 1 FROM users WHERE platform_role = 'owner') INTO owner_exists;
  
  IF NOT owner_exists THEN
    -- Get the first user by creation date
    SELECT id INTO first_user_id 
    FROM users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Set them as owner if a user exists
    IF first_user_id IS NOT NULL THEN
      UPDATE users 
      SET platform_role = 'owner' 
      WHERE id = first_user_id;
      
      RAISE NOTICE 'Set user % as platform owner', first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Owner already exists, skipping owner assignment';
  END IF;
END $$;

-- ============================================================================
-- 3. Add RLS policy for admins to view all streams (including private)
-- ============================================================================

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
-- Check the column was added:
--   \d users
-- Check platform roles:
--   SELECT id, username, platform_role FROM users ORDER BY created_at;
-- Check RLS policies:
--   SELECT * FROM pg_policies WHERE tablename = 'streams';
-- ============================================================================

