-- ============================================================================
-- FIX STREAMS RLS POLICY FOR STREAM MEMBERS
-- ============================================================================
-- Migration: Update streams SELECT policy to check stream_members table
-- Date: 2025-12-08
-- Issue: Private streams were not visible to users in stream_members
--
-- The original policy only checked owner_id and team_members, but not
-- the stream_members table where we track who has access to private streams.
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/033_fix_streams_rls_for_members.sql
-- ============================================================================

BEGIN;

-- Update the private streams policy to also check stream_members
DROP POLICY IF EXISTS "Private streams visible to owner and members" ON streams;

CREATE POLICY "Private streams visible to owner and members"
  ON streams FOR SELECT
  TO authenticated
  USING (
    is_private = true 
    AND (
      -- User owns the stream
      (owner_type = 'user' AND owner_id = auth.uid())
      OR
      -- User is in team_members (for team-owned streams)
      (owner_type = 'team' AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = streams.owner_id 
        AND team_members.user_id = auth.uid()
      ))
      OR
      -- User is in stream_members (added via Manage Members)
      is_stream_member(id, auth.uid())
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test as a stream member (not owner):
--
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "member-user-id"}';
-- SELECT id, name, is_private FROM streams WHERE status = 'active';
--
-- The private stream should now appear in the results.
-- ============================================================================

