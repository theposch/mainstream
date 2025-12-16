-- =====================================================
-- Drop Schedules Feature - Database Schema
-- =====================================================
-- Creates tables for scheduled/recurring drops (series)
--
-- To apply:
--   psql -h localhost -p 5432 -U postgres < 029_add_drop_schedules.sql
-- Or via Docker:
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/029_add_drop_schedules.sql

-- =====================================================
-- Drop Schedules Table
-- =====================================================
-- Stores schedule configurations for recurring drops
CREATE TABLE IF NOT EXISTS drop_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity (becomes tab title)
  name TEXT NOT NULL,
  
  -- Schedule timing
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 31),
  custom_interval_days INT CHECK (custom_interval_days > 0),
  generation_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Content filters
  stream_ids UUID[] DEFAULT '{}',
  user_ids UUID[] DEFAULT '{}',
  date_range_mode TEXT NOT NULL DEFAULT 'last_n_days' CHECK (date_range_mode IN ('last_n_days', 'since_last')),
  date_range_days INT DEFAULT 7,
  
  -- State
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drop_schedules_created_by ON drop_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_drop_schedules_status ON drop_schedules(status);
CREATE INDEX IF NOT EXISTS idx_drop_schedules_next_run ON drop_schedules(next_run_at) WHERE status = 'active';

-- =====================================================
-- Modify Drops Table
-- =====================================================
-- Add schedule reference and superseded flag

-- Add schedule_id column to link drops to their schedule
ALTER TABLE drops ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES drop_schedules(id) ON DELETE SET NULL;

-- Add is_superseded flag for old drafts that were replaced by newer ones
ALTER TABLE drops ADD COLUMN IF NOT EXISTS is_superseded BOOLEAN DEFAULT FALSE;

-- Index for finding drops by schedule
CREATE INDEX IF NOT EXISTS idx_drops_schedule_id ON drops(schedule_id) WHERE schedule_id IS NOT NULL;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on drop_schedules table
ALTER TABLE drop_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own schedules
CREATE POLICY "Users can view own schedules"
  ON drop_schedules FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can create schedules
CREATE POLICY "Authenticated users can create schedules"
  ON drop_schedules FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own schedules
CREATE POLICY "Users can update own schedules"
  ON drop_schedules FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete their own schedules
CREATE POLICY "Users can delete own schedules"
  ON drop_schedules FOR DELETE
  USING (auth.uid() = created_by);

-- =====================================================
-- Updated At Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_drop_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_drop_schedules_updated_at
  BEFORE UPDATE ON drop_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_drop_schedules_updated_at();

-- =====================================================
-- Add new notification type for scheduled drops
-- =====================================================
-- Update the notifications type check constraint to include new type
-- First, drop the existing constraint if it exists
DO $$
BEGIN
  -- Check if the constraint exists before trying to drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check' 
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add updated constraint with new type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply', 'scheduled_drop_ready'));

