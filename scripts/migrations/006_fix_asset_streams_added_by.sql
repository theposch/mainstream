-- Migration: Fix asset_streams.added_by constraint contradiction
-- Date: 2025-11-27
-- Issue: added_by is NOT NULL but has ON DELETE SET NULL

-- The current constraint is contradictory:
-- Column is NOT NULL but foreign key has ON DELETE SET NULL
-- This will fail when trying to delete a user

-- Solution: Make added_by nullable since ON DELETE SET NULL is the desired behavior
ALTER TABLE asset_streams
ALTER COLUMN added_by DROP NOT NULL;

-- Add comment explaining the behavior
COMMENT ON COLUMN asset_streams.added_by IS 'User who added the asset to the stream. Set to NULL if user is deleted to preserve stream association history.';




