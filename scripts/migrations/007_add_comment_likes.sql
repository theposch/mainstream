-- Migration: Add Comment Likes Table
-- Created: 2025-11-27
-- Description: Adds comment_likes table to enable users to like comments

-- Comment Likes Table
-- Tracks which users have liked which comments
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id UUID NOT NULL REFERENCES asset_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Comments
COMMENT ON TABLE comment_likes IS 'Tracks which users have liked which comments';
COMMENT ON COLUMN comment_likes.comment_id IS 'ID of the comment being liked';
COMMENT ON COLUMN comment_likes.user_id IS 'ID of the user who liked the comment';
COMMENT ON COLUMN comment_likes.created_at IS 'When the like was created';

