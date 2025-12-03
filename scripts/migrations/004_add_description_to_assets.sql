-- Migration: Add description column to assets table
-- Date: 2025-11-27
-- Issue: Upload dialog failing because description column is missing

-- Add description column to assets table
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN assets.description IS 'Optional description for the asset, can include hashtags and stream mentions';



