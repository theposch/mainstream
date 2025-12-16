-- =====================================================
-- Fix Schedule Cron - Use API Endpoint for Full Processing
-- =====================================================
-- The previous SQL-only approach couldn't populate blocks.
-- This migration updates the cron to call an API endpoint
-- that handles the full drop generation with content.
--
-- To apply:
--   docker exec -i supabase_db_cosmos psql -U postgres < scripts/migrations/032_fix_schedule_cron.sql

-- =====================================================
-- Update: Process Scheduled Drops Function
-- =====================================================
-- This simplified function just marks schedules as processed
-- and creates basic drops. For full content generation,
-- call POST /api/cron/process-schedules externally.

CREATE OR REPLACE FUNCTION process_scheduled_drops()
RETURNS void AS $$
DECLARE
  schedule RECORD;
  new_drop_id UUID;
  date_start TIMESTAMPTZ;
  date_end TIMESTAMPTZ;
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
      date_start := COALESCE(schedule.last_run_at, NOW() - interval '7 days');
    END IF;
    
    -- DELETE existing draft for this schedule
    DELETE FROM drops 
    WHERE schedule_id = schedule.id 
      AND status = 'draft';
    
    -- Create new draft drop (blocks will be empty - user can regenerate via UI)
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
    
    -- Update schedule
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
-- Add: Regenerate Drop Content Function
-- =====================================================
-- Called when opening an empty scheduled drop to populate its content
-- This provides a SQL fallback if the API endpoint isn't available

CREATE OR REPLACE FUNCTION regenerate_drop_content(p_drop_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  drop_record RECORD;
  asset_record RECORD;
  block_position INT := 0;
  current_stream_id UUID := NULL;
  current_stream_name TEXT := NULL;
BEGIN
  -- Get the drop
  SELECT * INTO drop_record FROM drops WHERE id = p_drop_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Delete existing blocks
  DELETE FROM drop_blocks WHERE drop_id = p_drop_id;
  
  -- Get assets in date range, grouped by stream
  FOR asset_record IN 
    SELECT 
      a.id as asset_id,
      COALESCE(s.id, '00000000-0000-0000-0000-000000000000'::uuid) as stream_id,
      COALESCE(s.name, 'Other') as stream_name
    FROM assets a
    LEFT JOIN asset_streams ast ON ast.asset_id = a.id
    LEFT JOIN streams s ON s.id = ast.stream_id
    WHERE a.created_at >= drop_record.date_range_start
      AND a.created_at <= drop_record.date_range_end
      AND (
        drop_record.filter_user_ids IS NULL 
        OR array_length(drop_record.filter_user_ids, 1) IS NULL
        OR a.uploader_id = ANY(drop_record.filter_user_ids)
      )
      AND (
        drop_record.filter_stream_ids IS NULL
        OR array_length(drop_record.filter_stream_ids, 1) IS NULL
        OR s.id = ANY(drop_record.filter_stream_ids)
      )
    ORDER BY stream_name, a.created_at DESC
  LOOP
    -- Add heading when stream changes
    IF current_stream_id IS DISTINCT FROM asset_record.stream_id THEN
      current_stream_id := asset_record.stream_id;
      current_stream_name := asset_record.stream_name;
      
      INSERT INTO drop_blocks (drop_id, type, content, heading_level, position)
      VALUES (p_drop_id, 'heading', current_stream_name, 2, block_position);
      block_position := block_position + 1;
    END IF;
    
    -- Add post block
    INSERT INTO drop_blocks (drop_id, type, asset_id, position)
    VALUES (p_drop_id, 'post', asset_record.asset_id, block_position);
    block_position := block_position + 1;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Note on External Cron Setup
-- =====================================================
-- For full content generation (with blocks), set up an external cron
-- to call the API endpoint every 15 minutes:
--
-- URL: POST /api/cron/process-schedules
-- Header: Authorization: Bearer <CRON_SECRET>
--
-- Example with curl:
--   curl -X POST https://your-domain.com/api/cron/process-schedules \
--        -H "Authorization: Bearer your-cron-secret"
--
-- The pg_cron SQL fallback creates empty drops that users can
-- manually populate via the "Generate Now" button in the UI.


