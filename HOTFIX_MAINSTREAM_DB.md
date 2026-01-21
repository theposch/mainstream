# Hotfix: Mainstream Database Missing schedule_id Column

**Date**: January 21, 2026  
**Issue**: [Drops Page] Error fetching drops when clicking "My Drafts"  
**Branch**: `investigation/verify-migration-issues`

## Problem

The application (port 8000, mainstream instance) was missing the `schedule_id` column in the `drops` table, causing the drafts query to fail:

```typescript
query = query
  .eq("status", "draft")
  .eq("created_by", user.id)
  .is("schedule_id", null); // ❌ Column didn't exist
```

## Root Cause

The `mainstream-db` database had partial migrations applied but was missing migration 037 (`add_drop_schedules.sql`) which adds:
- `drop_schedules` table
- `schedule_id` column to `drops` table

## Evidence

```bash
# Before fix
$ docker exec mainstream-db psql -U postgres -d postgres -c "\d drops"
# Result: No schedule_id column ❌

# API test
$ curl "http://localhost:8000/rest/v1/drops?schedule_id=is.null"
HTTP/1.1 400 Bad Request ❌
```

## Fix Applied

1. Applied migration 037 to mainstream-db:
```bash
docker exec -i mainstream-db psql -U postgres -d postgres \
  < scripts/migrations/037_add_drop_schedules.sql
```

2. Reloaded PostgREST schema cache:
```bash
docker exec -i mainstream-db psql -U postgres -d postgres \
  -c "NOTIFY pgrst, 'reload schema';"
```

## Verification

```bash
# After fix
$ docker exec mainstream-db psql -U postgres -d postgres \
  -c "SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'drops' AND column_name = 'schedule_id';"
 column_name 
-------------
 schedule_id ✅

# API test
$ curl "http://localhost:8000/rest/v1/drops?schedule_id=is.null&limit=0"
HTTP/1.1 200 OK ✅
Content-Range: */*
```

## Why This Happened

The project has TWO Supabase instances:
- **Port 54321**: `supabase_db_sidequest_new` (Cosmos dev) - fully migrated ✅
- **Port 8000**: `mainstream-db` (production) - partially migrated ❌

The migrations were applied to the dev instance but not the production instance.

## Prevention

The fix in this branch (adding PostgREST reload to `migrate.sh`) helps ensure that:
1. Migrations are applied consistently
2. PostgREST schema cache is automatically reloaded
3. Fresh installs work correctly

## Status

✅ **RESOLVED** - Drops page "My Drafts" tab now works correctly without errors.
