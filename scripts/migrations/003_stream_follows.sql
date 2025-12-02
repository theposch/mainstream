-- =====================================================
-- Stream Follows Table Migration
-- =====================================================
-- Adds stream_follows table for tracking users who follow streams.
-- This is separate from stream_members (which tracks owner/admin/member roles).
--
-- To apply:
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/003_stream_follows.sql
-- =====================================================

BEGIN;

-- Stream Follows Table
-- Tracks users following streams (for content subscription, not membership/permissions)
CREATE TABLE IF NOT EXISTS stream_follows (
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);

-- Index for fast lookups by stream (get all followers of a stream)
CREATE INDEX IF NOT EXISTS idx_stream_follows_stream_id ON stream_follows(stream_id);

-- Index for fast lookups by user (get all streams a user follows)
CREATE INDEX IF NOT EXISTS idx_stream_follows_user_id ON stream_follows(user_id);

-- =====================================================
-- Schema Version Tracking
-- =====================================================
INSERT INTO schema_migrations (version, name) 
VALUES (3, '003_stream_follows')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
-- Run to verify the table was created:
-- SELECT * FROM information_schema.tables WHERE table_name = 'stream_follows';

