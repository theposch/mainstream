-- =====================================================
-- Embed Support Migration
-- =====================================================
-- Adds columns to support URL-based embeds (Figma, YouTube, etc.)
-- in addition to uploaded images.
--
-- To apply:
--   docker compose -f supabase-docker/docker-compose.yml exec -T db \
--     psql -U postgres -d postgres -f - < scripts/migrations/016_add_embed_support.sql
-- =====================================================

BEGIN;

-- Asset type: 'image' for uploaded files, 'embed' for URL-based content
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'image';

-- Original embed URL (e.g., https://figma.com/file/abc123/...)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS embed_url TEXT;

-- Provider identifier for rendering logic (e.g., 'figma', 'youtube', 'vimeo')
ALTER TABLE assets ADD COLUMN IF NOT EXISTS embed_provider TEXT;

-- Add check constraint for asset_type
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_asset_type_check 
  CHECK (asset_type IN ('image', 'embed'));

-- Index for querying by asset type (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);

-- Index for querying by provider (useful for analytics/filtering)
CREATE INDEX IF NOT EXISTS idx_assets_embed_provider ON assets(embed_provider);

-- =====================================================
-- Schema Version Tracking
-- =====================================================
INSERT INTO schema_migrations (version, name) 
VALUES (16, '016_add_embed_support')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
-- Run to verify columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'assets' AND column_name IN ('asset_type', 'embed_url', 'embed_provider');

