# Mainstream - Documentation

Design collaboration platform for internal teams to share work and organize into streams.

## Quick Links

- **[Getting Started](./ONBOARDING.md)** - Project overview and setup
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Database configuration
- **[Streams Feature](./STREAMS_FEATURE.md)** - Core organizational system
- **[Drops Feature](./DROPS_FEATURE.md)** - AI-powered newsletters
- **[Backend Integration](./BACKEND_INTEGRATION.md)** - API and database details
- **[AI Agent Guide](./AI_AGENT_GUIDE.md)** - For AI assistants working on this codebase

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Supabase** - PostgreSQL database + Auth + Storage
- **Framer Motion** - Animations
- **LiteLLM** - AI integration (Gemini 2.5 Flash)
- **React Email** - Email-compatible components
- **Resend** - Email delivery

## Current Status

✅ **Complete** - Data migration from mock data to Supabase  
✅ **Complete** - Authentication (signup/login/logout)  
✅ **Complete** - Streams feature (many-to-many asset relationships)  
✅ **Complete** - Stream following (follow streams, see posts in Following tab)  
✅ **Complete** - Stream bookmarks (external links with favicons)  
✅ **Complete** - Real-time likes and comments  
✅ **Complete** - Comment likes  
✅ **Complete** - View tracking ("Seen by X people" with viewer tooltip)  
✅ **Complete** - Following feed (users + streams)  
✅ **Complete** - User profiles and settings  
✅ **Complete** - Performance optimizations (N+1 fixes, memoization, server prefetch)  
✅ **Complete** - Asset and stream deletion  
✅ **Complete** - Animated GIF support (upload, preview, badge, hover animation)  
✅ **Complete** - Figma embeds (paste URL, auto-thumbnails, frame-specific previews)  
✅ **Complete** - Real-time notifications with typing indicators  
✅ **Complete** - Comment deep linking (click notification → jump to comment)  
✅ **Complete** - Token encryption (AES-256-GCM for API tokens)  
✅ **Complete** - Drops (AI-powered newsletters with block-based editor)  
✅ **Complete** - AI description generation (LiteLLM + Gemini 2.5 Flash)  
✅ **Complete** - Image galleries in drops (grid and featured layouts)  
✅ **Complete** - Unlisted assets (drop-only images hidden from feed)  
✅ **Complete** - Notification settings (toggle by type: likes, comments, follows, mentions)  
✅ **Complete** - View tracking improvements (atomic RPC, real-time count updates)  

## Project Structure

```
mainstream/
├── app/                    # Next.js pages and API routes
│   ├── home/              # Main feed
│   ├── e/[id]/            # Asset detail pages
│   ├── stream/[slug]/     # Stream pages
│   ├── streams/           # All streams listing
│   ├── drops/             # Drops (AI newsletters)
│   │   └── [id]/edit/     # Block-based drop editor
│   ├── u/[username]/      # User profiles
│   ├── auth/              # Auth pages (signup/login)
│   └── api/               # API routes
├── components/            # React components
│   ├── assets/           # Asset cards and detail views
│   ├── streams/          # Stream components
│   ├── drops/            # Drop components and block editor
│   │   └── blocks/       # Notion-like block components
│   ├── users/            # User profile components
│   ├── layout/           # Navigation, search, etc.
│   └── ui/               # Base UI components (shadcn)
├── lib/                  # Utilities and business logic
│   ├── supabase/        # Database clients
│   ├── auth/            # Auth utilities
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts
│   ├── utils/           # Utilities (AI, encryption, etc.)
│   └── types/           # TypeScript types
└── docs/                # Documentation
```

## Core Features

### Streams
Organizational units that support many-to-many relationships with assets. An asset can belong to multiple streams (e.g., #mobile-app, #onboarding, #design-system).

**Features:**
- Follow streams to see their posts in your Following feed
- Add bookmarks (external links to Jira, Figma, Notion) with favicons
- Contributor tooltip showing who has posted to the stream

### Assets
Uploaded designs and images organized by streams. Supports likes, comments, view tracking ("Seen by X people" with hover tooltip), and deletion by owner.

**New Asset Types:**
- **Images** - Standard image upload with optimization
- **Animated GIFs** - Animation preserved, GIF badge in feed, hover to play
- **Figma Embeds** - Paste Figma URL, auto-thumbnails (frame-specific with token)

### Figma Integration
Paste a Figma URL to embed designs directly. Features:
- Automatic thumbnails via oEmbed API
- Frame-specific thumbnails (connect Figma in Settings)
- Interactive embed viewer in detail page
- Thumbnails stored locally (never expire)

### Search
Real-time search across assets, users, and streams with auto-suggest and accurate total counts.

### Following Feed
See assets from users and streams you follow.

### Real-time Features
- Live notification updates
- Typing indicators in comments
- Comment deep linking (click notification → jump to comment)
- Real-time view count updates (via callback)

### Notification Settings
Control which notifications you receive:
- **Master toggle** - Enable/disable all in-app notifications
- **By type** - Likes, Comments, Follows, Mentions
- Settings persist and are respected when notifications are created

### Drops (AI Newsletter)
AI-powered newsletters that summarize your team's weekly design work. Features:
- **Block-based Editor** - Notion-like interface with text, headings, posts, galleries
- **AI Generation** - Generate summaries using LiteLLM (Gemini 2.5 Flash)
- **Image Galleries** - Multi-image blocks with grid/featured layouts
- **Email Preview** - React Email components for cross-client compatibility
- **Unlisted Assets** - Upload images that only appear in drops (not in feed)
- **Display Controls** - Fit/Cover modes with adjustable crop position

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
