-- =====================================================
-- Migration 014: Add Content Column to Notifications
-- =====================================================
-- 
-- Adds a content column to store preview text for notifications
-- (e.g., comment preview, mention context)
-- =====================================================

ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS content TEXT;

