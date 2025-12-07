-- =====================================================
-- Migration 029: Add RPC function for incrementing view count
-- =====================================================
-- 
-- The AFTER INSERT trigger on asset_views doesn't fire reliably
-- when using Supabase JS client. This RPC function provides a
-- direct way to increment the view count.
-- =====================================================

-- Create RPC function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(asset_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE assets
  SET view_count = view_count + 1
  WHERE id = asset_id;
END;
$$;

-- Grant execute to service_role (used by admin client)
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_view_count(UUID) IS 'Increments the view_count for an asset. Called from API after recording a new view.';

