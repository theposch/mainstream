-- =====================================================
-- Stream Bookmarks Table Migration
-- =====================================================
-- Adds stream_bookmarks table for storing external links
-- (Jira, Figma, Notion, etc.) associated with streams.
--
-- To apply:
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/004_stream_bookmarks.sql
-- =====================================================

BEGIN;

-- Stream Bookmarks Table
-- Stores external resource links associated with streams
CREATE TABLE IF NOT EXISTS stream_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,  -- Optional custom title, falls back to domain in UI
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  position INTEGER NOT NULL DEFAULT 0  -- For ordering bookmarks
);

-- Index for fast lookups by stream (most common query)
CREATE INDEX IF NOT EXISTS idx_stream_bookmarks_stream_id ON stream_bookmarks(stream_id);

-- Index for lookups by creator (for permission checks)
CREATE INDEX IF NOT EXISTS idx_stream_bookmarks_created_by ON stream_bookmarks(created_by);

-- =====================================================
-- Schema Version Tracking
-- =====================================================
INSERT INTO schema_migrations (version, name) 
VALUES (4, '004_stream_bookmarks')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
-- Run to verify the table was created:
-- SELECT * FROM information_schema.tables WHERE table_name = 'stream_bookmarks';

