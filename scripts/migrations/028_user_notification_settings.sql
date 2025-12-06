-- =====================================================
-- Migration 028: User Notification Settings Table
-- =====================================================
-- 
-- Stores user preferences for in-app notifications.
-- Each notification type can be individually toggled.
-- Settings are created with defaults when user first accesses them.
-- =====================================================

-- Create user_notification_settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Master toggle for all in-app notifications
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Individual notification type toggles
  likes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  comments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  follows_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mentions_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE user_notification_settings IS 'Stores user preferences for in-app notifications';
COMMENT ON COLUMN user_notification_settings.in_app_enabled IS 'Master toggle - if false, no in-app notifications are created';
COMMENT ON COLUMN user_notification_settings.likes_enabled IS 'Receive notifications when someone likes your content';
COMMENT ON COLUMN user_notification_settings.comments_enabled IS 'Receive notifications for comments and replies';
COMMENT ON COLUMN user_notification_settings.follows_enabled IS 'Receive notifications when someone follows you';
COMMENT ON COLUMN user_notification_settings.mentions_enabled IS 'Receive notifications when mentioned in comments';

-- Create trigger for updated_at
CREATE TRIGGER update_user_notification_settings_updated_at 
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read notification settings
-- This is needed because when checking if we should send a notification to user B,
-- we're authenticated as user A (the actor), and need to read user B's settings.
-- Notification preferences are not sensitive data.
CREATE POLICY "Authenticated users can read notification settings"
  ON user_notification_settings FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own settings (for first-time setup)
CREATE POLICY "Users can create own notification settings"
  ON user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own notification settings"
  ON user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own settings (will cascade on user deletion anyway)
CREATE POLICY "Users can delete own notification settings"
  ON user_notification_settings FOR DELETE
  USING (auth.uid() = user_id);

