-- Add image_gallery block type and supporting table

-- First, we need to update the CHECK constraint on drop_blocks.type
-- Drop existing constraint and recreate with new type
ALTER TABLE drop_blocks DROP CONSTRAINT IF EXISTS drop_blocks_type_check;
ALTER TABLE drop_blocks ADD CONSTRAINT drop_blocks_type_check 
  CHECK (type IN ('text', 'heading', 'post', 'featured_post', 'divider', 'quote', 'image_gallery'));

-- Add gallery layout column (grid or featured)
ALTER TABLE drop_blocks 
ADD COLUMN IF NOT EXISTS gallery_layout TEXT DEFAULT 'grid' 
CHECK (gallery_layout IN ('grid', 'featured'));

-- Add featured image index for galleries (which image is featured in 'featured' layout)
ALTER TABLE drop_blocks 
ADD COLUMN IF NOT EXISTS gallery_featured_index INT DEFAULT 0;

-- Create table for gallery images (many-to-many between blocks and assets)
CREATE TABLE IF NOT EXISTS drop_block_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES drop_blocks(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(block_id, asset_id)
);

-- Indexes for gallery images
CREATE INDEX IF NOT EXISTS idx_drop_block_gallery_images_block_id ON drop_block_gallery_images(block_id);
CREATE INDEX IF NOT EXISTS idx_drop_block_gallery_images_position ON drop_block_gallery_images(block_id, position);

-- Comments
COMMENT ON COLUMN drop_blocks.gallery_layout IS 'Layout mode for image_gallery blocks: grid (2x2) or featured (1 large + thumbnails)';
COMMENT ON COLUMN drop_blocks.gallery_featured_index IS 'Index of the featured image in featured layout mode';
COMMENT ON TABLE drop_block_gallery_images IS 'Images within an image_gallery block';

-- RLS Policies for drop_block_gallery_images
ALTER TABLE drop_block_gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery images for published drops" ON drop_block_gallery_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM drop_blocks 
    JOIN drops ON drops.id = drop_blocks.drop_id
    WHERE drop_blocks.id = drop_block_gallery_images.block_id 
    AND drops.status = 'published'
  )
);

CREATE POLICY "Users can view gallery images for own drafts" ON drop_block_gallery_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM drop_blocks 
    JOIN drops ON drops.id = drop_blocks.drop_id
    WHERE drop_blocks.id = drop_block_gallery_images.block_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert gallery images for own drops" ON drop_block_gallery_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM drop_blocks 
    JOIN drops ON drops.id = drop_blocks.drop_id
    WHERE drop_blocks.id = drop_block_gallery_images.block_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update gallery images for own drops" ON drop_block_gallery_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM drop_blocks 
    JOIN drops ON drops.id = drop_blocks.drop_id
    WHERE drop_blocks.id = drop_block_gallery_images.block_id 
    AND drops.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete gallery images for own drops" ON drop_block_gallery_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM drop_blocks 
    JOIN drops ON drops.id = drop_blocks.drop_id
    WHERE drop_blocks.id = drop_block_gallery_images.block_id 
    AND drops.created_by = auth.uid()
  )
);

