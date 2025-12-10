-- Migration: Add RLS policies for asset_views table
-- Created: 2025-12-03
-- Description: Security policies for the asset_views table

-- Enable RLS
ALTER TABLE asset_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own views
CREATE POLICY "Users can insert own views"
  ON asset_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own views (for timestamp updates)
CREATE POLICY "Users can update own views"
  ON asset_views FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone authenticated can read views (for viewer list tooltip)
CREATE POLICY "Authenticated users can read views"
  ON asset_views FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Track migration
INSERT INTO schema_migrations (version, name) 
VALUES (10, '010_asset_views_rls')
ON CONFLICT (version) DO NOTHING;



