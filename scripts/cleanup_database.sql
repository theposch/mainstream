-- =====================================================
-- Cosmos Application - Database Cleanup Script
-- =====================================================
-- WARNING: This will DELETE ALL DATA from your database
-- Use this for development/testing only!
-- 
-- This script safely removes all data while respecting
-- foreign key constraints by deleting in the correct order.
--
-- To run via Docker:
--   docker-compose exec db psql -U postgres -d postgres < scripts/cleanup_database.sql
--
-- Or connect to your database and paste this into psql
-- =====================================================

\echo '⚠️  WARNING: This will delete ALL data from your database!'
\echo 'Press Ctrl+C within 3 seconds to cancel...'
SELECT pg_sleep(3);

\echo ''
\echo '🧹 Starting database cleanup...'
\echo ''

-- Disable triggers temporarily for faster deletion
SET session_replication_role = replica;

-- =====================================================
-- Delete data in correct order (child tables first)
-- =====================================================

\echo '📝 Deleting comment likes...'
DELETE FROM comment_likes;

\echo '💬 Deleting asset comments...'
DELETE FROM asset_comments;

\echo '❤️  Deleting asset likes...'
DELETE FROM asset_likes;

\echo '🔗 Deleting asset-stream relationships...'
DELETE FROM asset_streams;

\echo '📸 Deleting assets...'
DELETE FROM assets;

\echo '📌 Deleting stream resources...'
DELETE FROM stream_resources;

\echo '👥 Deleting stream members...'
DELETE FROM stream_members;

\echo '🌊 Deleting streams...'
DELETE FROM streams;

\echo '🔔 Deleting notifications...'
DELETE FROM notifications;

\echo '👤 Deleting user follows...'
DELETE FROM user_follows;

\echo '🏢 Deleting team members...'
DELETE FROM team_members;

\echo '🏢 Deleting teams...'
DELETE FROM teams;

\echo '👤 Deleting users...'
DELETE FROM users;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- Reset sequences (optional - keeps IDs starting fresh)
-- =====================================================

\echo ''
\echo '🔄 Resetting sequences...'

-- Reset any sequences if they exist
-- (None in this schema since we use UUIDs)

-- =====================================================
-- Verify cleanup
-- =====================================================

\echo ''
\echo '✅ Cleanup complete! Verifying...'
\echo ''

-- Show row counts for all tables
SELECT 
  'users' as table_name, 
  COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL
SELECT 'streams', COUNT(*) FROM streams
UNION ALL
SELECT 'stream_members', COUNT(*) FROM stream_members
UNION ALL
SELECT 'stream_resources', COUNT(*) FROM stream_resources
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'asset_streams', COUNT(*) FROM asset_streams
UNION ALL
SELECT 'asset_likes', COUNT(*) FROM asset_likes
UNION ALL
SELECT 'asset_comments', COUNT(*) FROM asset_comments
UNION ALL
SELECT 'comment_likes', COUNT(*) FROM comment_likes
UNION ALL
SELECT 'user_follows', COUNT(*) FROM user_follows
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY table_name;

\echo ''
\echo '✨ Database is now clean!'
\echo ''
\echo '📝 Next steps:'
\echo '   1. Clean up Supabase Auth users (see cleanup_auth.sql)'
\echo '   2. Clean up Storage bucket (see cleanup_storage.sql)'
\echo '   3. Optional: Run seed data script if needed'
\echo ''



