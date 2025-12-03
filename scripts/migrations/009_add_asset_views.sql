-- Migration: Add Asset Views Tracking
-- Created: 2025-12-03
-- Description: Tracks which users have viewed which assets (after 2+ seconds)
--              Includes denormalized view_count on assets table for performance

-- =====================================================
-- Asset Views Table
-- =====================================================
-- One row per unique viewer per asset
-- Primary key prevents duplicate counting

CREATE TABLE IF NOT EXISTS asset_views (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, user_id)
);

-- Index for fetching viewers list (tooltip)
CREATE INDEX IF NOT EXISTS idx_asset_views_asset_id_viewed_at 
  ON asset_views(asset_id, viewed_at DESC);

-- Index for user's view history (if needed later)
CREATE INDEX IF NOT EXISTS idx_asset_views_user_id 
  ON asset_views(user_id);

-- =====================================================
-- Denormalized View Count on Assets
-- =====================================================
-- Avoids COUNT(*) queries - O(1) read performance

ALTER TABLE assets 
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- Trigger Function: Increment View Count
-- =====================================================
-- Only fires on INSERT (new viewer), not UPDATE (repeat view)
-- This ensures accurate unique viewer counts

CREATE OR REPLACE FUNCTION increment_asset_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assets 
  SET view_count = view_count + 1 
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only on INSERT)
DROP TRIGGER IF EXISTS on_asset_view_insert ON asset_views;
CREATE TRIGGER on_asset_view_insert
  AFTER INSERT ON asset_views
  FOR EACH ROW 
  EXECUTE FUNCTION increment_asset_view_count();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE asset_views IS 'Tracks unique viewers per asset (logged-in users only)';
COMMENT ON COLUMN asset_views.asset_id IS 'The asset being viewed';
COMMENT ON COLUMN asset_views.user_id IS 'The user who viewed (excludes asset owner)';
COMMENT ON COLUMN asset_views.viewed_at IS 'When the view was recorded (after 2s threshold)';
COMMENT ON COLUMN assets.view_count IS 'Denormalized count of unique viewers';

-- =====================================================
-- Track Migration
-- =====================================================
INSERT INTO schema_migrations (version, name) 
VALUES (9, '009_add_asset_views')
ON CONFLICT (version) DO NOTHING;

