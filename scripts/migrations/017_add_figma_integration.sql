-- =====================================================
-- Figma Integration Migration
-- =====================================================
-- Adds Figma API token storage for frame-specific thumbnails
--
-- To apply:
--   docker compose -f supabase-docker/docker-compose.yml exec -T db \
--     psql -U postgres -d postgres -f - < scripts/migrations/017_add_figma_integration.sql
-- =====================================================

BEGIN;

-- Add Figma access token column to users table
-- Token is stored encrypted (handled at application level)
ALTER TABLE users ADD COLUMN IF NOT EXISTS figma_access_token TEXT;

-- Add timestamp for when the token was last updated
ALTER TABLE users ADD COLUMN IF NOT EXISTS figma_token_updated_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- Schema Version Tracking
-- =====================================================
INSERT INTO schema_migrations (version, name) 
VALUES (17, '017_add_figma_integration')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
-- Run to verify columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name LIKE 'figma%';

