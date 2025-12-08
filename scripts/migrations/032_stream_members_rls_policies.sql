-- ============================================================================
-- COSMOS STREAM MEMBERS RLS POLICIES
-- ============================================================================
-- Migration: Add RLS policies for stream_members table
-- Date: 2025-12-08
-- Issue: stream_members table has RLS enabled but no policies, blocking inserts
--
-- NOTE: Uses SECURITY DEFINER functions to avoid infinite recursion when
-- checking membership within policies on the same table.
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/032_stream_members_rls_policies.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS and avoid recursion)
-- ============================================================================

-- Check if user is a member of a stream
CREATE OR REPLACE FUNCTION is_stream_member(p_stream_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stream_members 
    WHERE stream_id = p_stream_id AND user_id = p_user_id
  );
$$;

-- Check if user owns a stream
CREATE OR REPLACE FUNCTION is_stream_owner(p_stream_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM streams 
    WHERE id = p_stream_id AND owner_id = p_user_id
  );
$$;

-- Check if user is an admin of a stream
CREATE OR REPLACE FUNCTION is_stream_admin(p_stream_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stream_members 
    WHERE stream_id = p_stream_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

-- ============================================================================
-- Ensure RLS is enabled
-- ============================================================================

ALTER TABLE stream_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICY - Members can see other members of streams they have access to
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stream members" ON stream_members;
CREATE POLICY "Users can view stream members"
  ON stream_members FOR SELECT
  TO authenticated
  USING (
    -- User owns the stream
    is_stream_owner(stream_id, auth.uid())
    OR
    -- User is viewing their own membership row
    user_id = auth.uid()
    OR
    -- User is a member of this stream
    is_stream_member(stream_id, auth.uid())
  );

-- ============================================================================
-- INSERT POLICY - Stream owners and admins can add members
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners and admins can add members" ON stream_members;
CREATE POLICY "Stream owners and admins can add members"
  ON stream_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_stream_owner(stream_id, auth.uid())
    OR
    is_stream_admin(stream_id, auth.uid())
  );

-- ============================================================================
-- DELETE POLICY - Stream owners, admins can remove members; users can remove self
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners and admins can remove members" ON stream_members;
CREATE POLICY "Stream owners and admins can remove members"
  ON stream_members FOR DELETE
  TO authenticated
  USING (
    is_stream_owner(stream_id, auth.uid())
    OR
    is_stream_admin(stream_id, auth.uid())
    OR
    -- Users can remove themselves (leave stream)
    user_id = auth.uid()
  );

-- ============================================================================
-- UPDATE POLICY - Stream owners can update member roles
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners can update member roles" ON stream_members;
CREATE POLICY "Stream owners can update member roles"
  ON stream_members FOR UPDATE
  TO authenticated
  USING (is_stream_owner(stream_id, auth.uid()))
  WITH CHECK (is_stream_owner(stream_id, auth.uid()));

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify policies were created:
--
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE tablename = 'stream_members';
--
-- Expected: 4 policies (SELECT, INSERT, DELETE, UPDATE)
--
-- Test as authenticated user:
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "your-user-id"}';
-- SELECT * FROM stream_members WHERE stream_id = 'your-stream-id';
-- ============================================================================
