-- ============================================================================
-- ADD RLS POLICIES FOR ADMIN USER MANAGEMENT
-- ============================================================================
-- Migration: Add RLS policies to allow admins to manage users
-- Date: 2025-12-08
-- Purpose: Allow platform admins/owners to update user roles
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/036_add_admin_user_management_rls.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add RLS policy for admins to update any user's platform_role
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update user roles" ON users;

-- Create policy for admins/owners to update users
CREATE POLICY "Admins can update user roles"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.platform_role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.platform_role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 2. Add RLS policy for admins to delete users
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete users" ON users;

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    -- Can delete if the requesting user is an admin/owner
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.platform_role IN ('admin', 'owner')
    )
    -- And the target user is not the owner
    AND platform_role != 'owner'
  );

-- ============================================================================
-- 3. Track migration
-- ============================================================================

INSERT INTO schema_migrations (version, name) 
VALUES (36, '036_add_admin_user_management_rls')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check the policies:
--   SELECT * FROM pg_policies WHERE tablename = 'users';
-- ============================================================================

