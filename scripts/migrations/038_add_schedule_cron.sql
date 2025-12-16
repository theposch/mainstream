-- =====================================================
-- Drop Schedules - Background Job (pg_cron)
-- =====================================================
-- Creates PostgreSQL functions and pg_cron job for
-- automated schedule processing
--
-- To apply:
--   psql -h localhost -p 5432 -U postgres < 038_add_schedule_cron.sql
-- Or via Docker:
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/038_add_schedule_cron.sql
--
-- NOTE: pg_cron extension must be available in your PostgreSQL instance.
-- For self-hosted Supabase, this is typically pre-installed.

-- =====================================================
-- Helper Function: Calculate Next Run Time
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_frequency TEXT,
  p_day_of_week INT,
  p_day_of_month INT,
  p_custom_interval_days INT,
  p_generation_time TIME,
  p_timezone TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
  current_time_in_tz TIMESTAMP;
  target_time TIMESTAMP;
  days_until_target INT;
  current_dow INT;
BEGIN
  -- Get current time in the target timezone
  current_time_in_tz := (NOW() AT TIME ZONE p_timezone)::TIMESTAMP;
  
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Get current day of week (0=Sunday in PostgreSQL EXTRACT)
      current_dow := EXTRACT(DOW FROM current_time_in_tz)::INT;
      
      -- Calculate days until target day
      days_until_target := p_day_of_week - current_dow;
      IF days_until_target < 0 THEN
        days_until_target := days_until_target + 7;
      END IF;
      
      -- Build target timestamp
      target_time := date_trunc('day', current_time_in_tz) 
                     + (days_until_target || ' days')::interval 
                     + p_generation_time;
      
      -- If target is in the past or now, move to next week
      IF target_time <= current_time_in_tz THEN
        target_time := target_time + interval '7 days';
      END IF;
      
      next_run := target_time AT TIME ZONE p_timezone;
      
    WHEN 'biweekly' THEN
      current_dow := EXTRACT(DOW FROM current_time_in_tz)::INT;
      days_until_target := p_day_of_week - current_dow;
      IF days_until_target < 0 THEN
        days_until_target := days_until_target + 7;
      END IF;
      
      target_time := date_trunc('day', current_time_in_tz) 
                     + (days_until_target || ' days')::interval 
                     + p_generation_time;
      
      IF target_time <= current_time_in_tz THEN
        target_time := target_time + interval '14 days';
      END IF;
      
      next_run := target_time AT TIME ZONE p_timezone;
      
    WHEN 'monthly' THEN
      -- Start with current month, target day
      target_time := date_trunc('month', current_time_in_tz) 
                     + ((LEAST(p_day_of_month, 28) - 1) || ' days')::interval 
                     + p_generation_time;
      
      -- If target is in the past, move to next month
      IF target_time <= current_time_in_tz THEN
        target_time := date_trunc('month', current_time_in_tz + interval '1 month')
                       + ((LEAST(p_day_of_month, 28) - 1) || ' days')::interval 
                       + p_generation_time;
      END IF;
      
      next_run := target_time AT TIME ZONE p_timezone;
      
    WHEN 'custom' THEN
      -- Custom interval in days from now
      target_time := current_time_in_tz + (COALESCE(p_custom_interval_days, 7) || ' days')::interval;
      -- Set to generation time on that day
      target_time := date_trunc('day', target_time) + p_generation_time;
      
      next_run := target_time AT TIME ZONE p_timezone;
      
    ELSE
      -- Default to 7 days from now
      next_run := NOW() + interval '7 days';
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Main Function: Process Scheduled Drops
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
    
    -- Mark existing drafts for this schedule as superseded
    UPDATE drops 
    SET is_superseded = true 
    WHERE schedule_id = schedule.id 
      AND status = 'draft'
      AND is_superseded = false;
    
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
-- pg_cron Job Setup
-- =====================================================
-- Enable pg_cron extension (skip if not available)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available - skipping cron setup. You can run process_scheduled_drops() manually or via external scheduler.';
END $$;

-- Schedule the job to run every 15 minutes (only if pg_cron is available)
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('process-scheduled-drops');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Schedule new job
  PERFORM cron.schedule(
    'process-scheduled-drops',
    '*/15 * * * *',
    'SELECT process_scheduled_drops()'
  );
  RAISE NOTICE 'pg_cron job scheduled: process-scheduled-drops (every 15 minutes)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job. Run process_scheduled_drops() manually or via external scheduler.';
END $$;

-- =====================================================
-- Manual Trigger Function (for "Generate Now" button)
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
  
  -- Mark existing drafts as superseded
  UPDATE drops 
  SET is_superseded = true 
  WHERE schedule_id = schedule.id 
    AND status = 'draft'
    AND is_superseded = false;
  
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

