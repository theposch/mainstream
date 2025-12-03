-- =====================================================
-- Migration 013: Add 'comment' Notification Type
-- =====================================================
-- 
-- Adds 'comment' type for when someone comments on your post
-- =====================================================

-- Drop and recreate the constraint with the new type
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like_asset', 'like_comment', 'reply_comment', 'follow', 'mention', 'comment'));

