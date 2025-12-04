-- =====================================================
-- Drops Feature - Database Schema
-- =====================================================
-- Creates tables for the Drops feature (AI-powered newsletters)
--
-- To apply:
--   psql -h localhost -p 5432 -U postgres < 018_add_drops.sql
-- Or via Docker:
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/018_add_drops.sql

-- =====================================================
-- Drops Table
-- =====================================================
-- Stores drop (newsletter) metadata and filter criteria
CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_at TIMESTAMP WITH TIME ZONE,
  date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
  filter_stream_ids UUID[],
  filter_user_ids UUID[],
  is_weekly BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_created_by ON drops(created_by);
CREATE INDEX IF NOT EXISTS idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drops_is_weekly ON drops(is_weekly);

-- =====================================================
-- Drop Posts Junction Table
-- =====================================================
-- Many-to-many relationship between drops and assets
CREATE TABLE IF NOT EXISTS drop_posts (
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (drop_id, asset_id)
);

-- Index for fetching posts by drop
CREATE INDEX IF NOT EXISTS idx_drop_posts_drop_id ON drop_posts(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_posts_position ON drop_posts(drop_id, position);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on drops table
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all published drops
CREATE POLICY "Anyone can view published drops"
  ON drops FOR SELECT
  USING (status = 'published');

-- Policy: Users can view their own drafts
CREATE POLICY "Users can view own drafts"
  ON drops FOR SELECT
  USING (auth.uid() = created_by AND status = 'draft');

-- Policy: Users can create drops
CREATE POLICY "Authenticated users can create drops"
  ON drops FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own drops
CREATE POLICY "Users can update own drops"
  ON drops FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete their own drops
CREATE POLICY "Users can delete own drops"
  ON drops FOR DELETE
  USING (auth.uid() = created_by);

-- Enable RLS on drop_posts table
ALTER TABLE drop_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view drop_posts for drops they can see
CREATE POLICY "Anyone can view drop_posts for visible drops"
  ON drop_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drops 
      WHERE drops.id = drop_posts.drop_id 
      AND (drops.status = 'published' OR drops.created_by = auth.uid())
    )
  );

-- Policy: Users can manage drop_posts for their own drops
CREATE POLICY "Users can manage drop_posts for own drops"
  ON drop_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drops 
      WHERE drops.id = drop_posts.drop_id 
      AND drops.created_by = auth.uid()
    )
  );

-- =====================================================
-- Updated At Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_drops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_drops_updated_at
  BEFORE UPDATE ON drops
  FOR EACH ROW
  EXECUTE FUNCTION update_drops_updated_at();

