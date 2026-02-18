# CLAUDE.md — Mainstream Codebase Guide

This document provides context for AI assistants working in this repository.

## Project Overview

**Mainstream** is a design collaboration platform for internal teams. It lets users upload and share design assets (images, GIFs, WebM videos, Figma/Loom embeds), organize them into **Streams**, engage via comments and likes, and generate AI-powered newsletters called **Drops**.

- **Framework**: Next.js 16 (App Router, `output: 'standalone'`)
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL via self-hosted Supabase
- **Auth**: Supabase Auth (GoTrue, cookie-based SSR sessions)
- **Styling**: Tailwind CSS 4 + shadcn/ui + Radix UI primitives
- **State**: TanStack React Query v5 (server-fetched initial data + client-side caching)
- **AI**: LiteLLM proxy (OpenAI-compatible, default model: `gemini/gemini-2.5-flash`)
- **Image Processing**: Sharp (3 variants per upload: full, medium 800px, thumbnail 300px)
- **Video**: WebM only; FFmpeg for thumbnail generation (optional)
- **Email**: Resend + React Email components

---

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint (Next.js core-web-vitals + TypeScript rules)
```

No test suite is currently configured.

---

## Directory Structure

```
mainstream/
├── app/                        # Next.js App Router
│   ├── admin/                  # Admin panel (layout + page)
│   ├── api/                    # Route Handlers (REST API)
│   │   ├── admin/              # Admin API: analytics, users, streams, merge
│   │   ├── assets/             # Assets CRUD, upload, embed, likes, views, comments
│   │   ├── comments/           # Comment CRUD + likes
│   │   ├── cron/               # Cron: process-schedules
│   │   ├── drops/              # Drops CRUD + blocks, posts, publish, generate, email-preview
│   │   ├── notifications/      # Notifications list
│   │   ├── schedules/          # Drop schedule CRUD + pause/resume/generate
│   │   ├── search/             # Global search
│   │   ├── streams/            # Streams CRUD + assets, follow, bookmarks, members
│   │   └── users/              # User profiles, follow, me/* (avatar, email, password, etc.)
│   ├── auth/                   # Login, signup, callback, auth-code-error pages
│   ├── drops/                  # Drops listing + [id]/edit (block editor)
│   ├── e/[id]/                 # Asset detail page (route: /e/:id)
│   ├── home/                   # Home feed page
│   ├── people/                 # People directory
│   ├── search/                 # Search results page
│   ├── stream/[slug]/          # Stream detail page
│   ├── streams/                # Streams listing
│   ├── u/[username]/           # User profile page
│   ├── env-validation.ts       # Validates required env vars at startup
│   ├── globals.css             # Global CSS (Tailwind base)
│   └── layout.tsx              # Root layout (providers, navbar, error boundary)
│
├── components/                 # React components
│   ├── admin/                  # Admin-specific UI
│   ├── assets/                 # Asset cards, detail views, comment UI, masonry grid
│   ├── auth/                   # Auth form components
│   ├── customized/             # Customized wrappers around third-party components
│   ├── dashboard/              # Dashboard widgets
│   ├── drops/                  # Drop editor, blocks, cards, schedules, publish dialogs
│   ├── layout/                 # Navbar, create dialogs, upload dialog, settings, user menu
│   ├── search/                 # Search bar, suggestions
│   ├── streams/                # Stream cards, grid, header, members, bookmarks
│   ├── ui/                     # Base UI primitives (shadcn/ui pattern)
│   └── users/                  # User profile components
│
├── lib/                        # Shared logic (no UI)
│   ├── api/                    # Client-side fetch helpers (assets.ts)
│   ├── auth/                   # get-user.ts, use-user.ts, require-admin.ts
│   ├── constants/              # App constants, cache config (cache.ts), masonry breakpoints
│   ├── contexts/               # React contexts: SearchContext
│   ├── hooks/                  # Custom React hooks (see Hooks section)
│   ├── notifications/          # check-preferences.ts
│   ├── providers/              # QueryProvider, ThemeProvider
│   ├── queries/                # React Query key factories (asset-queries.ts)
│   ├── supabase/               # Supabase clients: client.ts, server.ts, middleware.ts
│   ├── types/                  # TypeScript interfaces: database.ts, admin.ts
│   └── utils/                  # Utility functions (see Utils section)
│
├── scripts/
│   └── migrations/             # Numbered SQL migration files (001–040)
│
├── supabase/
│   └── config.toml             # Supabase local config
│
├── docs/                       # Project documentation (markdown)
├── docker/                     # Docker support files
├── docker-compose.yml          # Full-stack Docker Compose
├── Dockerfile                  # Next.js standalone Docker image
├── setup.sh                    # Interactive setup wizard
├── migrate.sh                  # Database migration runner
├── middleware.ts               # Session refresh middleware (Supabase SSR)
├── next.config.ts              # Next.js config (standalone, 50MB body limit, image hosts)
├── tsconfig.json               # TypeScript config (path alias: @/* → ./*)
└── eslint.config.mjs           # ESLint: Next.js core-web-vitals + TypeScript
```

---

## Core Data Models (`lib/types/database.ts`)

| Type | Description |
|------|-------------|
| `User` | Platform user with `platform_role` (`user` \| `admin` \| `owner`) |
| `Asset` | Uploaded content: images, videos, embeds. Has 3 size URLs + streams (M:M) |
| `Stream` | Content channel. Can be private (member-based access) |
| `Comment` | Threaded comment on an asset. Supports likes and replies |
| `Notification` | In-app notifications: likes, comments, follows, mentions, drop-ready |
| `Drop` | AI-generated newsletter draft or published issue |
| `DropBlock` | Block in a Drop's block editor: `text`, `heading`, `post`, `featured_post`, `divider`, `quote`, `image_gallery` |
| `DropSchedule` | Recurring drop configuration (weekly, biweekly, monthly, custom) |
| `StreamBookmark` | External link attached to a stream (Jira, Figma, etc.) |

### Asset Variants
- `asset_type: 'image'` — JPEG, PNG, GIF, WebP
- `asset_type: 'video'` — WebM files only
- `asset_type: 'embed'` — Figma or Loom (URL-based, no file upload)

### Asset Visibility
- `'public'` — appears in feed and streams
- `'unlisted'` — only via direct link or Drops

### Platform Roles
- `'user'` — default
- `'admin'` — platform management access
- `'owner'` — full access; promoted via SQL: `UPDATE users SET platform_role = 'owner' WHERE email = '...'`

---

## Supabase Client Usage

There are three Supabase client factories. Use the correct one for the context:

```ts
// Server Components, API Route Handlers, Server Actions
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // Uses cookie-based auth session

// Client Components (browser)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Admin/privileged operations ONLY (bypasses Row Level Security)
import { createAdminClient } from "@/lib/supabase/server";
const supabase = await createAdminClient(); // Uses SUPABASE_SERVICE_ROLE_KEY
```

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client. `createAdminClient()` is server-only.

---

## Authentication Pattern

- Session management is handled by `middleware.ts` via `lib/supabase/middleware.ts`
- The middleware runs on every request (except static assets and upload routes) and refreshes the session cookie
- In API routes, verify auth with `supabase.auth.getUser()` — never trust client-provided user IDs
- Admin routes additionally call `requireAdmin()` from `@/lib/auth/require-admin`

```ts
// Protect an API route as admin-only
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const admin = await requireAdmin(); // Throws if not admin/owner
  // ...
}
```

---

## API Route Conventions

All API routes live under `app/api/` and follow REST conventions:

- `GET /api/assets` — list/paginate assets (cursor-based: `cursor=timestamp::id`)
- `POST /api/assets/upload` — multipart upload (image/WebM)
- `POST /api/assets/embed` — add embed URL (Figma/Loom)
- `GET /api/assets/[id]` — get single asset
- `PATCH /api/assets/[id]` — update asset
- `DELETE /api/assets/[id]` — delete asset + files
- `POST /api/assets/[id]/like` — toggle like
- `POST /api/assets/[id]/view` — record view
- `GET /api/assets/[id]/viewers` — list viewers
- `GET /api/assets/[id]/comments` — list comments
- `POST /api/streams` — create stream
- `GET /api/streams/[id]` — get stream
- `POST /api/streams/[id]/follow` — follow/unfollow
- `GET /api/streams/[id]/members` — list members
- `POST /api/drops` — create drop draft
- `POST /api/drops/[id]/generate` — AI-generate drop content
- `POST /api/drops/[id]/publish` — publish drop
- `GET /api/cron/process-schedules` — trigger scheduled drop generation (cron)
- `GET /api/search` — search assets, streams, users

Response format: JSON. Errors use `{ error: string, message?: string }` with appropriate HTTP status codes.

---

## File Upload Pipeline

Uploads go through `POST /api/assets/upload`:

1. Authenticate user
2. Parse `multipart/form-data` (file, title, description, streamIds, visibility)
3. Validate file type (image/* or video/webm) and size (10MB images / 50MB videos)
4. For images: validate with Sharp, detect animated GIFs, generate 3 size variants in parallel
5. For WebM: save directly; use FFmpeg to extract thumbnail frame (falls back gracefully if FFmpeg unavailable)
6. Save files to `public/uploads/{full,medium,thumbnails}/`
7. Insert `assets` row in DB
8. Insert `asset_streams` rows for stream associations
9. Return the created asset

Upload directory structure:
```
public/uploads/
├── full/          # Optimized originals (90% JPEG quality)
├── medium/        # 800px max (85% quality)
└── thumbnails/    # 300px max (80% quality); GIF thumbnails are static JPEG
```

---

## Embed Providers (`lib/utils/embed-providers.ts`)

Fully implemented: **Figma**, **Loom**
Detected but not active: YouTube, Vimeo, Dribbble

- Figma embeds use `embed.figma.com` with `embed-host=cosmos`
- Figma frame thumbnails fetched via Figma REST API (requires `FIGMA_ACCESS_TOKEN`)
- Loom embeds use `www.loom.com/embed/{videoId}`

---

## React Query Usage

The app uses React Query v5 for client-side data fetching and caching:

- **Providers**: `QueryProvider` wraps the app in `app/layout.tsx`
- **Query keys**: Defined in `lib/queries/asset-queries.ts` as key factories
- **Initial data**: Server Components fetch initial data and pass it as props; hooks hydrate React Query cache via `initialData`
- **Pagination**: Infinite scroll with cursor-based pagination (`useInfiniteQuery`)
- **Optimistic updates**: `removeAsset()` in `useAssetsInfinite` updates cache immediately on delete
- **Cache times**: Defined in `lib/constants/cache.ts` as `CACHE_TIMES` and `PAGE_SIZES`

---

## Key Custom Hooks (`lib/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAssetsInfinite` | Infinite scroll feed with cursor pagination |
| `useAssetView` | Track asset view count |
| `useAssetLike` | Toggle asset like with optimistic update |
| `useAssetComments` | Fetch and manage comments |
| `useCommentLike` | Toggle comment like |
| `useCommentLikesManager` | Batch comment like state |
| `useStreamFollow` | Follow/unfollow a stream |
| `useUserFollow` | Follow/unfollow a user |
| `useStreamMembers` | Stream member management |
| `useStreamMentions` | @mention autocomplete |
| `useStreamBookmarks` | Stream bookmark CRUD |
| `useNotifications` | Notification fetch + mark-as-read |
| `useStreamDropdownOptions` | Stream selector options |
| `useFollowingAssets` | Assets from followed users/streams |
| `useTypingIndicator` | Real-time typing indicator |
| `useUndoRedo` | Undo/redo stack |
| `useUnsavedChanges` | Prompt on navigation with unsaved state |
| `useDebounce` | Debounce a value |
| `useClickOutside` | Detect outside clicks |
| `useKeyboardShortcut` | Global keyboard shortcut binding |
| `useMediaQuery` | Responsive breakpoint detection |
| `useAssetPrefetch` | Prefetch asset detail on hover |
| `useStreamSelection` | Multi-stream selection state |

---

## Key Utilities (`lib/utils/`)

| File | Purpose |
|------|---------|
| `image-processing.ts` | Sharp-based image resize/optimize (3 variants, animated GIF support) |
| `file-storage.ts` | Local filesystem save/delete for uploads |
| `embed-providers.ts` | URL detection + embed URL generation for Figma/Loom/YouTube |
| `ai.ts` | LiteLLM integration helpers; `isAIConfigured()` check |
| `video-processing.ts` | FFmpeg-based WebM thumbnail generation |
| `slug.ts` | URL-safe slug generation |
| `time.ts` | Date/time formatting |
| `week-grouping.ts` | Group assets by week for feed display |
| `confetti.ts` | Confetti animation (canvas-confetti) |
| `api.ts` | Generic client-side fetch wrapper |
| `env-validation.ts` | Validates env vars at module load time |

---

## UI Component Conventions

- Base primitives live in `components/ui/` — these are shadcn/ui components (Radix-based)
- Feature components live in their domain subdirectory (e.g., `components/assets/`, `components/drops/`)
- `components/layout/` contains global layout elements (navbar, dialogs, upload flow)
- Theme support via `next-themes` through `ThemeProvider`
- Toast notifications via `sonner` (`<Toaster>` in root layout)
- URL state management via `nuqs` (`NuqsAdapter` in root layout)
- Animation via `framer-motion`
- Icons from `lucide-react`

---

## Constants (`lib/constants.ts` + `lib/constants/`)

Key constants to use:
- `MASONRY_BREAKPOINTS` — responsive column counts for masonry grid
- `ANIMATION_DURATION` / `ANIMATION_EASING` — consistent motion values
- `Z_INDEX` — layering: navbar(50), dropdown(60), tooltip(70), modal(100)
- `BUTTON_STYLES` — consistent button class strings
- `IMAGE_SIZES` — `sizes` prop values for Next.js `<Image>`
- `ROUTES` — typed route helpers (e.g., `ROUTES.asset(id)` → `/e/${id}`)
- `KEYS` — keyboard key constants

---

## Database Migrations

Migrations are in `scripts/migrations/` numbered `001` through `040`. They must be applied in order.

Key migration milestones:
- 001–006: Initial schema, seed data, storage, stream follows/bookmarks, FK fixes
- 007–015: Comments, likes, views, notifications, realtime
- 016–017: Embed support, Figma integration
- 018–022: Drops feature (newsletters)
- 023–026: Auth triggers, RLS policies, visibility
- 027–030: User fields, notification settings, view RPCs
- 032–033: Stream members and visibility
- 034–036: Platform roles and admin features
- 037–040: Drop schedules (recurring drops) and cron

Run migrations:
```bash
./migrate.sh
# or manually:
for f in scripts/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, never expose to client) |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `LITELLM_BASE_URL` | LiteLLM API endpoint for AI features | — |
| `LITELLM_API_KEY` | LiteLLM API key | — |
| `LITELLM_MODEL` | LLM model identifier | `gemini/gemini-2.5-flash` |
| `ENCRYPTION_KEY` | 64-char hex for AES-256 encryption (Figma tokens) | — |
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token for frame thumbnails | — |
| `RESEND_API_KEY` | Resend API key for transactional email | — |

---

## Deployment

### Docker (recommended)
```bash
./setup.sh          # Interactive wizard: configures env, generates secrets, starts services
./migrate.sh        # Run database migrations
docker compose logs -f   # Follow logs
```

### Local Development
```bash
# Requires: Node.js 20+, Docker, psql
npm install
# Configure .env.local with Supabase connection
npm run dev
```

See `README.md` for complete self-hosting guide including Nginx, SSL, PM2, and backup configuration.

---

## Key Architectural Decisions

1. **Local file storage** (`public/uploads/`) rather than Supabase Storage — code has TODOs marking migration path to Supabase Storage when scaling is needed.

2. **Server Components + React Query hybrid** — pages use async Server Components for initial SSR data, which is passed as `initialData` to React Query hooks for seamless client-side caching.

3. **Cursor-based pagination** — assets use a composite cursor `"timestamp::id"` to handle ties in `created_at` without skipping records.

4. **RLS everywhere** — all tables have Supabase Row Level Security policies. The service role client bypasses RLS and should only be used for admin operations.

5. **No test suite** — there are no automated tests. Validate changes by running `npm run build` and `npm run lint`.

6. **Standalone Docker output** — `next.config.ts` sets `output: 'standalone'` so the Docker image is self-contained without node_modules.

7. **Drop schedules + cron** — `GET /api/cron/process-schedules` is called by an external cron job to trigger scheduled drop generation via LiteLLM.
