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
- **React Query** - Data fetching, caching, and cache invalidation
- **Framer Motion** - Animations
- **canvas-confetti** - Celebration animations
- **@tanstack/react-virtual** - UI virtualization for long lists
- **LiteLLM** - AI integration (Gemini 2.5 Flash)
- **React Email** - Email-compatible components
- **Resend** - Email delivery
- **FFmpeg** - Video thumbnail generation (via fluent-ffmpeg)

## Current Status

✅ **Complete** - Data migration from mock data to Supabase  
✅ **Complete** - Authentication (signup/login/logout)  
✅ **Complete** - Streams feature (many-to-many asset relationships)  
✅ **Complete** - Stream following (follow streams, see posts in Following tab)  
✅ **Complete** - Stream bookmarks (external links with favicons)  
✅ **Complete** - Private stream members (add/remove users with role-based access)  
✅ **Complete** - Stream editing (edit name, description, privacy toggle)  
✅ **Complete** - Real-time likes and comments  
✅ **Complete** - Comment likes  
✅ **Complete** - View tracking ("Seen by X people" with viewer tooltip)  
✅ **Complete** - Following feed (users + streams)  
✅ **Complete** - User profiles and settings  
✅ **Complete** - Performance optimizations (N+1 fixes, memoization, server prefetch)  
✅ **Complete** - Asset and stream deletion  
✅ **Complete** - Draft deletion (delete drafts from cards and editor)  
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
✅ **Complete** - Micro-animations and delightful interactions (confetti, animated like button)  
✅ **Complete** - Weekly feed grouping (posts grouped by week with contributor avatars)  
✅ **Complete** - Feed layout toggle (grid vs detailed view)  
✅ **Complete** - Performance optimizations (React Query, memoization, error boundaries, dynamic imports)  
✅ **Complete** - Centralized constants (cache times, page sizes, timing)  

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
│   ├── constants/       # Centralized constants (cache, page sizes, timing)
│   ├── queries/         # React Query key factories and fetch functions
│   ├── utils/           # Utilities (AI, encryption, confetti, week-grouping, string, etc.)
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
- Private stream member management (owner, admin, member roles)
- Edit stream name, description, and privacy settings

### Assets
Uploaded designs and images organized by streams. Supports likes, comments, view tracking ("Seen by X people" with hover tooltip), and deletion by owner.

**New Asset Types:**
- **Images** - Standard image upload with optimization
- **Animated GIFs** - Animation preserved, GIF badge in feed, hover to play
- **WebM Videos** - Up to 50MB, auto-thumbnails via FFmpeg for cards/previews
- **Figma Embeds** - Paste Figma URL, auto-thumbnails (frame-specific with token)
- **Loom Embeds** - Paste Loom URL, auto-thumbnails via oEmbed

### Figma Integration
Paste a Figma URL to embed designs directly. Features:
- Automatic thumbnails via oEmbed API
- Frame-specific thumbnails (connect Figma in Settings)
- Interactive embed viewer in detail page
- Thumbnails stored locally (never expire)

### Search
Real-time search across assets, users, and streams with auto-suggest and accurate total counts.

### Home Feed
The main feed has two tabs (Recent/Following) with:
- **Weekly Grouping** - Posts organized by week ("This week", "Last week", etc.)
- **Contributor Avatars** - Stacked avatars showing who posted each week
- **Layout Toggle** - Switch between grid (visual) and detailed (list) views

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

# Install FFmpeg (required for video thumbnails)
brew install ffmpeg  # macOS
# or: apt-get install ffmpeg  # Ubuntu

# Start Supabase (Docker required)
cd supabase-docker && docker-compose up -d

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Documentation

For authentication setup details, see `docs/auth/`.
