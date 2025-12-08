-- ============================================================================
-- COSMOS STREAM MEMBERS RLS POLICIES
-- ============================================================================
-- Migration: Add RLS policies for stream_members table
-- Date: 2025-12-08
-- Issue: stream_members table has RLS enabled but no policies, blocking inserts
--
-- Usage:
--   docker-compose -f supabase-docker/docker-compose.yml exec -T db psql -U postgres -d postgres < scripts/migrations/032_stream_members_rls_policies.sql
-- ============================================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE stream_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICY - Members can see other members of streams they have access to
-- ============================================================================

DROP POLICY IF EXISTS "Users can view stream members" ON stream_members;
CREATE POLICY "Users can view stream members"
  ON stream_members FOR SELECT
  TO authenticated
  USING (
    -- User can see members if they are the stream owner
    EXISTS (
      SELECT 1 FROM streams 
      WHERE streams.id = stream_members.stream_id 
      AND streams.owner_id = auth.uid()
    )
    OR
    -- Or if they are a member of the stream themselves
    EXISTS (
      SELECT 1 FROM stream_members sm2 
      WHERE sm2.stream_id = stream_members.stream_id 
      AND sm2.user_id = auth.uid()
    )
  );

-- ============================================================================
-- INSERT POLICY - Stream owners and admins can add members
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners and admins can add members" ON stream_members;
CREATE POLICY "Stream owners and admins can add members"
  ON stream_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is the stream owner
    EXISTS (
      SELECT 1 FROM streams 
      WHERE streams.id = stream_members.stream_id 
      AND streams.owner_id = auth.uid()
    )
    OR
    -- Or user is an admin of the stream
    EXISTS (
      SELECT 1 FROM stream_members sm2 
      WHERE sm2.stream_id = stream_members.stream_id 
      AND sm2.user_id = auth.uid() 
      AND sm2.role = 'admin'
    )
  );

-- ============================================================================
-- DELETE POLICY - Stream owners, admins can remove members; users can remove self
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners and admins can remove members" ON stream_members;
CREATE POLICY "Stream owners and admins can remove members"
  ON stream_members FOR DELETE
  TO authenticated
  USING (
    -- User is the stream owner
    EXISTS (
      SELECT 1 FROM streams 
      WHERE streams.id = stream_members.stream_id 
      AND streams.owner_id = auth.uid()
    )
    OR
    -- Or user is an admin of the stream
    EXISTS (
      SELECT 1 FROM stream_members sm2 
      WHERE sm2.stream_id = stream_members.stream_id 
      AND sm2.user_id = auth.uid() 
      AND sm2.role = 'admin'
    )
    OR
    -- Or user is removing themselves
    stream_members.user_id = auth.uid()
  );

-- ============================================================================
-- UPDATE POLICY - Stream owners can update member roles
-- ============================================================================

DROP POLICY IF EXISTS "Stream owners can update member roles" ON stream_members;
CREATE POLICY "Stream owners can update member roles"
  ON stream_members FOR UPDATE
  TO authenticated
  USING (
    -- Only stream owners can update roles
    EXISTS (
      SELECT 1 FROM streams 
      WHERE streams.id = stream_members.stream_id 
      AND streams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM streams 
      WHERE streams.id = stream_members.stream_id 
      AND streams.owner_id = auth.uid()
    )
  );

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
-- ============================================================================

