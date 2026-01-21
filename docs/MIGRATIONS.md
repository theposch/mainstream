# Database Migrations Guide

**Version:** 2.0  
**Last Updated:** January 2026  
**Status:** Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Philosophy](#migration-philosophy)
3. [Migration Structure](#migration-structure)
4. [Running Migrations](#running-migrations)
5. [Creating Migrations](#creating-migrations)
6. [Migration History](#migration-history)
7. [Best Practices](#best-practices)
8. [Rollback Strategy](#rollback-strategy)
9. [Troubleshooting](#troubleshooting)
10. [Appendices](#appendices)

---

## Overview

Mainstream uses SQL-based database migrations to manage schema changes. Migrations are:

- **Sequential** - Applied in order (001, 002, 003...)
- **Idempotent** - Safe to run multiple times
- **Version Controlled** - Committed to git
- **Documented** - Each explains what and why

### Migration Automation

**Quick Apply:**
```bash
./migrate.sh
```

This script automatically applies all pending migrations in order.

### Manual Application

```bash
cd scripts/migrations

# Apply single migration
docker compose exec -T db psql -U postgres -d postgres < 001_initial_schema.sql

# Apply all migrations
for f in *.sql; do
  echo "Applying $f..."
  docker compose exec -T db psql -U postgres -d postgres < "$f"
done
```

---

## Migration Philosophy

### Why SQL Migrations?

✅ **Direct database access** - Full SQL power  
✅ **Explicit** - Know exactly what's changing  
✅ **Reversible** - Can write down migrations  
✅ **Environment agnostic** - Works anywhere PostgreSQL runs  
✅ **No ORM lock-in** - Pure SQL, no framework dependency  

### Migration Principles

1. **One Purpose Per Migration** - Each migration does one thing well
2. **Idempotent Operations** - `IF NOT EXISTS`, `IF EXISTS`
3. **Data Preserving** - Never lose data without explicit backup
4. **Backward Compatible** - Old code works during deployment
5. **Self-Documenting** - Comments explain why

---

## Migration Structure

### File Naming Convention

```
NNN_descriptive_name.sql
│   └─ Description
└─ Sequential number (001-999)
```

**Examples:**
- `001_initial_schema.sql` - Initial database setup
- `037_add_drop_schedules.sql` - New feature (scheduled drops)
- `033_fix_streams_rls_for_members.sql` - Bug fix

### Migration Template

```sql
-- =====================================================
-- Migration: Add User Preferences
-- Purpose: Store user notification and theme preferences
-- Author: Your Name
-- Date: 2026-01-20
-- =====================================================
--
-- Changes:
-- - Add user_preferences table
-- - Add RLS policies for user preferences
-- - Create default preferences trigger
--
-- To apply:
--   docker compose exec -T db psql -U postgres -d postgres < 041_add_user_preferences.sql
--
-- To rollback:
--   DROP TABLE IF EXISTS user_preferences CASCADE;
-- =====================================================

-- Enable extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "extension_name";

-- Create tables
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_create_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_preferences();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT ON user_preferences TO anon;

COMMENT ON TABLE user_preferences IS 'User notification and theme preferences';
```

### Migration Sections

Every migration should have:

1. **Header Comment** - Purpose, author, date
2. **Extensions** - Required PostgreSQL extensions
3. **Tables** - `CREATE TABLE IF NOT EXISTS`
4. **Indexes** - Performance optimizations
5. **RLS Policies** - Security rules
6. **Functions/Triggers** - Automation
7. **Permissions** - Grant statements
8. **Comments** - Documentation

---

## Running Migrations

### Development Environment

**Option 1: Migration Script (Recommended)**

```bash
# From project root
./migrate.sh
```

**Option 2: Manual Application**

```bash
cd scripts/migrations

# Apply specific migration
docker compose exec -T db psql -U postgres -d postgres < 037_add_drop_schedules.sql

# Apply all pending
for f in *.sql; do
  echo "Applying $f..."
  docker compose exec -T db psql -U postgres -d postgres < "$f" || exit 1
done
```

**Option 3: Supabase Studio**

1. Open http://localhost:3001 (Supabase Studio)
2. Navigate to SQL Editor
3. Paste migration contents
4. Click "Run"

### Production Environment

**Pre-Deployment Checklist:**

- [ ] Migrations tested in development
- [ ] Database backup created
- [ ] Migrations reviewed by team
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)

**Deployment Steps:**

```bash
# 1. Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
psql $STAGING_DATABASE_URL < new_migration.sql

# 3. Apply to production
psql $PROD_DATABASE_URL < new_migration.sql

# 4. Verify
psql $PROD_DATABASE_URL -c "SELECT * FROM pg_tables WHERE schemaname = 'public';"

# 5. Monitor application logs
# Watch for errors related to new schema changes
```

### Verifying Migrations

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'drop_schedules'
);

-- Check column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'platform_role'
);

-- Check RLS policy exists
SELECT * FROM pg_policies WHERE tablename = 'drop_schedules';

-- Check trigger exists
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
```

---

## Creating Migrations

### Step-by-Step Process

#### 1. Identify Need

Determine what database change is required:
- New feature (new tables, columns)
- Bug fix (fix RLS policy, add missing index)
- Optimization (add index, denormalize counter)
- Data cleanup (remove unused columns)

#### 2. Design Schema

Plan the changes:
- What tables/columns to add?
- What indexes are needed?
- What RLS policies are required?
- What triggers/functions are needed?

#### 3. Create Migration File

```bash
cd scripts/migrations

# Find next number
ls -1 *.sql | tail -1
# If last is 040_*.sql, create 041_*.sql

# Create file
touch 041_add_user_preferences.sql
```

#### 4. Write Migration

Use the [migration template](#migration-template) above. Include:

- Descriptive header comment
- Idempotent operations (`IF NOT EXISTS`)
- Proper foreign key constraints
- Appropriate indexes
- RLS policies for security
- Grants for proper access
- Helpful comments

#### 5. Test Migration

```bash
# Apply to development database
docker compose exec -T db psql -U postgres -d postgres < 041_add_user_preferences.sql

# Verify
docker compose exec db psql -U postgres -c "\d user_preferences"

# Test with application
npm run dev
# Manual testing of new functionality
```

#### 6. Update Types

```typescript
// lib/types/database.ts
export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

#### 7. Document

Update relevant documentation:
- `DATABASE_SCHEMA.md` - Add new tables/columns
- `API_REFERENCE.md` - Document new endpoints
- `ARCHITECTURE.md` - Explain architectural changes

#### 8. Commit

```bash
git add scripts/migrations/041_add_user_preferences.sql
git add lib/types/database.ts
git commit -m "feat: add user preferences table

- Created user_preferences table
- Added RLS policies for user access
- Created trigger for default preferences
- Updated TypeScript types"
```

---

## Migration History

### Foundation (001-010)

**001_initial_schema.sql** - Initial database structure
- Core tables (users, teams, streams, assets)
- Relationships (asset_streams, user_follows)
- Indexes and constraints
- Status: ✅ Applied

**002_seed_data.sql** - Development seed data
- Sample users, streams, assets
- Test comments, likes, follows
- Status: ✅ Applied (dev only)

**003_storage_setup.sql** - Storage buckets and policies
- `assets` bucket (50MB limit)
- `avatars` bucket (5MB limit)
- RLS policies for storage
- Status: ✅ Applied

**003_stream_follows.sql** - Stream following
- `stream_follows` table
- RLS policies
- Status: ✅ Applied

**004_stream_bookmarks.sql** - External link bookmarks
- `stream_bookmarks` table
- Favicon support
- Status: ✅ Applied

**007_add_comment_likes.sql** - Comment likes
- `comment_likes` table
- RLS policies
- Status: ✅ Applied

**009_add_asset_views.sql** - View tracking
- `asset_views` table
- Denormalized `view_count`
- Status: ✅ Applied

**010_asset_views_rls.sql** - View tracking security
- RLS policies for asset_views
- Status: ✅ Applied

### Real-time Features (011-015)

**011_notifications_rls_policies.sql** - Notifications
- `notifications` table
- Real-time RLS policies
- `REPLICA IDENTITY FULL`
- Status: ✅ Applied

**012_realtime_comments_likes.sql** - Real-time for interactions
- Set `REPLICA IDENTITY FULL` for comments
- Set `REPLICA IDENTITY FULL` for likes
- Status: ✅ Applied

**013-015** - Notification improvements
- Comment notifications
- Notification content field
- Comment deep linking
- Status: ✅ Applied

### Asset Types (016-017, 025-026)

**016_add_embed_support.sql** - Embed URLs
- `embed_url`, `embed_provider` columns
- Support for Figma, Loom
- Status: ✅ Applied

**017_add_figma_integration.sql** - Figma tokens
- Encrypted token storage
- `figma_access_token` column
- Status: ✅ Applied

**025_add_asset_visibility.sql** - Unlisted assets
- `visibility` column (public/unlisted)
- RLS policy updates
- Status: ✅ Applied

**026_add_video_asset_type.sql** - Video support
- `asset_type` column
- WebM video support
- Status: ✅ Applied

### Drops Feature (018-022)

**018_add_drops.sql** - Newsletter tables
- `drops` table
- `drop_posts` table
- RLS policies
- Status: ✅ Applied

**019-020** - Drop post improvements
- Display mode (fit/cover)
- Crop position
- Status: ✅ Applied

**021_add_drop_blocks.sql** - Block editor
- `drop_blocks` table
- Notion-like blocks
- Status: ✅ Applied

**022_add_image_gallery_block.sql** - Gallery blocks
- `drop_image_blocks` table
- Multi-image galleries
- Status: ✅ Applied

### Authentication & Authorization (023-024, 032-033)

**023_add_auth_user_trigger.sql** - Auto-create profiles
- Trigger on `auth.users` insert
- Creates `public.users` record
- Status: ✅ Applied

**024_add_assets_rls_policies.sql** - Asset security
- Comprehensive RLS policies
- Owner-based permissions
- Status: ✅ Applied

**032_stream_members_rls_policies.sql** - Private streams
- `stream_members` table
- Role-based access (owner, admin, member)
- Status: ✅ Applied

**033_fix_streams_rls_for_members.sql** - Member access
- Fixed recursive RLS with SECURITY DEFINER
- Status: ✅ Applied

### Performance (029-030)

**029_increment_view_count_rpc.sql** - Atomic view counter
- RPC function for incrementing
- Status: ✅ Applied

**030_record_asset_view_rpc.sql** - Atomic view recording
- Combined insert/update logic
- Status: ✅ Applied

### User Features (027-028)

**027_add_user_location.sql** - User location field
- `location` column on users
- Status: ✅ Applied

**028_user_notification_settings.sql** - Notification preferences
- `user_notification_settings` table
- Per-type toggles
- Status: ✅ Applied

### Admin Features (034-036)

**034_add_platform_roles.sql** - Platform-level roles
- `platform_role` column (user, admin, owner)
- Status: ✅ Applied

**035_update_auth_trigger_for_owner.sql** - Owner role
- Sets platform_role for first user
- Status: ✅ Applied

**036_add_admin_user_management_rls.sql** - Admin RLS
- Admin can view all users
- Status: ✅ Applied

### Scheduled Drops (037-040)

**037_add_drop_schedules.sql** - Recurring automation
- `drop_schedules` table
- `schedule_id` on drops
- RLS policies
- Table-level permissions
- Status: ✅ Applied

**038_add_schedule_cron.sql** - pg_cron integration
- Cron job for schedule processing
- Status: ✅ Applied (if pg_cron enabled)

**039_simplify_schedule_drafts.sql** - Draft handling
- Delete-and-replace logic
- `is_superseded` flag
- Status: ✅ Applied

**040_fix_schedule_cron.sql** - Cron fixes
- Improved schedule processing
- Status: ✅ Applied

---

## Best Practices

### DO ✅

**1. Use Idempotent Operations**

```sql
-- Good
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_my_table_col ON my_table(col);
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col TEXT;

-- Works when:
-- - Migration runs first time (creates)
-- - Migration runs again (no-op)
```

**2. Add Indexes for Foreign Keys**

```sql
-- Every foreign key should have an index
ALTER TABLE asset_likes ADD COLUMN asset_id UUID REFERENCES assets(id);
CREATE INDEX IF NOT EXISTS idx_asset_likes_asset_id ON asset_likes(asset_id);
```

**3. Use Descriptive Names**

```sql
-- Good
CREATE INDEX idx_assets_uploader_created ON assets(uploader_id, created_at DESC);

-- Bad
CREATE INDEX idx1 ON assets(uploader_id, created_at);
```

**4. Add Comments**

```sql
COMMENT ON TABLE drop_schedules IS 'Recurring newsletter generation schedules';
COMMENT ON COLUMN drop_schedules.frequency IS 'weekly, biweekly, monthly, or custom';
```

**5. Grant Appropriate Permissions**

```sql
-- Table-level grants
GRANT SELECT, INSERT, UPDATE ON drop_schedules TO authenticated;
GRANT SELECT ON drop_schedules TO anon;

-- Don't forget service_role!
GRANT ALL ON drop_schedules TO service_role;
```

**6. Test Rollback**

Write down migrations when possible:

```sql
-- In migration file, include rollback instructions:
-- To rollback:
--   DROP TABLE IF EXISTS new_table CASCADE;
--   ALTER TABLE old_table DROP COLUMN IF EXISTS new_column;
```

### DON'T ❌

**1. Don't Modify Existing Migrations**

```sql
-- Bad - Editing 037_add_drop_schedules.sql after deployment
-- Instead: Create 041_fix_drop_schedules.sql
```

**2. Don't Delete Data Without Backup**

```sql
-- Bad
DROP TABLE old_feature CASCADE;

-- Good
-- 1. Create backup table
CREATE TABLE old_feature_backup AS SELECT * FROM old_feature;
-- 2. Then drop
DROP TABLE old_feature CASCADE;
```

**3. Don't Skip RLS Policies**

```sql
-- Bad
CREATE TABLE my_table (...);
-- No RLS = security vulnerability!

-- Good
CREATE TABLE my_table (...);
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ...
```

**4. Don't Use SELECT ***

```sql
-- Bad in production migrations
SELECT * FROM users;

-- Good - Explicit columns
SELECT id, username, email FROM users;
```

**5. Don't Forget ON DELETE Clauses**

```sql
-- Bad
ALTER TABLE comments ADD COLUMN user_id UUID REFERENCES users(id);

-- Good
ALTER TABLE comments ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
```

---

## Rollback Strategy

### When to Rollback

- Migration caused production errors
- Performance degradation
- Data inconsistency
- Application incompatibility

### Rollback Methods

#### Method 1: Restore from Backup

```bash
# Fastest, safest for major issues
pg_restore -d $DATABASE_URL backup_before_migration.sql
```

#### Method 2: Down Migration

```sql
-- Create down migration file
-- scripts/migrations/041_add_user_preferences_down.sql

DROP TRIGGER IF EXISTS on_user_created_create_preferences ON auth.users;
DROP FUNCTION IF EXISTS create_default_preferences();
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP TABLE IF EXISTS user_preferences CASCADE;
```

Apply:
```bash
docker compose exec -T db psql -U postgres -d postgres < 041_add_user_preferences_down.sql
```

#### Method 3: Manual Rollback

```bash
# Connect to database
docker compose exec db psql -U postgres

# Manually undo changes
DROP TABLE problematic_table CASCADE;
ALTER TABLE my_table DROP COLUMN new_column;
```

### Rollback Testing

**Before Production Deployment:**

1. Apply migration to staging
2. Test application
3. Apply down migration
4. Verify application still works
5. Re-apply migration
6. Test again

---

## Troubleshooting

### Common Issues

#### Issue: "relation already exists"

**Cause:** Migration already applied or table created manually.

**Solution:** Use `IF NOT EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS my_table (...);
```

#### Issue: "permission denied"

**Cause:** Missing grants or RLS blocking query.

**Solution:**

```sql
-- Check grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'my_table';

-- Add missing grants
GRANT SELECT, INSERT, UPDATE ON my_table TO authenticated;
GRANT SELECT ON my_table TO anon;
GRANT ALL ON my_table TO service_role;
```

#### Issue: "foreign key constraint violated"

**Cause:** Referenced data doesn't exist or wrong order of operations.

**Solution:**

```sql
-- Disable foreign key checks temporarily (DEV ONLY!)
SET session_replication_role = 'replica';

-- Run migration
-- ...

-- Re-enable
SET session_replication_role = 'origin';

-- Or: Create in correct order (parent before child)
```

#### Issue: "deadlock detected"

**Cause:** Migration locking tables during high traffic.

**Solution:**

```sql
-- Use shorter locks
ALTER TABLE my_table ADD COLUMN new_col TEXT DEFAULT NULL;
-- Then update data in batches
UPDATE my_table SET new_col = 'value' WHERE id IN (
  SELECT id FROM my_table WHERE new_col IS NULL LIMIT 1000
);
```

#### Issue: Migration hangs

**Cause:** Waiting for locks from active connections.

**Solution:**

```sql
-- Check for blocking queries
SELECT 
  pid, 
  usename, 
  state, 
  query 
FROM pg_stat_activity 
WHERE state != 'idle';

-- Kill blocking query (if safe)
SELECT pg_terminate_backend(pid);
```

### Debugging Migrations

**Check migration status:**

```sql
-- List all tables
\dt

-- Describe table
\d table_name

-- List policies
SELECT * FROM pg_policies WHERE tablename = 'my_table';

-- List triggers
SELECT * FROM information_schema.triggers;

-- Check column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'my_table';
```

---

## Appendices

### A. Migration Checklist

Before applying a migration:

- [ ] Migration file follows naming convention
- [ ] Header comment explains purpose
- [ ] Idempotent operations used
- [ ] Indexes added for foreign keys
- [ ] RLS policies created
- [ ] Permissions granted
- [ ] Rollback instructions included
- [ ] Tested on development database
- [ ] Application tested with new schema
- [ ] Types updated in `database.ts`
- [ ] Documentation updated
- [ ] Reviewed by team member

### B. Emergency Procedures

**Production Migration Failed:**

1. **Stop deployment** - Don't deploy new application code
2. **Assess damage** - Check logs, error messages
3. **Decide:** Quick fix or rollback?
4. **If rollback:** Restore from backup or run down migration
5. **Verify** - Test critical application paths
6. **Post-mortem** - Document what went wrong

**Contact Information:**
- Database Admin: [your-email]
- On-Call: [on-call-phone]

### C. Migration Tools

**Recommended Tools:**

- **psql** - PostgreSQL command-line client
- **pgAdmin** - GUI for PostgreSQL
- **DBeaver** - Universal database tool
- **Supabase Studio** - Web UI for Supabase

**Future Improvements:**

- Migration tracking table
- Automatic rollback on error
- Migration dry-run mode
- Migration diff tool

### D. Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [SQL Style Guide](https://www.sqlstyle.guide/)
- [Database Design Best Practices](https://databasemanagement.fandom.com/wiki/Database_Design_Best_Practices)

---

**Last Updated:** January 2026  
**Maintainer:** Development Team  
**Next Review:** March 2026

For questions about migrations, see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) or consult the team.
