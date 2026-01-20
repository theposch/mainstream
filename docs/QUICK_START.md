# Quick Start Guide

Get Mainstream running in **10 minutes**.

---

## Prerequisites

- **Docker Desktop** (8GB RAM minimum)
- **Node.js** 18+ and npm
- **FFmpeg** (for video thumbnails)

---

## Installation

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd mainstream

# Install dependencies
npm install

# Install FFmpeg
brew install ffmpeg  # macOS
# or: apt-get install ffmpeg  # Ubuntu/Debian
```

### 2. Configure Environment

**Option A: Automatic Setup (Recommended)**
```bash
./setup.sh
```
This generates secure secrets and creates `.env` with proper JWT tokens.

**Option B: Manual Setup**
```bash
# Copy example files
cp .env.example .env
cp .env.local.example .env.local

# Edit .env and set your passwords/secrets
# Edit .env.local and ensure JWT tokens match .env
```

⚠️ **Important:** JWT tokens in `.env.local` must be signed with the same `JWT_SECRET` from `.env`. See [JWT Token Matching](./DATABASE_SETUP.md#jwt-token-matching).

### 3. Start Services

```bash
# Start Supabase (PostgreSQL, Auth, Storage, Realtime)
docker compose up -d

# Wait for services to be healthy (~30 seconds)
docker compose ps
```

### 4. Apply Database Schema

```bash
# Run all migrations
./migrate.sh

# Or manually:
cd scripts/migrations
docker compose exec -T db psql -U postgres -d postgres < 001_initial_schema.sql
docker compose exec -T db psql -U postgres -d postgres < 002_seed_data.sql
# ... continue with remaining migrations
```

### 5. Start Development Server

```bash
npm run dev
```

Open **http://localhost:3000**

---

## First Steps

### Create Your Account

1. Go to http://localhost:3000/auth/signup
2. Enter email and password
3. Account created automatically (no email confirmation needed locally)

### Upload Your First Design

1. Click **"Create"** button
2. Select **"Upload Image"**
3. Choose a file (JPG, PNG, WebP, GIF, or WebM video)
4. Add to streams by typing `#stream-name`
5. Click **"Upload"**

### Create a Stream

Streams are created automatically when you mention them with `#` during upload. Or:

1. Visit `/streams`
2. Click **"New Stream"**
3. Enter name and description
4. Set privacy (public or private)

### Follow Users and Streams

- **Follow users:** Visit their profile → Click "Follow"
- **Follow streams:** Visit stream page → Click "Follow"
- See followed content in the **"Following"** tab

### Create a Newsletter (Drop)

1. Go to `/drops` (or `/mainframe`)
2. Click **"New Drop"**
3. Set date range and filters
4. Click **"Generate with AI"** or **"Create"**
5. Edit blocks in the block editor
6. Click **"Publish"** when ready

### Schedule Recurring Newsletters

1. Go to `/drops` → Click **"New Drop Schedule"**
2. Configure frequency (Weekly, Biweekly, Monthly, Custom)
3. Set generation time and timezone
4. Add filters (streams, users, date range)
5. Click **"Create Schedule"**

Drops will be generated automatically at the scheduled time!

---

## Quick Tour

### Main Navigation

| Page | URL | Description |
|------|-----|-------------|
| Home | `/home` | Recent and Following feeds |
| Streams | `/streams` | Browse all streams |
| People | `/people` | Discover users |
| Drops | `/drops` or `/mainframe` | Newsletters and schedules |
| Profile | `/u/[username]` | Your or others' profiles |
| Settings | Click avatar → Settings | Account and preferences |

### Key Features

**Asset Types:**
- Images (JPG, PNG, WebP)
- Animated GIFs (with hover animation)
- Videos (WebM, up to 50MB, auto-thumbnails)
- Figma embeds (paste URL, auto-thumbnails)
- Loom embeds (paste URL, video previews)

**Interactions:**
- Like assets and comments
- Comment with real-time updates
- Follow users and streams
- Bookmark external links on streams
- View tracking (see who viewed)

**Organization:**
- Assets can belong to multiple streams
- Streams can be public or private
- Private streams have role-based members
- Stream contributors shown in UI

**AI Features:**
- Generate newsletter summaries
- Enhance drop descriptions
- Automated drop generation on schedule

---

## Development Workflow

### Making Changes

```bash
# Start dev server (hot reload enabled)
npm run dev

# Make code changes
# Changes auto-reload in browser

# Check for TypeScript errors
npm run type-check

# Format code
npm run format
```

### Database Changes

```bash
# Create new migration
cd scripts/migrations
touch 999_your_migration.sql

# Write your SQL changes
# Apply migration
docker compose exec -T db psql -U postgres -d postgres < 999_your_migration.sql

# Update TypeScript types in lib/types/database.ts
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make commits
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

---

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Mainstream** | http://localhost:3000 | Your signup credentials |
| **Supabase Studio** | http://localhost:3001 | See `.env` for password |
| **PostgreSQL** | localhost:5432 | postgres / (see `.env`) |
| **Kong API** | http://localhost:8000 | N/A |

---

## Common Issues

### Services Won't Start

```bash
# Check Docker is running
docker ps

# View logs
docker compose logs -f

# Restart services
docker compose restart
```

### JWT Signature Errors

Your JWT tokens don't match your `JWT_SECRET`. Run:
```bash
./setup.sh  # Regenerates matching tokens
```

Or see [JWT Token Matching Guide](./DATABASE_SETUP.md#jwt-token-matching).

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Database Connection Failed

```bash
# Ensure services are healthy
docker compose ps

# Should show all services as "healthy" or "running"
# If not, check logs:
docker compose logs db auth rest
```

### Migrations Failed

```bash
# Check if you're in the right directory
cd scripts/migrations

# Verify database is accessible
docker compose exec db psql -U postgres -c "SELECT version();"

# Try running migrations one by one
docker compose exec -T db psql -U postgres -d postgres < 001_initial_schema.sql
```

---

## Next Steps

Now that you're up and running:

1. **Explore Features** - Try uploading assets, creating streams, following users
2. **Read Feature Docs** - [Streams](./STREAMS_FEATURE.md), [Drops](./DROPS_FEATURE.md), [Scheduled Drops](./SCHEDULED_DROPS.md)
3. **Check Database** - [Database Setup Guide](./DATABASE_SETUP.md)
4. **Build Features** - [Development Guide](./DEVELOPMENT.md), [API Reference](./API_REFERENCE.md)
5. **Deploy** - [Production Deployment](./SETUP.md#production-deployment)

---

## Getting Help

| Issue Type | Resource |
|------------|----------|
| Setup problems | [Database Setup](./DATABASE_SETUP.md#troubleshooting) |
| API questions | [API Reference](./API_REFERENCE.md) |
| Feature usage | [Feature docs](./STREAMS_FEATURE.md) |
| Development | [Development Guide](./DEVELOPMENT.md) |

---

**Ready to dive deeper?** Check out the [Complete Setup Guide](./SETUP.md) or [Architecture Overview](./ARCHITECTURE.md).
