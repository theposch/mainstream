# Cosmos - Quick Start Guide

Design collaboration platform for internal teams. Share work, organize into streams, and collaborate.

## What is Cosmos?

A Pinterest-style design sharing platform with:
- **Streams** - Flexible organizational units (like projects + tags)
- **Assets** - Uploaded designs with likes, comments, and color extraction
- **Following** - See work from people you follow
- **Search** - Find assets, users, and streams

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Framer Motion

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase

```bash
cd supabase-docker
docker-compose up -d
```

**Requirements:** Docker Desktop with 8GB RAM

### 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get keys from Supabase Studio at http://localhost:8000 → Settings → API

### 4. Apply Database Schema

```bash
cd scripts/migrations
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 001_initial_schema.sql
docker-compose -f ../../supabase-docker/docker-compose.yml exec db psql -U postgres < 002_seed_data.sql
```

Or paste into Supabase Studio SQL Editor.

### 5. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
app/
├── home/              # Main feed with masonry grid
├── e/[id]/            # Asset detail pages
├── stream/[slug]/     # Stream pages
├── streams/           # All streams listing
├── u/[username]/      # User profiles
├── auth/              # Signup/Login
└── api/               # API routes

components/
├── assets/           # Asset cards, detail views, comments
├── streams/          # Stream headers, grids
├── users/            # Profile headers, tabs
├── layout/           # Navbar, search, notifications
└── ui/               # Base components (shadcn)

lib/
├── supabase/        # Database clients
├── auth/            # Auth utilities
├── hooks/           # Custom hooks
└── types/           # TypeScript types
```

## Core Concepts

### Streams

Organizational units that support many-to-many relationships. An asset can belong to multiple streams:
- `#mobile-app` (the product)
- `#onboarding` (the feature)
- `#design-system` (the system)

**Database:** `streams` table + `asset_streams` junction table

### Assets

Uploaded images and designs. Features:
- Automatic color extraction
- Likes with real-time updates
- Threaded comments
- Multiple stream assignment

**Database:** `assets` table

### Following Feed

Home page has two tabs:
- **Recent** - All assets (chronological)
- **Following** - Assets from users you follow

**Database:** `user_follows` table

## Key Features

### Authentication
- Email/password signup and login
- Supabase Auth integration
- Auto-confirmation for local dev

### Search
- Real-time search across assets, users, streams
- Auto-suggest dropdown
- Debounced queries (300ms)

### Real-time Updates
- Like counts update instantly
- Comment counts sync across tabs
- Supabase Realtime subscriptions

### Mobile Support
- Responsive masonry grid
- Touch-friendly interactions
- Bottom sheet for comments (mobile)
- Modal overlay for details (desktop)

## Common Tasks

### Create a New User

```bash
# Via Supabase Studio
# Go to Authentication → Users → Add User
# Or use the signup page at /auth/signup
```

### Upload an Asset

1. Log in
2. Click "Create" button
3. Select file
4. Add to streams (type `#stream-name`)
5. Upload

### Create a Stream

Streams are created automatically when mentioned with `#` during upload or via the streams management UI.

### Follow a User

Visit user profile (`/u/username`) → Click "Follow"

## Database Schema

### Main Tables

- `users` - User profiles
- `streams` - Organizational units
- `assets` - Uploaded designs
- `asset_streams` - Many-to-many relationships
- `asset_likes` - Like tracking
- `asset_comments` - Comments with threading
- `comment_likes` - Comment like tracking
- `user_follows` - Following relationships
- `notifications` - Activity feed

### Row Level Security (RLS)

All tables have RLS policies:
- Public read for assets and streams
- Authenticated write
- Owner-only delete

## API Routes

### Assets
- `GET /api/assets` - List assets (paginated)
- `POST /api/assets/upload` - Upload new asset
- `GET /api/assets/following` - Assets from followed users
- `POST /api/assets/[id]/like` - Toggle like
- `GET /api/assets/[id]/comments` - Get comments

### Streams
- `GET /api/streams` - List streams
- `POST /api/streams` - Create stream
- `GET /api/streams/[id]` - Get stream details
- `PUT /api/streams/[id]` - Update stream

### Users
- `GET /api/users/[username]` - Get user profile
- `POST /api/users/[username]/follow` - Toggle follow
- `PUT /api/users/me` - Update current user settings

### Search
- `GET /api/search?q=query&type=assets` - Search

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Supabase Connection Failed

```bash
# Check Docker is running
docker ps

# Restart services
cd supabase-docker
docker-compose restart

# Check logs
docker-compose logs -f
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [STREAMS_FEATURE.md](./STREAMS_FEATURE.md) for streams deep dive
- Read [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database details
- Check `docs/auth/` for authentication docs
- Review `docs/archive/` for historical context

## Development Tips

### Hot Reload Issues

If changes aren't reflecting:
1. Check terminal for errors
2. Clear browser cache
3. Restart dev server
4. Clear `.next` cache

### Database Changes

After schema changes:
1. Create new migration in `scripts/migrations/`
2. Apply migration via psql or Studio
3. Update TypeScript types in `lib/types/database.ts`

### Component Changes

- Use `React.memo()` for performance
- Prefer server components when possible
- Use client components only when needed (hooks, interactivity)

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
