# Supabase Self-Hosted Setup Guide

Complete guide for setting up Supabase locally for the Cosmos application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Setup](#docker-setup)
4. [Database Schema](#database-schema)
5. [Authentication Configuration](#authentication-configuration)
6. [Storage Configuration](#storage-configuration)
7. [Environment Variables](#environment-variables)
8. [Testing the Setup](#testing-the-setup)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Overview

This project uses Supabase self-hosted via Docker Compose, providing:
- **PostgreSQL Database** with Row Level Security
- **Authentication** (GoTrue) with email/password
- **File Storage** (S3-compatible)
- **Realtime** subscriptions
- **Supabase Studio** admin dashboard

**Why Self-Hosted?**
- Full control over data and infrastructure
- Free for development
- Easy to deploy to company servers later
- Compatible with Supabase Cloud APIs

---

## Prerequisites

Before starting, ensure you have:

- [x] **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Minimum: 8GB RAM allocated to Docker

- [x] **Node.js 18+** installed
  - Check: `node --version`

- [x] **Git** for version control
  - Check: `git --version`

- [x] **Stable internet connection** (for initial Docker image pull)
  - ~2-3GB of images to download

---

## Docker Setup

### Step 1: Start Supabase Services

The Docker configuration is already set up in the `supabase-docker/` directory.

```bash
cd supabase-docker
docker-compose up -d
```

**Note**: First run may take 10-15 minutes to pull all images.

### Step 2: Verify Services

Check that all services are running:

```bash
docker-compose ps
```

You should see ~13 services running:
- ✅ `supabase-db` (PostgreSQL)
- ✅ `supabase-auth` (GoTrue)
- ✅ `supabase-rest` (PostgREST API)
- ✅ `supabase-storage` (Storage API)
- ✅ `supabase-realtime`
- ✅ `supabase-kong` (API Gateway)
- ✅ `supabase-studio` (Admin UI)
- ✅ `supabase-meta` (Management API)
- ✅ And more...

### Step 3: Access Supabase Studio

Open: http://localhost:8000

**Login Credentials:**
- Username: `supabase`
- Password: `cosmos_admin_2024`

### Troubleshooting Docker

If services fail to start:

**Problem: Network timeout during image pull**
```bash
# Restart Docker Desktop
# Then retry:
docker-compose up -d
```

**Problem: Port conflicts (8000 or 5432 already in use)**
```bash
# Edit supabase-docker/.env:
KONG_HTTP_PORT=8001  # Change from 8000
POSTGRES_PORT=5433   # Change from 5432

# Update .env.local in project root to match
```

**Problem: Services unhealthy**
```bash
# Check logs:
docker-compose logs [service-name]

# Example:
docker-compose logs db
docker-compose logs auth
```

---

## Database Schema

### Step 1: Apply Initial Migration

Once Docker is running, apply the database schema:

```bash
# From project root
cd scripts/migrations

# Connect to PostgreSQL and run migration
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 001_initial_schema.sql
```

**Alternative**: Copy-paste SQL into Supabase Studio SQL Editor:
1. Open Studio: http://localhost:8000
2. Go to SQL Editor
3. Paste contents of `scripts/migrations/001_initial_schema.sql`
4. Click "Run"

### Step 2: Verify Tables Created

In Supabase Studio:
1. Navigate to **Table Editor**
2. You should see all tables:
   - `users`
   - `teams`, `team_members`
   - `streams`, `stream_members`, `stream_resources`, `asset_streams`
   - `assets`, `asset_likes`, `asset_comments`
   - `user_follows`
   - `notifications`

### Schema Overview

**Core Entities:**
- **Users**: User accounts and profiles
- **Teams**: Organizations/workspaces
- **Streams**: Organizational units (replaces "projects")
- **Assets**: Uploaded files and designs

**Relationships:**
- Users ↔ Teams (many-to-many via `team_members`)
- Streams ↔ Assets (many-to-many via `asset_streams`)
- Assets ↔ Users (likes, comments, uploads)

See `docs/BACKEND_INTEGRATION.md` for detailed schema documentation.

---

## Authentication Configuration

### Step 1: Enable Email/Password Auth

Already configured in `supabase-docker/.env`:
```env
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false  # Set to true for development
```

For development, you may want to auto-confirm emails:

**Edit `supabase-docker/.env`:**
```env
ENABLE_EMAIL_AUTOCONFIRM=true
```

Then restart:
```bash
cd supabase-docker
docker-compose restart auth
```

### Step 2: Create Auth Trigger

This automatically creates a user profile when someone signs up:

**Run in SQL Editor:**
```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),  -- Use email prefix as initial username
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Test Auth in Studio

1. Go to **Authentication** > **Users**
2. Click **Add User** > **Create new user**
3. Enter email and password
4. Check that user appears in both:
   - `auth.users` table
   - `public.users` table (via trigger)

---

## Storage Configuration

### Step 1: Create Storage Buckets

In Supabase Studio:
1. Navigate to **Storage**
2. Click **New bucket**
3. Create buckets:

**Bucket 1: `assets`**
- Name: `assets`
- Public: ✅ Yes
- File size limit: 50 MB
- Allowed MIME types: `image/*`

**Bucket 2: `avatars`**
- Name: `avatars`
- Public: ✅ Yes
- File size limit: 5 MB
- Allowed MIME types: `image/*`

### Step 2: Configure Storage Policies

For the `assets` bucket, create policies:

**Policy 1: Public Read**
```sql
CREATE POLICY "Public assets are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');
```

**Policy 2: Authenticated Upload**
```sql
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Users can delete own uploads**
```sql
CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Test Storage

Upload a test file in Studio:
1. Go to **Storage** > **assets**
2. Click **Upload file**
3. Select an image
4. Verify it uploads successfully

---

## Environment Variables

The application needs Supabase credentials in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Getting Your Keys

1. Open Supabase Studio: http://localhost:8000
2. Go to **Project Settings** > **API**
3. Copy the keys:
   - **URL**: `http://localhost:8000`
   - **anon public**: Copy to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: Copy to `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ Security Note:**
- `anon` key is safe in browser code
- `service_role` key must NEVER be exposed to the browser
- Never commit `.env.local` to Git

### Restart Next.js

After updating environment variables:
```bash
# Stop current dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Testing the Setup

### Test 1: Database Connection

Create `test-db.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";

export async function testDatabase() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('users').select('*').limit(1);
  
  if (error) {
    console.error('Database connection failed:', error);
    return false;
  }
  
  console.log('Database connected successfully!', data);
  return true;
}
```

### Test 2: Authentication

Create test user via Studio or API:
```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'securepassword123',
});
```

### Test 3: Storage

Upload test file:
```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const { data, error } = await supabase.storage
  .from('assets')
  .upload('test/image.png', file);
```

---

## Troubleshooting

### Issue: "Connection refused" errors

**Solution:**
1. Verify Docker is running: `docker ps`
2. Check service status: `cd supabase-docker && docker-compose ps`
3. Restart services: `docker-compose restart`

### Issue: "Invalid API key" errors

**Solution:**
1. Verify `.env.local` has correct keys
2. Check keys in Studio: Settings > API
3. Restart Next.js dev server

### Issue: RLS policy blocking queries

**Solution:**
1. Check if RLS is enabled on table
2. Review policies in Studio: Authentication > Policies
3. For development, you can disable RLS:
   ```sql
   ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
   ```
   (Re-enable for production!)

### Issue: Storage uploads failing

**Solution:**
1. Check bucket exists and is public
2. Verify storage policies allow uploads
3. Check file size limits
4. Review browser console for CORS errors

---

## Production Deployment

When ready to deploy:

### Option 1: Supabase Cloud

1. Create project at https://supabase.com
2. Export local database:
   ```bash
   pg_dump -h localhost -p 5432 -U postgres > database.sql
   ```
3. Import to Supabase Cloud via Studio
4. Update `.env.local` with cloud URLs and keys

### Option 2: Self-Hosted on Company Servers

1. Copy `supabase-docker/` to production server
2. Update `supabase-docker/.env` with production values
3. Set up SSL certificates
4. Configure firewall rules
5. Set up backups:
   ```bash
   # Daily backup cron job
   0 2 * * * pg_dump -h localhost -p 5432 -U postgres > /backups/cosmos_$(date +\%Y\%m\%d).sql
   ```

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate new JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure Row Level Security policies
- [ ] Enable audit logging
- [ ] Set up monitoring (Grafana/Prometheus)
- [ ] Configure rate limiting
- [ ] Review and restrict API access

---

## Next Steps

Now that Supabase is set up:

1. ✅ **Complete remaining TODOs:**
   - Replace mock auth with Supabase Auth
   - Migrate user queries to database
   - Update storage to use Supabase Storage
   - Add database seed data

2. ✅ **Update API routes:**
   - Replace localStorage with Supabase queries
   - Add proper error handling
   - Implement pagination

3. ✅ **Enable real-time features:**
   - Live notifications
   - Collaborative editing
   - Real-time comments

See `docs/BACKEND_INTEGRATION.md` for detailed integration steps.

---

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
cd supabase-docker && docker-compose down -v && docker-compose up -d

# Backup database
docker-compose exec db pg_dump -U postgres > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres < backup.sql
```

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Questions or Issues?**

Check the troubleshooting section above or review:
- `supabase-docker/README.md` - Docker-specific setup
- `docs/BACKEND_INTEGRATION.md` - API integration guide
- `scripts/migrations/001_initial_schema.sql` - Database schema

---

*Last updated: November 2024*
*Cosmos Application v2.0 - Supabase Integration*

