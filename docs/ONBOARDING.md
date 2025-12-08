# Mainstream - Quick Start Guide

Design collaboration platform for internal teams. Share work, organize into streams, and collaborate.

## What is Mainstream?

A Pinterest-style design sharing platform with:
- **Streams** - Flexible organizational units (like projects + tags)
- **Stream Following** - Follow streams to see their posts in your feed
- **Stream Bookmarks** - Add external links (Jira, Figma, Notion) to streams
- **Private Stream Members** - Add users to private streams with role-based access
- **Stream Editing** - Edit name, description, and privacy settings
- **Assets** - Uploaded designs with likes and comments
  - Images (JPG, PNG, WebP)
  - Animated GIFs (with GIF badge and hover animation)
  - Figma embeds (paste URL, auto-thumbnails)
- **Following** - See work from people and streams you follow
- **Search** - Find assets, users, and streams
- **Real-time** - Live notifications, typing indicators, instant updates

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
├── streams/          # Stream headers, grids, pickers
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

**Features:**
- Follow streams to see posts in your Following feed
- Add bookmarks (external links) with favicons
- Contributor tooltip showing who has posted

**Database:** `streams` table + `asset_streams` junction table + `stream_follows` + `stream_bookmarks`

### Assets

Uploaded images and designs. Features:
- Likes with real-time updates
- Threaded comments
- Multiple stream assignment
- Owner can delete

**Database:** `assets` table

### Following Feed

Home page has two tabs:
- **Recent** - All assets (chronological)
- **Following** - Assets from users AND streams you follow

**Database:** `user_follows` table + `stream_follows` table

## Key Features

### Authentication
- Email/password signup and login
- Supabase Auth integration
- Auto-confirmation for local dev

### Search
- Real-time search across assets, users, streams
- Auto-suggest dropdown
- Accurate total counts
- Debounced queries (300ms)

### Real-time Updates
- Like counts update instantly
- Comment counts sync across tabs
- Notification badges update live
- Typing indicators ("X is typing...")
- Supabase Realtime subscriptions

### Figma Integration
- Paste Figma URLs to embed designs
- Automatic thumbnails via oEmbed
- Frame-specific thumbnails (connect account in Settings)
- Interactive embed viewer

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

### Upload an Image or GIF

1. Log in
2. Click "Create" button
3. Select "Upload Image"
4. Select file (JPG, PNG, WebP, or animated GIF)
5. Add to streams (type `#stream-name` or use picker)
6. Upload

**Note:** Animated GIFs show a "GIF" badge and animate on hover in the feed.

### Add a Figma Design

1. Log in
2. Click "Create" button
3. Select "Add via URL"
4. Paste Figma URL (file, design, prototype, or specific frame)
5. Preview loads automatically
6. Add title, description, and streams
7. Add

**Pro Tip:** For frame-specific thumbnails, connect your Figma account in Settings → Connected Accounts.

### Create a Stream

Streams are created automatically when mentioned with `#` during upload or via the stream picker.

### Follow a User

Visit user profile (`/u/username`) → Click "Follow"

### Follow a Stream

Visit stream page (`/stream/stream-name`) → Click "Follow"

### Add a Bookmark to a Stream

1. Visit stream page (`/stream/stream-name`)
2. Click "Add Bookmark"
3. Enter URL and optional title
4. Favicon is displayed automatically

### Edit a Stream

1. Visit stream page (`/stream/stream-name`)
2. Click "..." menu → "Edit Stream"
3. Change name, description, or privacy
4. Click "Save Changes" (auto-redirects if name changes)

### Add Members to a Private Stream

1. Create or edit a stream to make it private
2. Visit stream page → Click "..." menu → "Manage Members"
3. Search for users and click "Add"
4. Members can view and contribute to the stream
5. Remove members by clicking the X button

**Roles:**
- **Owner** - Full access, cannot be removed
- **Admin** - Can add/remove regular members
- **Member** - Can view and contribute

### Delete an Asset

Open asset detail → Click "..." menu → Delete (owner only)

### Connect Figma Account (for frame-specific thumbnails)

1. Go to Figma → Settings → Personal access tokens
2. Create a new token with read access
3. In Mainstream: Settings → Connected Accounts
4. Paste your Figma token and click Connect
5. Now when you add Figma URLs with specific frames, you'll get accurate thumbnails

## Database Schema

### Main Tables

- `users` - User profiles (+ Figma token fields)
- `streams` - Organizational units
- `assets` - Uploaded designs (+ embed support fields)
- `asset_streams` - Many-to-many relationships
- `asset_likes` - Like tracking
- `asset_comments` - Comments with threading
- `comment_likes` - Comment like tracking
- `user_follows` - User following relationships
- `stream_follows` - Stream following relationships
- `stream_bookmarks` - External links for streams
- `stream_members` - Private stream membership (role-based)
- `notifications` - Activity feed (+ comment deep linking)

### Row Level Security (RLS)

All tables have RLS policies:
- Public read for assets and streams
- Authenticated write
- Owner-only delete

## API Routes

### Assets
- `GET /api/assets` - List assets (paginated)
- `POST /api/assets/upload` - Upload new asset (images + GIFs)
- `POST /api/assets/embed` - Create embed from URL (Figma)
- `DELETE /api/assets/[id]` - Delete asset (owner only)
- `GET /api/assets/following` - Assets from followed users
- `POST /api/assets/[id]/like` - Toggle like
- `GET /api/assets/[id]/comments` - Get comments

### Streams
- `GET /api/streams` - List streams (respects membership)
- `POST /api/streams` - Create stream
- `GET /api/streams/[id]` - Get stream details
- `PUT /api/streams/[id]` - Update stream (name, description, privacy)
- `DELETE /api/streams/[id]` - Delete stream (owner only)
- `GET /api/streams/[id]/follow` - Get follow status
- `POST /api/streams/[id]/follow` - Follow stream
- `DELETE /api/streams/[id]/follow` - Unfollow stream
- `GET /api/streams/[id]/bookmarks` - List bookmarks
- `POST /api/streams/[id]/bookmarks` - Add bookmark
- `DELETE /api/streams/[id]/bookmarks/[bookmarkId]` - Delete bookmark
- `GET /api/streams/[id]/members` - List members (private streams)
- `POST /api/streams/[id]/members` - Add member (owner/admin)
- `DELETE /api/streams/[id]/members?user_id=xxx` - Remove member

### Users
- `GET /api/users/[username]` - Get user profile
- `POST /api/users/[username]/follow` - Toggle follow
- `PUT /api/users/me` - Update current user settings
- `GET /api/users/me/integrations` - Get integration status
- `POST /api/users/me/integrations` - Connect/disconnect integrations (Figma)

### Search
- `GET /api/search?q=query&type=assets` - Search with total counts

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

**Recent Migrations:**
- `003_stream_follows.sql` - Stream following feature
- `004_stream_bookmarks.sql` - Stream bookmarks feature
- `011_notifications_rls_policies.sql` - Real-time notifications
- `016_add_embed_support.sql` - Figma embeds
- `017_add_figma_integration.sql` - Figma token storage
- `032_stream_members_rls_policies.sql` - Stream members RLS
- `033_fix_streams_rls_for_members.sql` - Streams visibility for members

### Component Changes

- Use `React.memo()` for performance
- Prefer server components when possible
- Use client components only when needed (hooks, interactivity)
- Pre-fetch like data server-side to avoid UI flashes

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
