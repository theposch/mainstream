-- Add display_mode to drop_posts for controlling image fit/crop behavior
ALTER TABLE drop_posts 
ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'auto' 
CHECK (display_mode IN ('auto', 'fit', 'cover'));

COMMENT ON COLUMN drop_posts.display_mode IS 'How to display the image: auto (smart detection), fit (show all), cover (crop to fill)';
