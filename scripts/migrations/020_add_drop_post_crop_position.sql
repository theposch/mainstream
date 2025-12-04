-- Add crop position fields to drop_posts for adjustable image cropping
ALTER TABLE drop_posts 
ADD COLUMN IF NOT EXISTS crop_position_x REAL DEFAULT 50,
ADD COLUMN IF NOT EXISTS crop_position_y REAL DEFAULT 0;

COMMENT ON COLUMN drop_posts.crop_position_x IS 'Horizontal crop position (0-100%), 50 = center';
COMMENT ON COLUMN drop_posts.crop_position_y IS 'Vertical crop position (0-100%), 0 = top';
