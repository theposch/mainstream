-- Migration: Grant supabase_admin access for Supabase Studio / pg-meta
-- Fixes "Unable to find your table with ID" and "permission denied for schema _realtime"
-- Run: docker exec -i mainstream-db psql -U postgres -d postgres < scripts/migrations/043_supabase_studio_meta_permissions.sql

-- Public schema: ensure supabase_admin can read tables (for Table Editor)
GRANT USAGE ON SCHEMA public TO supabase_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO supabase_admin;

-- _realtime schema: pg-meta queries this when fetching table metadata
GRANT USAGE ON SCHEMA _realtime TO supabase_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA _realtime TO supabase_admin;

-- Track migration
INSERT INTO schema_migrations (version, name) VALUES (43, '043_supabase_studio_meta_permissions')
ON CONFLICT (version) DO NOTHING;
