-- Migration: Add video support to asset_type constraint
-- This allows WebM video uploads to be stored in the assets table

-- Drop and recreate the asset_type check constraint to include 'video'
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_asset_type_check 
  CHECK (asset_type IN ('image', 'embed', 'video'));

-- Add comment for documentation
COMMENT ON COLUMN assets.asset_type IS 'Type of asset: image (uploaded images), embed (external embeds like Figma), video (uploaded videos like WebM)';

