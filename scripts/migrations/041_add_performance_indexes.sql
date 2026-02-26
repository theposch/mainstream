-- Migration 041: Add performance indexes
--
-- Adds composite and partial indexes identified as missing during code review.
-- All indexes are created with IF NOT EXISTS to be safe to re-run.

-- notifications: filter by type within a recipient's notification list
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type
  ON notifications (recipient_id, type, created_at DESC);

-- drops: look up draft(s) for a given schedule quickly
CREATE INDEX IF NOT EXISTS idx_drops_schedule_id_status
  ON drops (schedule_id, status)
  WHERE schedule_id IS NOT NULL;

-- drop_blocks: fetch and order blocks for a drop
CREATE INDEX IF NOT EXISTS idx_drop_blocks_drop_position
  ON drop_blocks (drop_id, position);

-- asset_streams: look up streams for a batch of assets (used in drop grouping)
CREATE INDEX IF NOT EXISTS idx_asset_streams_asset_id
  ON asset_streams (asset_id);

-- asset_streams: look up assets in a stream
CREATE INDEX IF NOT EXISTS idx_asset_streams_stream_id
  ON asset_streams (stream_id);

-- asset_views: range queries on viewed_at within an asset (analytics)
CREATE INDEX IF NOT EXISTS idx_asset_views_asset_viewed
  ON asset_views (asset_id, viewed_at DESC);

-- asset_likes: fast lookup of a user's likes across a set of assets (batch like status)
CREATE INDEX IF NOT EXISTS idx_asset_likes_user_asset
  ON asset_likes (user_id, asset_id);

-- comment_likes: fast lookup of a user's likes across a set of comments
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment
  ON comment_likes (user_id, comment_id);
