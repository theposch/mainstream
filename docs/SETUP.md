# Mainstream Complete Setup Guide

**Version:** 2.0  
**Last Updated:** January 2026  
**Difficulty:** Beginner to Intermediate

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Setup (10 Minutes)](#quick-setup-10-minutes)
4. [Detailed Setup](#detailed-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Application Setup](#application-setup)
8. [Development Workflow](#development-workflow)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Appendices](#appendices)

---

## Overview

This guide covers everything needed to set up Mainstream from scratch, including:

- ✅ Docker and Supabase configuration
- ✅ Environment variables and secrets
- ✅ Database schema and migrations
- ✅ Application installation and startup
- ✅ Development workflow
- ✅ Production deployment

### Setup Paths

**Choose your path:**

1. **[Quick Setup](#quick-setup-10-minutes)** - Get running in 10 minutes (recommended for first-time users)
2. **[Detailed Setup](#detailed-setup)** - Understand every step
3. **[Production Setup](#production-deployment)** - Deploy to production

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Install Link |
|----------|---------|---------|--------------|
| **Docker Desktop** | Latest | Run Supabase services | [Get Docker](https://www.docker.com/products/docker-desktop) |
| **Node.js** | 20.x+ | Run Next.js application | [Get Node.js](https://nodejs.org/) |
| **npm** | 10.x+ | Package manager | (Included with Node.js) |
| **FFmpeg** | Latest | Video thumbnail generation | [Get FFmpeg](#install-ffmpeg) |
| **Git** | Latest | Version control | [Get Git](https://git-scm.com/) |

### System Requirements

- **RAM:** 8GB minimum (16GB recommended)
- **Storage:** 10GB free space
- **OS:** macOS, Linux, or Windows (WSL2)
- **Ports:** 3000, 5432, 8000, 3001 must be available

### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**Verify Installation:**
```bash
ffmpeg -version
```

---

## Quick Setup (10 Minutes)

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd mainstream
```

### Step 2: Install Dependencies

```bash
npm install
```

Expected output:
```
added 1234 packages in 30s
```

### Step 3: Generate Environment Files

```bash
./setup.sh
```

This script:
- ✅ Generates secure `JWT_SECRET`
- ✅ Creates matching `ANON_KEY` and `SERVICE_ROLE_KEY`
- ✅ Creates `.env` file for Docker
- ✅ Creates `.env.local` template for Next.js

**If setup.sh fails, see [Manual Environment Setup](#manual-environment-configuration).**

### Step 4: Configure Next.js

```bash
# Copy template
cp .env.local.example .env.local

# Edit with your favorite editor
nano .env.local  # or vim, code, etc.
```

Ensure these values match `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-.env>
SUPABASE_SERVICE_ROLE_KEY=<from-.env>
```

### Step 5: Start Supabase

```bash
docker compose up -d
```

Wait for services to be healthy (~30 seconds):
```bash
docker compose ps
```

All services should show "healthy" or "running".

### Step 6: Apply Database Migrations

```bash
./migrate.sh
```

This applies all migrations in order. Expected output:
```
Applying 001_initial_schema.sql...
Applying 002_seed_data.sql...
...
Applying 040_fix_schedule_cron.sql...
All migrations applied successfully!
```

### Step 7: Start Next.js

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.x:3000

 ✓ Ready in 2.5s
```

### Step 8: Access Application

Open http://localhost:3000

**First-time signup:**
1. Click "Sign Up"
2. Enter email and password
3. Account created instantly (no email confirmation)
4. First user becomes "owner" with admin privileges

🎉 **You're done! Mainstream is running.**

---

## Detailed Setup

For those who want to understand each step in depth.

### 1. Environment Setup

#### Why Environment Variables?

Environment variables configure:
- Database connections
- API keys and secrets
- Service URLs
- Feature flags

#### Required Files

**`.env` (Docker/Supabase)**
```env
# PostgreSQL
POSTGRES_PASSWORD=your-super-secret-postgres-password

# JWT
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters

# Supabase
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Studio
STUDIO_DEFAULT_ORGANIZATION=Mainstream
STUDIO_PORT=3001

# Dashboard
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=cosmos_admin_2024
```

**`.env.local` (Next.js)**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<matches-env-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<matches-env-service-role-key>

# Encryption (optional, for Figma tokens)
ENCRYPTION_KEY=<64-char-hex-string>

# LiteLLM (optional, for AI features)
LITELLM_API_BASE=http://localhost:4000
LITELLM_API_KEY=your-litellm-key

# Email (optional, for Resend)
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Cron (optional, for scheduled drops)
CRON_SECRET=<32-char-secret>
```

#### Critical: JWT Token Matching

⚠️ **The `ANON_KEY` and `SERVICE_ROLE_KEY` in `.env.local` MUST be signed with the same `JWT_SECRET` from `.env`.**

**Why?** PostgREST validates JWT signatures. Mismatch causes:
```
PGRST301: JWSError JWSInvalidSignature
```

**Solution:** Use `./setup.sh` to generate matching tokens automatically.

**Manual Token Generation (if needed):**

```javascript
// generate-tokens.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters';

// ANON_KEY
const anonToken = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60),
  },
  JWT_SECRET
);

// SERVICE_ROLE_KEY
const serviceToken = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60),
  },
  JWT_SECRET
);

console.log('ANON_KEY:', anonToken);
console.log('SERVICE_ROLE_KEY:', serviceToken);
```

```bash
node generate-tokens.js
```

### 2. Docker & Supabase Setup

#### Understanding Docker Compose

The `docker-compose.yml` defines all Supabase services:

```yaml
services:
  db:          # PostgreSQL database
  auth:        # GoTrue authentication
  rest:        # PostgREST API
  realtime:    # WebSocket server
  storage:     # S3-compatible storage
  meta:        # Database management
  studio:      # Web UI
  kong:        # API Gateway
```

#### Starting Services

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f db
docker compose logs -f auth
docker compose logs -f rest

# Restart services
docker compose restart

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

#### Accessing Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Next.js App** | http://localhost:3000 | Main application |
| **Supabase Studio** | http://localhost:3001 | Database UI |
| **Kong API Gateway** | http://localhost:8000 | Supabase API endpoint |
| **PostgreSQL** | localhost:5432 | Direct DB access |

**Supabase Studio Login:**
- Username: `supabase` (or from DASHBOARD_USERNAME)
- Password: `cosmos_admin_2024` (or from DASHBOARD_PASSWORD)

#### Health Checks

```bash
# Check all services are healthy
docker compose ps

# Should see:
# NAME                 STATUS
# db                   Up (healthy)
# auth                 Up (healthy)
# rest                 Up (healthy)
# ...
```

**If unhealthy:**

```bash
# Check logs
docker compose logs <service-name>

# Restart service
docker compose restart <service-name>

# Force recreate (picks up new env vars)
docker compose up -d --force-recreate <service-name>
```

### 3. Database Configuration

#### PostgreSQL Connection

**From Host Machine:**
```bash
psql -h localhost -p 5432 -U postgres -d postgres
```

**From Docker:**
```bash
docker compose exec db psql -U postgres
```

**Connection String:**
```
postgresql://postgres:your-password@localhost:5432/postgres
```

#### Database Structure

After migrations, you'll have:

- **25+ tables** - Core data structures
- **50+ indexes** - Performance optimization
- **80+ RLS policies** - Security rules
- **10+ functions** - Business logic
- **5+ triggers** - Automation

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema.

#### Applying Migrations

**Automatic (Recommended):**
```bash
./migrate.sh
```

**Manual:**
```bash
cd scripts/migrations

# Apply each migration
docker compose exec -T db psql -U postgres -d postgres < 001_initial_schema.sql
docker compose exec -T db psql -U postgres -d postgres < 002_seed_data.sql
# ... continue with all migrations
```

**Via Supabase Studio:**
1. Open http://localhost:3001
2. Navigate to SQL Editor
3. Paste migration contents
4. Click "Run"

#### Verifying Database

```sql
-- Check tables exist
\dt

-- Check users table
SELECT * FROM users LIMIT 5;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check triggers
SELECT * FROM information_schema.triggers;
```

### 4. Application Configuration

#### Node.js Setup

**Check Node Version:**
```bash
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
```

**Install Dependencies:**
```bash
# Clean install (recommended)
rm -rf node_modules package-lock.json
npm install

# Or regular install
npm install
```

#### TypeScript Configuration

TypeScript is configured via `tsconfig.json`. No changes needed for basic setup.

**Type Checking:**
```bash
npm run type-check
```

#### Next.js Configuration

**`next.config.js`** - Already configured with:
- Image optimization
- Environment variables
- Turbopack (dev)
- Output configuration

No changes needed for local development.

---

## Environment Configuration

### Development Environment

**Typical Development Setup:**

```
┌─────────────────────────────────────────┐
│  MacBook Pro / Linux Workstation        │
│                                          │
│  ┌────────────────────────────────┐    │
│  │ Docker Desktop                  │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │  Supabase Services       │  │    │
│  │  │  - PostgreSQL (5432)     │  │    │
│  │  │  - Kong Gateway (8000)   │  │    │
│  │  │  - Studio (3001)         │  │    │
│  │  └──────────────────────────┘  │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │ Terminal                        │    │
│  │  $ npm run dev                  │    │
│  │  Next.js (port 3000)            │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │ Browser                         │    │
│  │  http://localhost:3000          │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Environment Files Priority

Next.js loads environment variables in this order:
1. `.env.local` (highest priority, gitignored)
2. `.env.development` (for dev)
3. `.env.production` (for prod)
4. `.env` (lowest priority, committed)

**Best Practice:**
- Commit `.env.example` with placeholders
- Never commit `.env.local`
- Use `.env.local` for secrets

---

## Database Setup

### Initial Schema

The `001_initial_schema.sql` migration creates:

**Core Tables:**
- `users` - User profiles
- `teams` - Organizations (future)
- `streams` - Organizational units
- `assets` - Uploaded content

**Relationship Tables:**
- `asset_streams` - Assets ↔ Streams
- `user_follows` - User ↔ User
- `stream_follows` - User ↔ Stream
- `asset_likes` - User ↔ Asset

**Feature Tables:**
- `asset_comments` - Comments
- `asset_views` - View tracking
- `notifications` - Activity feed
- `drops` - Newsletters
- `drop_schedules` - Automation

### Seed Data

The `002_seed_data.sql` migration adds sample data:

- 2 users (Christian, John)
- 5 streams (mainstream, design-a-palooza, etc.)
- 16 assets (images, GIFs, videos, embeds)
- Comments, likes, follows
- 1 published drop

**Note:** Seed data is for development only. Don't apply to production.

### Row Level Security

Every table has RLS enabled:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Common Policy Patterns:**

```sql
-- Public read
CREATE POLICY "Public read" ON table_name
  FOR SELECT USING (true);

-- Authenticated write
CREATE POLICY "Authenticated write" ON table_name
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner only
CREATE POLICY "Owner only" ON table_name
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

### Backup & Restore

**Create Backup:**
```bash
# Full backup
docker compose exec db pg_dump -U postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
docker compose exec db pg_dump -U postgres --schema-only > schema.sql

# Data only
docker compose exec db pg_dump -U postgres --data-only > data.sql
```

**Restore Backup:**
```bash
# From file
docker compose exec -T db psql -U postgres < backup.sql

# Or via psql
docker compose exec db psql -U postgres
\i /path/to/backup.sql
```

---

## Application Setup

### Development Mode

```bash
npm run dev
```

**Features:**
- Hot reload (instant updates)
- Error overlay
- Fast Refresh
- Turbopack (faster builds)

### Production Build

```bash
npm run build
```

**Output:**
```
Route (app)                              Size     First Load JS
┌ ƒ /                                    142 B           151 kB
├ ƒ /home                                5.1 kB          156 kB
├ ƒ /e/[id]                              3.2 kB          154 kB
...
```

**Run Production Build:**
```bash
npm start
```

### Environment-Specific Configuration

**Development:**
- Detailed error messages
- Hot reload
- Source maps
- Development API endpoints

**Production:**
- Minified code
- Optimized bundles
- Error boundaries
- Production API endpoints

---

## Development Workflow

### Daily Workflow

```bash
# 1. Start Supabase (if not running)
docker compose up -d

# 2. Start Next.js
npm run dev

# 3. Make changes to code
# Files auto-reload

# 4. Test in browser
# Open http://localhost:3000

# 5. Commit changes
git add .
git commit -m "feat: add feature"
git push
```

### Git Workflow

**Branch Strategy:**

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to remote
git push -u origin feature/my-feature

# Create pull request
# Merge to main after review

# Deploy to production
```

**Commit Message Convention:**

```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

### Testing

**Type Checking:**
```bash
npm run type-check
```

**Linting:**
```bash
npm run lint
```

**Manual Testing:**
1. Start application
2. Test critical paths:
   - Signup/Login
   - Upload asset
   - Create stream
   - Add comment
   - Create drop

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Build succeeds without errors
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Backup created
- [ ] Rollback plan ready

### Deployment Options

#### Option 1: Vercel + Supabase Cloud (Recommended)

**Advantages:**
- ✅ Fully managed
- ✅ Global CDN
- ✅ Automatic scaling
- ✅ Zero downtime deploys
- ✅ Built-in monitoring

**Steps:**

1. **Deploy to Supabase Cloud**
```bash
# Export database schema
docker compose exec db pg_dump -U postgres --schema-only > schema.sql

# Create Supabase project at https://supabase.com
# Apply schema via Studio SQL Editor
```

2. **Configure Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

3. **Set Environment Variables**
   - Go to Vercel project settings
   - Add all variables from `.env.local`
   - Use Supabase Cloud URLs

4. **Test**
   - Visit your Vercel URL
   - Test all features
   - Monitor logs

#### Option 2: Self-Hosted (AWS/GCP/Digital Ocean)

**Advantages:**
- ✅ Full control
- ✅ Data sovereignty
- ✅ Cost predictable
- ✅ Customizable

**Architecture:**

```
┌─────────────────────────────────────────────┐
│  Load Balancer (Nginx/HAProxy)             │
│  https://mainstream.com                     │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐     ┌────▼──────┐
│ Next.js   │     │ Next.js   │
│ Instance 1│     │ Instance 2│
└───────────┘     └───────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐     ┌────▼──────┐
│ Supabase  │     │ Supabase  │
│ (Primary) │────▶│ (Replica) │
└───────────┘     └───────────┘
```

**Steps:**

1. **Provision Servers**
   - App servers (Next.js)
   - Database server (PostgreSQL)
   - Load balancer
   - Storage (S3/MinIO)

2. **Deploy Supabase**
```bash
# Copy docker-compose.yml to server
scp -r supabase-docker user@server:/opt/supabase

# SSH to server
ssh user@server

# Update .env with production values
cd /opt/supabase
nano .env

# Start services
docker compose up -d
```

3. **Deploy Next.js**
```bash
# Build locally
npm run build

# Copy to server
scp -r .next user@server:/opt/mainstream
scp package.json user@server:/opt/mainstream
scp package-lock.json user@server:/opt/mainstream

# SSH and start
ssh user@server
cd /opt/mainstream
npm install --production
npm start
```

4. **Configure Reverse Proxy**

**Nginx:**
```nginx
server {
  listen 80;
  server_name mainstream.com;
  
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

5. **Set up SSL**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d mainstream.com
```

### Post-Deployment

1. **Monitor Application**
   - Check logs for errors
   - Monitor response times
   - Watch database performance

2. **Set up Alerts**
   - Uptime monitoring (UptimeRobot)
   - Error tracking (Sentry)
   - Performance monitoring (Vercel Analytics)

3. **Create Backup Schedule**
```bash
# Cron job for daily backups
0 2 * * * pg_dump $DATABASE_URL > /backups/mainstream_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Common Issues

#### Issue: Services Won't Start

**Symptoms:**
```
Error: port 5432 already in use
```

**Solutions:**

```bash
# Check what's using the port
lsof -ti:5432

# Kill the process
lsof -ti:5432 | xargs kill -9

# Or change port in docker-compose.yml
POSTGRES_PORT=5433
```

#### Issue: JWT Signature Error

**Symptoms:**
```
PGRST301: JWSError JWSInvalidSignature
```

**Cause:** JWT tokens don't match JWT_SECRET.

**Solution:**
```bash
# Regenerate tokens
./setup.sh

# Update .env.local with new tokens
# Restart services
docker compose up -d --force-recreate rest kong
```

#### Issue: Permission Denied

**Symptoms:**
```
42501: permission denied for table X
```

**Cause:** Missing grants or RLS blocking query.

**Solution:**

```sql
-- Check grants
\dp table_name

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON table_name TO authenticated;
GRANT SELECT ON table_name TO anon;
GRANT ALL ON table_name TO service_role;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

#### Issue: Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

```bash
# Check database is running
docker compose ps db

# Check logs
docker compose logs db

# Restart database
docker compose restart db

# Check connection string
echo $DATABASE_URL
```

#### Issue: Migrations Failed

**Symptoms:**
```
ERROR: relation "X" already exists
```

**Solutions:**

```bash
# Check which migrations have run
docker compose exec db psql -U postgres -c "\dt"

# Manually check if changes applied
docker compose exec db psql -U postgres -c "\d table_name"

# Migrations are idempotent, safe to rerun
./migrate.sh
```

### Getting Help

**Resources:**
- [Documentation](./README.md) - All documentation
- [Architecture Guide](./ARCHITECTURE.md) - System design
- [API Reference](./API_REFERENCE.md) - API endpoints
- [Database Schema](./DATABASE_SCHEMA.md) - Database structure
- [Migrations Guide](./MIGRATIONS.md) - Migration procedures

**Community:**
- GitHub Issues - Report bugs
- Discussions - Ask questions
- Discord - Real-time help (if available)

---

## Appendices

### A. Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Next.js | Main application |
| 3001 | Studio | Supabase dashboard |
| 5432 | PostgreSQL | Database |
| 8000 | Kong | API Gateway |
| 5000 | Auth | GoTrue auth |
| 3000 | Storage | Object storage |
| 4000 | Realtime | WebSocket |

### B. File Structure

```
mainstream/
├── .env                    # Docker environment (gitignored)
├── .env.local             # Next.js environment (gitignored)
├── .env.example           # Template for .env
├── .env.local.example     # Template for .env.local
├── docker-compose.yml     # Docker services
├── setup.sh               # Environment setup script
├── migrate.sh             # Migration script
├── package.json           # Dependencies
├── next.config.js         # Next.js config
├── tsconfig.json          # TypeScript config
├── app/                   # Next.js pages
├── components/            # React components
├── lib/                   # Utilities
├── scripts/               # Helper scripts
│   └── migrations/        # Database migrations
└── docs/                  # Documentation
```

### C. Command Reference

**Docker:**
```bash
docker compose up -d              # Start services
docker compose down               # Stop services
docker compose ps                 # Check status
docker compose logs -f            # View logs
docker compose restart <service>  # Restart service
```

**Database:**
```bash
docker compose exec db psql -U postgres         # Connect
docker compose exec -T db psql -U postgres < file.sql  # Run SQL
./migrate.sh                                     # Apply migrations
```

**Next.js:**
```bash
npm run dev          # Development
npm run build        # Production build
npm start            # Run production
npm run type-check   # Type checking
npm run lint         # Linting
```

### D. Security Checklist

**Before Production:**

- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET
- [ ] Use HTTPS/SSL
- [ ] Enable firewall
- [ ] Set up backups
- [ ] Review RLS policies
- [ ] Remove seed data
- [ ] Disable debug mode
- [ ] Set strong CORS policies
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Review logs regularly

### E. Performance Tuning

**Database:**
```sql
-- Analyze queries
EXPLAIN ANALYZE SELECT ...;

-- Update statistics
ANALYZE;

-- Reindex
REINDEX TABLE table_name;
```

**Next.js:**
```javascript
// Use React.memo
export const Component = React.memo(function Component() { ... });

// Dynamic imports
const HeavyComponent = dynamic(() => import('./heavy'));

// Image optimization
import Image from 'next/image';
<Image src={url} width={400} height={300} />
```

---

**Setup complete! 🎉**

**Next Steps:**
- Create your first asset
- Invite team members
- Configure integrations
- Explore features

For questions, see [Troubleshooting](#troubleshooting) or check the [documentation index](./README.md).
