-- =====================================================
-- Cosmos Application - Auth Users Cleanup Script
-- =====================================================
-- WARNING: This will DELETE ALL AUTH USERS from Supabase
-- Use this for development/testing only!
--
-- This cleans up the auth.users table which is separate
-- from your application's users table.
--
-- To run via Docker:
--   docker-compose exec db psql -U postgres -d postgres < scripts/cleanup_auth.sql
-- =====================================================

\echo '⚠️  WARNING: This will delete ALL Supabase Auth users!'
\echo 'Press Ctrl+C within 3 seconds to cancel...'
SELECT pg_sleep(3);

\echo ''
\echo '🔐 Cleaning up Supabase Auth users...'
\echo ''

-- Delete all auth users
-- This cascades to related auth tables
DELETE FROM auth.users;

-- Also clean up any orphaned sessions
DELETE FROM auth.sessions;

-- Clean up refresh tokens
DELETE FROM auth.refresh_tokens;

-- Clean up identities
DELETE FROM auth.identities;

\echo ''
\echo '✅ Auth cleanup complete!'
\echo ''

-- Verify
SELECT 'auth.users' as table_name, COUNT(*) as row_count FROM auth.users
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities;

\echo ''
\echo '✨ All authentication data cleared!'
\echo ''





