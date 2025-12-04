-- Drop blocks table for Notion-like block-based editor
CREATE TABLE IF NOT EXISTS drop_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'post', 'featured_post', 'divider', 'quote')),
  position INT NOT NULL DEFAULT 0,
  
  -- Content for text/heading/quote blocks
  content TEXT,
  heading_level INT CHECK (heading_level IN (1, 2, 3)),
  
  -- Asset reference for post/featured_post blocks
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Display settings for post blocks
  display_mode TEXT DEFAULT 'auto' CHECK (display_mode IN ('auto', 'fit', 'cover')),
  crop_position_x REAL DEFAULT 50,
  crop_position_y REAL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drop_blocks_drop_id ON drop_blocks(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_blocks_position ON drop_blocks(drop_id, position);
CREATE INDEX IF NOT EXISTS idx_drop_blocks_asset_id ON drop_blocks(asset_id);

-- Add use_blocks flag to drops table to track which mode a drop uses
ALTER TABLE drops ADD COLUMN IF NOT EXISTS use_blocks BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE drop_blocks IS 'Notion-like blocks for drop content (text, headings, posts, etc.)';
COMMENT ON COLUMN drop_blocks.type IS 'Block type: text, heading, post, featured_post, divider, quote';
COMMENT ON COLUMN drop_blocks.heading_level IS 'For heading blocks: 1=H1, 2=H2, 3=H3';
COMMENT ON COLUMN drops.use_blocks IS 'Whether this drop uses the new block-based editor';

-- RLS Policies for drop_blocks
ALTER TABLE drop_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocks for published drops" ON drop_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM drops 
    WHERE drops.id = drop_blocks.drop_id 
    AND drops.status = 'published'
  )
);

CREATE POLICY "Users can view blocks for own drafts" ON drop_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM drops 
    WHERE drops.id = drop_blocks.drop_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert blocks for own drops" ON drop_blocks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM drops 
    WHERE drops.id = drop_blocks.drop_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update blocks for own drops" ON drop_blocks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM drops 
    WHERE drops.id = drop_blocks.drop_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete blocks for own drops" ON drop_blocks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM drops 
    WHERE drops.id = drop_blocks.drop_id 
    AND drops.created_by = auth.uid()
  )
);
