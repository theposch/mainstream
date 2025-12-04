-- Add RLS policies for assets table
-- These were missing from the original schema

-- Everyone can view assets
CREATE POLICY "Anyone can view assets" ON assets
FOR SELECT USING (true);

-- Authenticated users can insert assets
CREATE POLICY "Authenticated users can insert assets" ON assets
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own assets
CREATE POLICY "Users can update own assets" ON assets
FOR UPDATE USING (uploader_id = auth.uid());

-- Users can delete their own assets
CREATE POLICY "Users can delete own assets" ON assets
FOR DELETE USING (uploader_id = auth.uid());

-- Similar policies for related tables that might be missing

-- asset_streams
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_streams' AND policyname = 'Anyone can view asset_streams') THEN
    CREATE POLICY "Anyone can view asset_streams" ON asset_streams FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_streams' AND policyname = 'Authenticated users can insert asset_streams') THEN
    CREATE POLICY "Authenticated users can insert asset_streams" ON asset_streams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- asset_likes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_likes' AND policyname = 'Anyone can view likes') THEN
    CREATE POLICY "Anyone can view likes" ON asset_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_likes' AND policyname = 'Users can manage own likes') THEN
    CREATE POLICY "Users can manage own likes" ON asset_likes FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- asset_comments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_comments' AND policyname = 'Anyone can view comments') THEN
    CREATE POLICY "Anyone can view comments" ON asset_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_comments' AND policyname = 'Authenticated users can insert comments') THEN
    CREATE POLICY "Authenticated users can insert comments" ON asset_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_comments' AND policyname = 'Users can update own comments') THEN
    CREATE POLICY "Users can update own comments" ON asset_comments FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_comments' AND policyname = 'Users can delete own comments') THEN
    CREATE POLICY "Users can delete own comments" ON asset_comments FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Users policies
CREATE POLICY IF NOT EXISTS "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());

-- Teams policies  
CREATE POLICY IF NOT EXISTS "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Team owners can update teams" ON teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'owner')
);
CREATE POLICY IF NOT EXISTS "Team owners can delete teams" ON teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'owner')
);

-- Team members policies
CREATE POLICY IF NOT EXISTS "Anyone can view team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can join teams" ON team_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Members can leave teams" ON team_members FOR DELETE USING (user_id = auth.uid());

