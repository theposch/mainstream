-- =====================================================
-- Migration 011: Add RLS Policies for Notifications Table
-- =====================================================
-- 
-- Issue: The notifications table had RLS enabled but no policies defined,
-- causing all notification inserts to silently fail.
--
-- This migration adds the necessary policies to allow:
-- - Users to read their own notifications (recipient)
-- - Users to create notifications when they are the actor
-- - Users to update their own notifications (mark as read)
-- - Users to delete their own notifications
-- =====================================================

-- Policy: Users can read notifications where they are the recipient
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- Policy: Authenticated users can create notifications (must be the actor)
-- This allows users to create notifications about their own actions
CREATE POLICY "Users can create notifications as actor"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- Policy: Users can update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- =====================================================
-- Enable Realtime for notifications (for live updates)
-- =====================================================

-- REPLICA IDENTITY FULL is required for Supabase Realtime to filter
-- by non-primary-key columns (like recipient_id)
ALTER TABLE notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

