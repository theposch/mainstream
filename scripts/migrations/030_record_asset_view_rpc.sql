-- =====================================================
-- Migration 030: Atomic record_asset_view RPC function
-- =====================================================
-- 
-- Replaces the separate INSERT + increment_view_count calls
-- with a single atomic operation that:
-- 1. Verifies asset exists
-- 2. Skips owner views
-- 3. Inserts view record (ON CONFLICT DO NOTHING for duplicates)
-- 4. Increments view_count only for new views
-- 
-- This ensures consistency and reduces round-trips.
-- =====================================================

-- Create atomic stored procedure for recording views
CREATE OR REPLACE FUNCTION record_asset_view(
  p_asset_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uploader_id UUID;
  v_row_count INTEGER;
  v_view_count INTEGER;
BEGIN
  -- Get asset owner (and verify asset exists)
  SELECT uploader_id INTO v_uploader_id
  FROM assets
  WHERE id = p_asset_id;
  
  IF v_uploader_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found');
  END IF;
  
  -- Don't count owner's own views
  IF v_uploader_id = p_user_id THEN
    RETURN jsonb_build_object('success', true, 'is_owner', true, 'counted', false);
  END IF;
  
  -- Try to insert new view (will do nothing if exists due to ON CONFLICT)
  INSERT INTO asset_views (asset_id, user_id, viewed_at)
  VALUES (p_asset_id, p_user_id, NOW())
  ON CONFLICT (asset_id, user_id) DO NOTHING;
  
  -- Check if a row was actually inserted
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  
  -- If new view was inserted, increment count
  IF v_row_count > 0 THEN
    UPDATE assets
    SET view_count = view_count + 1
    WHERE id = p_asset_id
    RETURNING view_count INTO v_view_count;
    
    RETURN jsonb_build_object(
      'success', true,
      'is_new_view', true,
      'view_count', v_view_count
    );
  ELSE
    -- Existing view - just return success (no timestamp update needed)
    SELECT view_count INTO v_view_count
    FROM assets
    WHERE id = p_asset_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'is_new_view', false,
      'view_count', v_view_count
    );
  END IF;
END;
$$;

-- Grant execute to service_role and authenticated users
GRANT EXECUTE ON FUNCTION record_asset_view(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION record_asset_view(UUID, UUID) TO authenticated;

-- Add documentation
COMMENT ON FUNCTION record_asset_view(UUID, UUID) IS 'Atomically records an asset view. Returns success status, whether it was a new view, and current view count.';
