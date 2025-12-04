-- Add visibility column to assets table
-- Allows assets to be 'public' (appear in feed) or 'unlisted' (only in drops, not in feed)

ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('public', 'unlisted'));

COMMENT ON COLUMN assets.visibility IS 'Asset visibility: public (appears in feed), unlisted (only accessible via direct link/drops)';

-- Index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_assets_visibility ON assets(visibility);

