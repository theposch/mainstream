-- ============================================================================
-- COSMOS STREAMS RLS POLICIES
-- ============================================================================
-- Migration: Add RLS policies for INSERT, UPDATE, DELETE on streams table
-- Date: 2025-11-27
-- Issue: Stream creation failing because only SELECT policies exist
--
-- This migration adds the missing RLS policies to allow authenticated users
-- to create, update, and delete streams they own.
--
-- Usage:
--   docker-compose -f supabase-docker/docker-compose.yml exec -T db psql -U postgres -d postgres < scripts/migrations/008_add_streams_rls_policies.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- INSERT POLICY - Allow authenticated users to create streams they own
-- ============================================================================

CREATE POLICY "Users can create their own streams"
  ON streams FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User-owned streams: user must be the owner
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    -- Team-owned streams: user must be team owner or admin
    (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = owner_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ))
  );

-- ============================================================================
-- UPDATE POLICY - Allow users to update streams they own
-- ============================================================================

CREATE POLICY "Users can update their own streams"
  ON streams FOR UPDATE
  TO authenticated
  USING (
    -- Can update if they own the stream
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = owner_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ))
  )
  WITH CHECK (
    -- Cannot change ownership to someone else
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = owner_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    ))
  );

-- ============================================================================
-- DELETE POLICY - Allow owners to delete their streams
-- ============================================================================

CREATE POLICY "Users can delete their own streams"
  ON streams FOR DELETE
  TO authenticated
  USING (
    -- Only owners can delete (not admins)
    (owner_type = 'user' AND owner_id = auth.uid()) OR
    (owner_type = 'team' AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = owner_id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    ))
  );

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify policies were created:
--
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'streams';
--
-- Expected output: 5 policies total
-- - 2 SELECT policies (existing)
-- - 1 INSERT policy (new)
-- - 1 UPDATE policy (new)
-- - 1 DELETE policy (new)
-- ============================================================================




