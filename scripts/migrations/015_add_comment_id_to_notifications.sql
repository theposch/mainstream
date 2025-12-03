-- =====================================================
-- Migration 015: Add comment_id to Notifications
-- =====================================================
-- 
-- Adds comment_id column to link notifications to specific comments
-- for scroll-to and highlight functionality (like Slack)
-- =====================================================

ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES asset_comments(id) ON DELETE SET NULL;

-- Index for faster lookups when fetching notification context
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON notifications(comment_id) WHERE comment_id IS NOT NULL;

