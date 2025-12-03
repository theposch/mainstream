-- =====================================================
-- Migration 012: Enable Realtime for Comments and Comment Likes
-- =====================================================
-- 
-- Enables real-time updates for:
-- - asset_comments: Live comment updates
-- - comment_likes: Live like count updates
--
-- Both tables use filters on non-PK columns, so they need
-- REPLICA IDENTITY FULL for Supabase Realtime to work.
-- =====================================================

-- Enable REPLICA IDENTITY FULL for filtered subscriptions
ALTER TABLE asset_comments REPLICA IDENTITY FULL;
ALTER TABLE comment_likes REPLICA IDENTITY FULL;

-- Add tables to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE asset_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;

