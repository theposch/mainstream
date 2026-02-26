-- ============================================================================
-- FIX ASSETS RLS AND ADD TEXT FIELD CONSTRAINTS
-- ============================================================================
-- Migration: Split the permissive "Anyone can view assets" SELECT policy into
--            role-specific policies so unauthenticated PostgREST callers cannot
--            enumerate unlisted assets.
--
-- Background:
--   Migration 024 created a single SELECT policy with USING (true) that applies
--   to every role, including the PostgREST anon role. This means an
--   unauthenticated request to the Supabase REST API can read every row in the
--   assets table — including unlisted assets — bypassing the application-layer
--   visibility filter used by GET /api/assets.
--
--   The intent is:
--     public   → visible in feeds and discoverable
--     unlisted → accessible via direct link by any AUTHENTICATED user, but not
--                shown in feeds and not accessible without a session
--
-- Changes:
--   1. Drop the blanket "Anyone can view assets" SELECT policy.
--   2. Create a dedicated SELECT policy for the `authenticated` role that
--      preserves the existing behavior (all authenticated users can read all
--      assets, including unlisted ones accessed via direct link).
--   3. Create a dedicated SELECT policy for the `anon` role that restricts
--      visibility to public assets only.
--   4. Add length constraints on free-text columns to prevent runaway storage.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Fix assets SELECT RLS
-- ============================================================================

-- Remove the overly permissive blanket policy
DROP POLICY IF EXISTS "Anyone can view assets" ON assets;

-- Authenticated users retain full read access.
-- The application-layer feed route (GET /api/assets) already filters to
-- visibility = 'public'; this RLS policy intentionally permits authenticated
-- users to load unlisted assets directly (e.g. via /e/:id deep links or Drops).
DROP POLICY IF EXISTS "Authenticated users can view assets" ON assets;
CREATE POLICY "Authenticated users can view assets"
  ON assets FOR SELECT TO authenticated
  USING (true);

-- Unauthenticated (anon) access through PostgREST is now limited to public
-- assets. This closes the gap where a raw API call without a session could
-- enumerate unlisted assets. NULL values are treated as public for backwards
-- compatibility with rows predating migration 025.
DROP POLICY IF EXISTS "Anon users can view public assets" ON assets;
CREATE POLICY "Anon users can view public assets"
  ON assets FOR SELECT TO anon
  USING (visibility = 'public' OR visibility IS NULL);

-- ============================================================================
-- 2. Text field length constraints
-- ============================================================================
-- Using NOT VALID so existing data is not scanned — only future writes are
-- enforced. Run VALIDATE CONSTRAINT in a maintenance window if needed.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_asset_title_length'
      AND conrelid = 'assets'::regclass
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT check_asset_title_length
      CHECK (char_length(title) <= 500) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_asset_description_length'
      AND conrelid = 'assets'::regclass
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT check_asset_description_length
      CHECK (char_length(description) <= 5000) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_comment_content_length'
      AND conrelid = 'asset_comments'::regclass
  ) THEN
    ALTER TABLE asset_comments
      ADD CONSTRAINT check_comment_content_length
      CHECK (char_length(content) <= 10000) NOT VALID;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'assets' AND cmd = 'SELECT';
--
-- Expected: two SELECT policies
--   "Authenticated users can view assets" → roles: {authenticated} → USING (true)
--   "Anon users can view public assets"   → roles: {anon}          → USING (...)
-- ============================================================================
