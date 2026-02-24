-- Migration 044: Harden Supabase Storage bucket configuration
--
-- Ensures the `assets` and `avatars` storage buckets exist and are correctly
-- configured. Uses ON CONFLICT DO UPDATE so it is safe to re-run.
--
-- Buckets:
--   assets  — uploaded images / WebM videos (max 50 MB)
--   avatars — user profile pictures (max 5 MB)
--
-- RLS policies are created idempotently via the DO $$ … $$ block.

-- ── Bucket definitions ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  52428800,   -- 50 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,    -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Row-Level Security policies (idempotent) ──────────────────────────────────

DO $$
BEGIN

  -- assets: authenticated users can upload to their own folder (<uid>/…)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload to assets bucket'
  ) THEN
    CREATE POLICY "Users can upload to assets bucket"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- assets: server-side service role can upload on behalf of any user
  -- (handled by service_role key bypassing RLS — no explicit policy needed)

  -- assets: publicly readable (bucket is public; policy is belt-and-suspenders)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Assets are publicly readable'
  ) THEN
    CREATE POLICY "Assets are publicly readable"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'assets');
  END IF;

  -- assets: owners and admins/owners can delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete their own assets'
  ) THEN
    CREATE POLICY "Users can delete their own assets"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'assets'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.platform_role IN ('admin', 'owner')
          )
        )
      );
  END IF;

  -- avatars: authenticated users can insert their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- avatars: authenticated users can update (upsert) their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- avatars: publicly readable
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Avatars are publicly readable'
  ) THEN
    CREATE POLICY "Avatars are publicly readable"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'avatars');
  END IF;

  -- avatars: owners can delete their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

END;
$$;
