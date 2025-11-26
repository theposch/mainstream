-- =====================================================
-- Cosmos Application - Initial Database Schema
-- =====================================================
-- This migration creates all necessary tables for the Cosmos application
-- Run after Supabase is set up and running
--
-- To apply:
--   psql -h localhost -p 5432 -U postgres < 001_initial_schema.sql
-- Or via Docker:
--   docker-compose exec db psql -U postgres < 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- Core Tables
-- =====================================================

-- Users Table
-- Stores user profiles and authentication data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Teams Table
-- Stores team/organization information
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT team_slug_length CHECK (char_length(slug) BETWEEN 2 AND 50),
  CONSTRAINT team_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Team Members Table
-- Many-to-many relationship between teams and users
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Indexes for team member lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- =====================================================
-- Streams Feature
-- =====================================================

-- Streams Table
-- Organizational units for grouping assets (replaces projects)
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- Slug format: lowercase, hyphens, alphanumeric only
  description TEXT,
  cover_image_url TEXT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'team')),
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure name is valid slug format
  CONSTRAINT valid_stream_name 
    CHECK (name ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT stream_name_length 
    CHECK (char_length(name) BETWEEN 2 AND 50)
);

-- Index for fast slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_streams_name ON streams(name);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_streams_owner ON streams(owner_type, owner_id) WHERE status = 'active';

-- Stream Members Table
-- Tracks followers/contributors to streams
CREATE TABLE IF NOT EXISTS stream_members (
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_members_stream_id ON stream_members(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_members_user_id ON stream_members(user_id);

-- Stream Resources Table
-- Pinned external resources (Figma, Jira, PRDs, etc.)
CREATE TABLE IF NOT EXISTS stream_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('figma', 'jira', 'notion', 'prd', 'other')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_resources_stream_id ON stream_resources(stream_id);

-- =====================================================
-- Assets & Media
-- =====================================================

-- Assets Table
-- Stores uploaded files and design assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'link')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  dominant_color TEXT,
  color_palette TEXT[],     -- Array of hex colors (extracted automatically)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for uploader lookups
CREATE INDEX IF NOT EXISTS idx_assets_uploader_id ON assets(uploader_id);

-- Index for color search (using GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_assets_color_palette ON assets USING GIN (color_palette);

-- Index for recent assets
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- Asset Streams Junction Table
-- Many-to-many relationship between assets and streams
CREATE TABLE IF NOT EXISTS asset_streams (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (asset_id, stream_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_streams_asset_id ON asset_streams(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_streams_stream_id ON asset_streams(stream_id);

-- Asset Likes Table
-- Tracks user likes on assets
CREATE TABLE IF NOT EXISTS asset_likes (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_likes_asset_id ON asset_likes(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_likes_user_id ON asset_likes(user_id);

-- Asset Comments Table
-- Comment system with threading support
CREATE TABLE IF NOT EXISTS asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT comment_content_length CHECK (char_length(content) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_user_id ON asset_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_parent_id ON asset_comments(parent_id);

-- =====================================================
-- Social Features
-- =====================================================

-- User Follows Table
-- Tracks user following relationships
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

-- Notifications Table
-- Activity feed for users
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('like_asset', 'like_comment', 'reply_comment', 'follow', 'mention')),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID,
  resource_type TEXT CHECK (resource_type IN ('asset', 'comment', 'user', 'stream')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_comments_updated_at BEFORE UPDATE ON asset_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Functions for common queries
-- =====================================================

-- Function to get asset with like count and user like status
CREATE OR REPLACE FUNCTION get_asset_with_likes(asset_uuid UUID, user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  likes_count BIGINT,
  user_has_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.url,
    COUNT(al.user_id) AS likes_count,
    CASE 
      WHEN user_uuid IS NOT NULL THEN EXISTS(
        SELECT 1 FROM asset_likes WHERE asset_id = a.id AND user_id = user_uuid
      )
      ELSE FALSE
    END AS user_has_liked
  FROM assets a
  LEFT JOIN asset_likes al ON a.id = al.asset_id
  WHERE a.id = asset_uuid
  GROUP BY a.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Row Level Security (RLS) Setup
-- =====================================================
-- Note: RLS policies should be configured in Supabase Studio
-- or via separate migration for production security

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for streams (public streams are visible to all)
CREATE POLICY "Public streams are visible to everyone" 
  ON streams FOR SELECT 
  USING (is_private = FALSE);

-- Example RLS policy for streams (private streams only visible to owner/members)
CREATE POLICY "Private streams visible to owner and members" 
  ON streams FOR SELECT 
  USING (
    is_private = TRUE AND (
      (owner_type = 'user' AND owner_id = auth.uid()) OR
      (owner_type = 'team' AND EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = owner_id AND user_id = auth.uid()
      ))
    )
  );

-- =====================================================
-- Initial Data / Seed Data
-- =====================================================
-- Seed data should be inserted via separate migration or seed script

-- =====================================================
-- Schema Version Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, name) 
VALUES (1, '001_initial_schema')
ON CONFLICT (version) DO NOTHING;

-- =====================================================
-- End of Migration
-- =====================================================

