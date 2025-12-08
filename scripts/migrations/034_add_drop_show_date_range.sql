-- Migration: Add show_date_range field to drops
-- This allows users to toggle whether the date range is displayed in the drop

ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS show_date_range BOOLEAN DEFAULT true;

-- Comment for documentation
COMMENT ON COLUMN drops.show_date_range IS 'Whether to display the date range in the published drop';

