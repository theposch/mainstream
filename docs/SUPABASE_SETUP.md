# Supabase Setup Guide

Complete setup guide for running Supabase locally with Docker.

## Overview

**Services:**
- PostgreSQL database with RLS
- GoTrue authentication
- Storage (S3-compatible)
- Realtime (WebSocket subscriptions)
- Supabase Studio (admin dashboard)

**Why Self-Hosted:**
- Full control over data
- Free for development
- Easy to deploy to company servers
- Same APIs as Supabase Cloud

## Prerequisites

- Docker Desktop (8GB RAM minimum)
- Node.js 18+
- Stable internet (initial pull ~2-3GB)

## Quick Setup

### 1. Start Supabase

```bash
cd supabase-docker
docker-compose up -d
```

First run takes 10-15 minutes to pull images.

### 2. Verify Services

```bash
docker-compose ps
```

Should show ~13 services running.

### 3. Access Studio

Open http://localhost:8000

**Login:**
- Username: `supabase`
- Password: `cosmos_admin_2024`

### 4. Configure Environment

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get keys:** Studio → Settings → API

### 5. Apply Schema

```bash
cd scripts/migrations
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 001_initial_schema.sql
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 002_seed_data.sql
```

Or paste into Studio SQL Editor.

### 6. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

## Database Schema

### Tables Created

- `users` - User profiles
- `streams` - Organizational units
- `assets` - Uploaded designs
- `asset_streams` - Many-to-many relationships
- `asset_likes` - Like tracking
- `asset_comments` - Comments with threading
- `comment_likes` - Comment likes
- `user_follows` - Following relationships
- `notifications` - Activity feed

### Verify in Studio

Navigate to **Table Editor** and confirm all tables exist.

## Authentication

### Email Auto-Confirm

Already configured in `supabase-docker/.env`:

```env
ENABLE_EMAIL_AUTOCONFIRM=true
```

**Required for local dev** since SMTP is not configured.

### Auth Trigger

Creates user profile automatically on signup.

Already applied in migration `001_initial_schema.sql`:

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, email)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Storage

### Buckets

Create in Studio → Storage:

**assets:**
- Public: ✅ Yes
- Size limit: 50 MB
- MIME types: `image/*`

**avatars:**
- Public: ✅ Yes
- Size limit: 5 MB
- MIME types: `image/*`

### Policies

Already applied in migration:

```sql
-- Public read
CREATE POLICY "Public assets viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Owner delete
CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Testing

### Test Database

```bash
docker-compose exec db psql -U postgres

# Run queries
SELECT * FROM users;
SELECT * FROM assets LIMIT 5;
SELECT COUNT(*) FROM streams;
```

### Test Auth

1. Go to `/auth/signup`
2. Create account
3. Verify user appears in both:
   - `auth.users` (Supabase Auth)
   - `public.users` (Your app)

### Test Storage

1. Log in
2. Click "Create" → Upload asset
3. Verify appears in Studio → Storage → assets

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# View logs
cd supabase-docker
docker-compose logs -f [service]

# Restart
docker-compose restart
```

### Port Conflicts

Edit `supabase-docker/.env`:

```env
KONG_HTTP_PORT=8001  # Change from 8000
POSTGRES_PORT=5433   # Change from 5432
```

Update `.env.local` to match.

### Auth Confirmation Error

If seeing "Error sending confirmation email":

```bash
cd supabase-docker
# Ensure .env has:
# ENABLE_EMAIL_AUTOCONFIRM=true

# Recreate auth container
docker-compose up -d --force-recreate auth

# Verify
docker-compose exec auth env | grep AUTOCONFIRM
# Should show: GOTRUE_MAILER_AUTOCONFIRM=true
```

### Database Password Error

Root cause: Data directory exists with old passwords.

```bash
cd supabase-docker
docker-compose down
sudo rm -rf data/  # ⚠️ Deletes all data!
docker-compose up -d

# Reapply migrations
cd ../scripts/migrations
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 001_initial_schema.sql
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 002_seed_data.sql
```

### Connection Refused

```bash
# Verify services running
docker-compose ps

# Check environment variables
cat .env.local

# Restart Next.js
# (Ctrl+C then npm run dev)
```

### RLS Blocking Queries

For development, you can disable RLS:

```sql
ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
```

**Re-enable for production!**

```sql
ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
```

## Useful Commands

```bash
# Start Supabase
cd supabase-docker && docker-compose up -d

# Stop Supabase
cd supabase-docker && docker-compose down

# View logs
cd supabase-docker && docker-compose logs -f [service]

# Connect to PostgreSQL
docker-compose exec db psql -U postgres

# Reset database (⚠️ deletes all data!)
docker-compose down -v && docker-compose up -d

# Backup database
docker-compose exec db pg_dump -U postgres > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres < backup.sql
```

## Production Deployment

### Option 1: Supabase Cloud

1. Create project at https://supabase.com
2. Export local database:
   ```bash
   pg_dump -h localhost -p 5432 -U postgres > database.sql
   ```
3. Import to cloud via Studio
4. Update `.env.local` with cloud URLs

### Option 2: Self-Host on Servers

1. Copy `supabase-docker/` to server
2. Update `.env` with production values
3. Set up SSL certificates
4. Configure firewall
5. Set up daily backups:
   ```bash
   0 2 * * * pg_dump > /backups/cosmos_$(date +\%Y\%m\%d).sql
   ```

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate new JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Review RLS policies
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring

## Next Steps

✅ Supabase is ready!

Now you can:
- Create users at `/auth/signup`
- Upload assets with "Create" button
- Follow users on their profiles
- Create streams with `#stream-name` hashtags
- Test real-time likes and comments

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

*Last updated: November 2025*
