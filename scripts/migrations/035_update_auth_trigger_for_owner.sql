-- ============================================================================
-- UPDATE AUTH TRIGGER FOR FIRST USER AS OWNER
-- ============================================================================
-- Migration: Update handle_new_user() to set first user as owner
-- Date: 2025-12-08
-- Purpose: Automatically make the first user to sign up the platform owner
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres -d postgres < scripts/migrations/035_update_auth_trigger_for_owner.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- Update the handle_new_user function to set first user as owner
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_display_name TEXT;
  base_username TEXT;
  username_exists BOOLEAN;
  retry_count INT := 0;
  max_retries INT := 10;
  user_count INT;
  new_platform_role TEXT := 'user';
BEGIN
  -- Check if this is the first user (will be owner)
  SELECT COUNT(*) INTO user_count FROM public.users;
  IF user_count = 0 THEN
    new_platform_role := 'owner';
  END IF;

  -- Get username from metadata, fallback to email prefix
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    LOWER(SPLIT_PART(NEW.email, '@', 1))
  );
  
  -- Sanitize username: remove invalid characters (only allow a-z, 0-9, _, -)
  -- Replace invalid chars with underscore, then collapse multiple underscores
  new_username := LOWER(regexp_replace(new_username, '[^a-z0-9_-]', '_', 'g'));
  new_username := regexp_replace(new_username, '_+', '_', 'g');
  new_username := regexp_replace(new_username, '^_|_$', '', 'g'); -- trim leading/trailing underscores
  
  -- Ensure username meets length requirements (3-30 chars)
  IF char_length(new_username) < 3 THEN
    new_username := new_username || '_user';
  END IF;
  IF char_length(new_username) > 30 THEN
    new_username := substring(new_username from 1 for 30);
  END IF;
  
  -- Store base username for collision handling
  base_username := new_username;
  
  -- Check for username collisions and generate unique username if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.users WHERE username = new_username) INTO username_exists;
    
    IF NOT username_exists THEN
      EXIT; -- Username is unique, exit loop
    END IF;
    
    retry_count := retry_count + 1;
    IF retry_count > max_retries THEN
      -- Fallback to UUID-based username if too many collisions
      new_username := 'user_' || substring(gen_random_uuid()::text from 1 for 8);
      EXIT;
    END IF;
    
    -- Append random suffix (keep within 30 char limit)
    IF char_length(base_username) > 25 THEN
      new_username := substring(base_username from 1 for 25) || '_' || floor(random() * 9999)::text;
    ELSE
      new_username := base_username || '_' || floor(random() * 9999)::text;
    END IF;
  END LOOP;
  
  -- Get display_name from metadata, fallback to email prefix (no sanitization needed for display)
  new_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, username, display_name, avatar_url, platform_role)
  VALUES (
    NEW.id,
    NEW.email,
    new_username,
    new_display_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://avatar.vercel.sh/' || new_username || '.png'),
    new_platform_role
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If user already exists (shouldn't happen), update their info
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Track migration
-- ============================================================================

INSERT INTO schema_migrations (version, name) 
VALUES (35, '035_update_auth_trigger_for_owner')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- The trigger will now automatically set the first user as owner.
-- Test by checking the function definition:
--   \df+ public.handle_new_user
-- ============================================================================

