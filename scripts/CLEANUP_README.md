# Database & Storage Cleanup Scripts

Complete cleanup utilities for resetting your Cosmos development environment.

## ⚠️ WARNING

**These scripts will DELETE ALL DATA!** Use only in development/testing environments.

## 🚀 Quick Start - Complete Cleanup

To delete **everything** (database + auth + storage):

```bash
cd /Users/cposchmann/cosmos
bash scripts/cleanup_all.sh
```

This will prompt you to type `DELETE EVERYTHING` to confirm.

## 📋 Individual Cleanup Scripts

If you want more granular control:

### 1. Clean Database Tables Only

Removes all data from application tables (users, assets, streams, etc.):

```bash
docker-compose -f supabase-docker/docker-compose.yml exec db psql -U postgres -d postgres -f /path/to/cleanup_database.sql
```

Or copy the SQL and run it in Supabase Studio's SQL editor.

### 2. Clean Auth Users Only

Removes all Supabase authentication users:

```bash
docker-compose -f supabase-docker/docker-compose.yml exec db psql -U postgres -d postgres -f /path/to/cleanup_auth.sql
```

### 3. Clean Storage Only

Removes all uploaded files from storage bucket:

```bash
bash scripts/cleanup_storage.sh
```

## 📊 What Gets Deleted

### Database Tables (in order):
1. `comment_likes` - Comment likes
2. `asset_comments` - All comments
3. `asset_likes` - Asset likes
4. `asset_streams` - Asset-stream relationships
5. `assets` - All uploaded assets/images
6. `stream_resources` - Stream pinned resources
7. `stream_members` - Stream memberships
8. `streams` - All streams
9. `notifications` - Activity notifications
10. `user_follows` - Follow relationships
11. `team_members` - Team memberships
12. `teams` - All teams
13. `users` - All user profiles

### Auth Tables:
- `auth.users` - Authentication users
- `auth.sessions` - Active sessions
- `auth.refresh_tokens` - Refresh tokens
- `auth.identities` - OAuth identities

### Storage:
- `supabase-docker/volumes/storage/assets/*` - All uploaded files
- `public/uploads/*` - Local uploads (if any)

## ✅ After Cleanup

Once cleanup is complete:

1. **Create a new account**
   - Navigate to: `http://localhost:3000/auth/signup`
   - Sign up with a fresh email

2. **Test first user experience**
   - Upload your first asset
   - Create your first stream
   - Test all features from scratch

3. **Optional: Load seed data**
   ```bash
   docker-compose -f supabase-docker/docker-compose.yml exec db psql -U postgres -d postgres < scripts/migrations/002_seed_data.sql
   ```

## 🔧 Troubleshooting

### Script fails with "permission denied"

Make sure scripts are executable:
```bash
chmod +x scripts/cleanup_*.sh
```

### Can't connect to database

Ensure Supabase Docker is running:
```bash
cd supabase-docker
docker-compose ps
```

If not running:
```bash
cd supabase-docker
docker-compose up -d
```

### Storage files still exist

Manually delete from Supabase Studio:
1. Open http://localhost:8000
2. Go to Storage → assets bucket
3. Select all files → Delete

## 🎯 Use Cases

### Testing First User Experience
```bash
bash scripts/cleanup_all.sh
# Then manually test signup and onboarding
```

### Resetting After Development
```bash
bash scripts/cleanup_all.sh
# Fresh start for new features
```

### Cleaning Test Data
```bash
# Just clean database, keep auth users
docker-compose -f supabase-docker/docker-compose.yml exec db psql -U postgres -d postgres < scripts/cleanup_database.sql
```

## 🔐 Safety Features

- **3-second delay** - Time to cancel before deletion
- **Explicit confirmation** - Must type "DELETE EVERYTHING" for complete cleanup
- **Respects foreign keys** - Deletes in correct order
- **Verification output** - Shows row counts after cleanup

## 📝 Manual Cleanup (Alternative)

If scripts don't work, you can manually clean via Supabase Studio:

1. Open http://localhost:8000
2. Go to SQL Editor
3. Copy contents of `cleanup_database.sql`
4. Run the SQL
5. Repeat for `cleanup_auth.sql`
6. Manually delete files from Storage

## 🚫 What's NOT Deleted

These remain unchanged:
- Database schema (tables, columns, indexes)
- Migrations history
- Supabase configuration
- Application code
- Environment variables
- Docker volumes structure

Only **data** is deleted, never the schema or configuration.





