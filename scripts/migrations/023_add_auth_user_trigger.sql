-- Create a trigger to automatically create a public.users entry when someone signs up

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_display_name TEXT;
  base_username TEXT;
  username_exists BOOLEAN;
  retry_count INT := 0;
  max_retries INT := 10;
BEGIN
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

  INSERT INTO public.users (id, email, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    new_username,
    new_display_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://avatar.vercel.sh/' || new_username || '.png')
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If user already exists (shouldn't happen), update their info
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a public.users entry when a new auth user signs up';
