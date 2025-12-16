-- =====================================================
-- Simplify Schedule Drafts - Only 1 Draft Per Series
-- =====================================================
-- Changes the logic from "mark as superseded" to "delete and replace"
-- This ensures there's only ever 1 auto-generated draft per schedule
--
-- To apply:
--   psql -h localhost -p 5432 -U postgres < 031_simplify_schedule_drafts.sql
-- Or via Docker:
--   docker exec -i supabase_db_cosmos psql -U postgres < scripts/migrations/031_simplify_schedule_drafts.sql

-- =====================================================
-- Update: Process Scheduled Drops Function
-- =====================================================
CREATE OR REPLACE FUNCTION process_scheduled_drops()
RETURNS void AS $$
DECLARE
  schedule RECORD;
  new_drop_id UUID;
  date_start TIMESTAMPTZ;
  date_end TIMESTAMPTZ;
  drop_title TEXT;
BEGIN
  -- Loop through all active schedules that are due
  FOR schedule IN 
    SELECT * FROM drop_schedules 
    WHERE status = 'active' 
      AND next_run_at IS NOT NULL 
      AND next_run_at <= NOW()
  LOOP
    -- Calculate date range for content
    date_end := NOW();
    IF schedule.date_range_mode = 'last_n_days' THEN
      date_start := NOW() - (COALESCE(schedule.date_range_days, 7) || ' days')::interval;
    ELSE
      -- 'since_last' mode: from last run, or 7 days if never run
      date_start := COALESCE(schedule.last_run_at, NOW() - interval '7 days');
    END IF;
    
    -- Generate title with date
    drop_title := schedule.name;
    
    -- DELETE existing draft for this schedule (only 1 draft per series)
    -- drop_blocks are cascade deleted due to foreign key
    DELETE FROM drops 
    WHERE schedule_id = schedule.id 
      AND status = 'draft';
    
    -- Create new draft drop
    INSERT INTO drops (
      title,
      schedule_id,
      created_by,
      status,
      use_blocks,
      date_range_start,
      date_range_end,
      filter_stream_ids,
      filter_user_ids
    )
    VALUES (
      drop_title,
      schedule.id,
      schedule.created_by,
      'draft',
      true,
      date_start,
      date_end,
      schedule.stream_ids,
      schedule.user_ids
    )
    RETURNING id INTO new_drop_id;
    
    -- Create notification for the user
    INSERT INTO notifications (
      type,
      recipient_id,
      actor_id,
      resource_type,
      resource_id,
      content
    )
    VALUES (
      'scheduled_drop_ready',
      schedule.created_by,
      schedule.created_by,
      'drop',
      new_drop_id,
      'Your ' || schedule.name || ' is ready to review'
    );
    
    -- Update schedule with last run time and calculate next run
    UPDATE drop_schedules 
    SET 
      last_run_at = NOW(), 
      next_run_at = calculate_next_run(
        schedule.frequency, 
        schedule.day_of_week, 
        schedule.day_of_month,
        schedule.custom_interval_days,
        schedule.generation_time, 
        schedule.timezone
      )
    WHERE id = schedule.id;
    
    RAISE NOTICE 'Processed schedule: % (%), created drop: %', 
                 schedule.name, schedule.id, new_drop_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Update: Manual Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_schedule_now(p_schedule_id UUID)
RETURNS UUID AS $$
DECLARE
  schedule RECORD;
  new_drop_id UUID;
  date_start TIMESTAMPTZ;
  date_end TIMESTAMPTZ;
BEGIN
  -- Get the schedule
  SELECT * INTO schedule FROM drop_schedules WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found: %', p_schedule_id;
  END IF;
  
  -- Calculate date range
  date_end := NOW();
  IF schedule.date_range_mode = 'last_n_days' THEN
    date_start := NOW() - (COALESCE(schedule.date_range_days, 7) || ' days')::interval;
  ELSE
    date_start := COALESCE(schedule.last_run_at, NOW() - interval '7 days');
  END IF;
  
  -- DELETE existing draft for this schedule (only 1 draft per series)
  -- drop_blocks are cascade deleted due to foreign key
  DELETE FROM drops 
  WHERE schedule_id = schedule.id 
    AND status = 'draft';
  
  -- Create new draft drop
  INSERT INTO drops (
    title,
    schedule_id,
    created_by,
    status,
    use_blocks,
    date_range_start,
    date_range_end,
    filter_stream_ids,
    filter_user_ids
  )
  VALUES (
    schedule.name,
    schedule.id,
    schedule.created_by,
    'draft',
    true,
    date_start,
    date_end,
    schedule.stream_ids,
    schedule.user_ids
  )
  RETURNING id INTO new_drop_id;
  
  -- Create notification
  INSERT INTO notifications (
    type,
    recipient_id,
    actor_id,
    resource_type,
    resource_id,
    content
  )
  VALUES (
    'scheduled_drop_ready',
    schedule.created_by,
    schedule.created_by,
    'drop',
    new_drop_id,
    'Your ' || schedule.name || ' is ready to review'
  );
  
  -- Update last_run_at but keep next_run_at unchanged
  UPDATE drop_schedules 
  SET last_run_at = NOW()
  WHERE id = schedule.id;
  
  RETURN new_drop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Cleanup: Remove any superseded drafts
-- =====================================================
-- Delete any existing superseded drafts to clean up old data
DELETE FROM drops WHERE is_superseded = true AND status = 'draft';

-- Note: The is_superseded column is kept for now but no longer used.
-- It can be removed in a future migration if desired.

