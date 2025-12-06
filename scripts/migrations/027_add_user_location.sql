-- Migration: Add location column to users table
-- This allows users to display their location on their profile

-- Add location column
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;

-- Comment for documentation
COMMENT ON COLUMN users.location IS 'User location (e.g., "San Francisco, CA")';

