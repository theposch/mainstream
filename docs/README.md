# Mainstream - Documentation

Design collaboration platform for internal teams to share work and organize into streams.

## Quick Links

- **[Getting Started](./ONBOARDING.md)** - Project overview and setup
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Database configuration
- **[Streams Feature](./STREAMS_FEATURE.md)** - Core organizational system
- **[Backend Integration](./BACKEND_INTEGRATION.md)** - API and database details
- **[AI Agent Guide](./AI_AGENT_GUIDE.md)** - For AI assistants working on this codebase

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Supabase** - PostgreSQL database + Auth + Storage
- **Framer Motion** - Animations

## Current Status

✅ **Complete** - Data migration from mock data to Supabase  
✅ **Complete** - Authentication (signup/login/logout)  
✅ **Complete** - Streams feature (many-to-many asset relationships)  
✅ **Complete** - Stream following (follow streams, see posts in Following tab)  
✅ **Complete** - Stream bookmarks (external links with favicons)  
✅ **Complete** - Real-time likes and comments  
✅ **Complete** - Following feed (users + streams)  
✅ **Complete** - User profiles and settings  
✅ **Complete** - Performance optimizations (N+1 fixes, memoization, server prefetch)  
✅ **Complete** - Asset and stream deletion  

## Project Structure

```
mainstream/
├── app/                    # Next.js pages and API routes
│   ├── home/              # Main feed
│   ├── e/[id]/            # Asset detail pages
│   ├── stream/[slug]/     # Stream pages
│   ├── streams/           # All streams listing
│   ├── u/[username]/      # User profiles
│   ├── auth/              # Auth pages (signup/login)
│   └── api/               # API routes
├── components/            # React components
│   ├── assets/           # Asset cards and detail views
│   ├── streams/          # Stream components
│   ├── users/            # User profile components
│   ├── layout/           # Navigation, search, etc.
│   └── ui/               # Base UI components (shadcn)
├── lib/                  # Utilities and business logic
│   ├── supabase/        # Database clients
│   ├── auth/            # Auth utilities
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts
│   └── types/           # TypeScript types
└── docs/                # Documentation
```

## Core Features

### Streams
Organizational units that support many-to-many relationships with assets. An asset can belong to multiple streams (e.g., #mobile-app, #onboarding, #design-system).

**New in Dec 2025:**
- Follow streams to see their posts in your Following feed
- Add bookmarks (external links to Jira, Figma, Notion) with favicons
- Contributor tooltip showing who has posted to the stream

### Assets
Uploaded designs and images organized by streams. Supports likes, comments, and deletion by owner.

### Search
Real-time search across assets, users, and streams with auto-suggest and accurate total counts.

### Following Feed
See assets from users and streams you follow.

## Development

```bash
# Install dependencies
npm install

# Start Supabase (Docker required)
cd supabase-docker && docker-compose up -d

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Documentation

For authentication setup details, see `docs/auth/`.
