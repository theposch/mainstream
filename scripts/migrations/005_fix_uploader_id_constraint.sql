-- Migration: Fix uploader_id constraint contradiction
-- Date: 2025-11-27
-- Issue: uploader_id is NOT NULL but has ON DELETE SET NULL

-- The current constraint is contradictory:
-- Column is NOT NULL but foreign key has ON DELETE SET NULL
-- This will fail when trying to delete a user

-- Solution: Make uploader_id nullable since ON DELETE SET NULL is the desired behavior
-- This allows assets to remain when a user is deleted, with uploader_id set to NULL

ALTER TABLE assets
ALTER COLUMN uploader_id DROP NOT NULL;

-- Add comment explaining the behavior
COMMENT ON COLUMN assets.uploader_id IS 'User who uploaded the asset. Set to NULL if user is deleted to preserve asset history.';




