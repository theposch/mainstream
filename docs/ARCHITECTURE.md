# Mainstream Platform Architecture

**Version:** 2.0  
**Last Updated:** January 2026  
**Status:** Production-Ready

---

## Executive Summary

Mainstream is a design collaboration platform built on a modern, scalable architecture that combines Next.js 15, Supabase (self-hosted), and real-time WebSocket capabilities. The system supports multi-format asset sharing, flexible stream-based organization, AI-powered newsletter generation, and scheduled automation—all while maintaining sub-second response times and supporting concurrent real-time updates.

### Key Architectural Highlights

- **Hybrid Rendering:** Server and client components optimized for performance
- **Real-time First:** WebSocket subscriptions for instant UI updates
- **Type-Safe:** End-to-end TypeScript with database-derived types
- **Scalable Data Layer:** PostgreSQL with Row Level Security (RLS)
- **Optimistic UI:** Instant feedback with automatic rollback on errors
- **Edge-Ready:** Designed for CDN deployment and global distribution

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [System Components](#system-components)
5. [Data Architecture](#data-architecture)
6. [API Layer](#api-layer)
7. [Frontend Architecture](#frontend-architecture)
8. [Real-time Architecture](#real-time-architecture)
9. [Security Architecture](#security-architecture)
10. [Performance & Optimization](#performance--optimization)
11. [Deployment Architecture](#deployment-architecture)
12. [Design Patterns](#design-patterns)
13. [Scalability Considerations](#scalability-considerations)
14. [Appendices](#appendices)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Browser     │  │  Mobile      │  │  Email       │          │
│  │  (React)     │  │  (Future)    │  │  Client      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     Next.js Application                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  App Router (Next.js 15)                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │  Server    │  │  Client    │  │  API       │        │   │
│  │  │  Components│  │  Components│  │  Routes    │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│  Supabase      │  │  LiteLLM     │  │  External    │
│  ┌───────────┐ │  │  (Gemini)    │  │  Services    │
│  │PostgreSQL │ │  │              │  │  - Resend    │
│  │GoTrue Auth│ │  │              │  │  - Figma API │
│  │Storage    │ │  │              │  │  - Loom API  │
│  │Realtime   │ │  │              │  │              │
│  └───────────┘ │  └──────────────┘  └──────────────┘
└────────────────┘
```

### System Boundaries

**Internal Systems:**
- Next.js application (frontend + API routes)
- Supabase stack (database, auth, storage, realtime)
- Cron service (schedule processing)

**External Integrations:**
- LiteLLM (AI text generation)
- Resend (email delivery)
- Figma API (design embeds)
- Loom API (video embeds)

---

## Architecture Principles

### 1. **Progressive Enhancement**

Start with server-side rendering for performance and SEO, enhance with client-side interactivity where needed.

```typescript
// Server Component (default, fast initial load)
export default async function Page() {
  const data = await fetchDataFromDB();
  return <View data={data} />;
}

// Client Component (only when needed)
'use client';
export function InteractiveWidget() {
  const [state, setState] = useState();
  // Interactive logic here
}
```

### 2. **Optimistic UI with Rollback**

Update UI immediately, sync with server in background, rollback on failure.

```typescript
// Example: Like button
const { mutate } = useMutation({
  mutationFn: toggleLike,
  onMutate: async () => {
    // Optimistic update
    setLikeCount(prev => prev + 1);
    setIsLiked(true);
  },
  onError: () => {
    // Rollback on failure
    setLikeCount(prev => prev - 1);
    setIsLiked(false);
  }
});
```

### 3. **Type Safety End-to-End**

Database → API → Frontend with TypeScript inference.

```typescript
// Database types generated from schema
interface User {
  id: string;
  username: string;
  email: string;
}

// API uses same types
export async function GET(): Promise<User[]> { ... }

// Frontend gets full type safety
const users: User[] = await fetchUsers();
```

### 4. **Separation of Concerns**

Clear boundaries between layers:
- **Data Layer** - Supabase queries
- **Business Logic** - API routes
- **Presentation** - React components
- **State Management** - React Query + Context

### 5. **Real-time by Default**

Every user action triggers real-time updates for all connected clients.

```typescript
// Subscribe to changes
supabase
  .channel('asset-likes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'asset_likes' 
  }, handleUpdate)
  .subscribe();
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose | Why Chosen |
|-----------|---------|---------|------------|
| **Next.js** | 15.x | React framework | Server components, App Router, Turbopack |
| **React** | 19.x | UI library | Industry standard, rich ecosystem |
| **TypeScript** | 5.x | Type safety | Catch errors at compile time |
| **Tailwind CSS** | 3.x | Styling | Utility-first, fast development |
| **shadcn/ui** | Latest | Component library | Accessible, customizable, Radix-based |
| **React Query** | 5.x | Data fetching | Caching, invalidation, optimistic updates |
| **Framer Motion** | 11.x | Animations | Declarative, performant animations |

### Backend

| Technology | Version | Purpose | Why Chosen |
|-----------|---------|---------|------------|
| **PostgreSQL** | 15.x | Database | Proven, scalable, rich features |
| **Supabase** | Latest | Backend platform | Auth, Storage, Realtime out of box |
| **GoTrue** | Latest | Authentication | JWT-based, part of Supabase |
| **PostgREST** | Latest | REST API | Auto-generated from schema |
| **pg_cron** | Latest | Scheduled jobs | Native PostgreSQL scheduling |

### Infrastructure

| Technology | Version | Purpose | Why Chosen |
|-----------|---------|---------|------------|
| **Docker** | Latest | Containerization | Consistent dev/prod environments |
| **Node.js** | 20.x | Runtime | Required for Next.js |
| **FFmpeg** | Latest | Video processing | Industry standard for media |

### AI & External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| **LiteLLM** | AI gateway | Gemini 2.5 Flash for text generation |
| **Resend** | Email delivery | Newsletter distribution |
| **Figma API** | Design embeds | Frame-specific thumbnails |
| **Loom API** | Video embeds | oEmbed video previews |

---

## System Components

### 1. Next.js Application Layer

#### App Router Structure

```
app/
├── (auth)/                 # Auth routes (signup, login)
├── (main)/                 # Main app routes
│   ├── home/              # Feed pages
│   ├── e/[id]/            # Asset detail
│   ├── stream/[slug]/     # Stream pages
│   ├── u/[username]/      # User profiles
│   ├── drops/             # Newsletter feature
│   └── admin/             # Admin dashboard
└── api/                   # API routes
    ├── assets/           # Asset CRUD
    ├── streams/          # Stream management
    ├── drops/            # Newsletter operations
    ├── schedules/        # Schedule management
    └── cron/             # Background jobs
```

**Design Decision:** App Router provides:
- Server components by default (better performance)
- Nested layouts (shared UI, preserved state)
- Streaming SSR (progressive page load)
- Parallel routes (multiple views)

#### Server vs Client Components

**Server Components (Default):**
- Data fetching
- Direct database queries
- Initial page renders
- SEO-critical content

```typescript
// app/home/page.tsx
export default async function HomePage() {
  const assets = await fetchAssets(); // Direct DB query
  return <Feed assets={assets} />;
}
```

**Client Components (When Needed):**
- User interactions (clicks, forms)
- Browser APIs (localStorage, etc.)
- Real-time subscriptions
- React hooks (useState, useEffect)

```typescript
// components/asset-card.tsx
'use client';
export function AssetCard({ asset }: Props) {
  const [liked, setLiked] = useState(asset.isLiked);
  // Interactive logic
}
```

---

### 2. Supabase Backend Stack

#### PostgreSQL Database

**Role:** Primary data store with RLS (Row Level Security)

**Key Features:**
- JSONB columns for flexible data
- Full-text search (tsvector)
- Triggers for automation
- Functions for complex logic
- Views for optimized queries

**Connection Pattern:**

```typescript
// Server-side (direct connection)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client-side (via API Gateway)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Admin (bypasses RLS)
import { createAdminClient } from '@/lib/supabase/server';
const supabase = createAdminClient();
```

#### GoTrue Authentication

**Role:** User authentication and session management

**Features:**
- Email/password authentication
- JWT-based sessions
- Auto-refresh tokens
- Middleware integration

**Authentication Flow:**

```
1. User submits credentials
2. GoTrue validates and issues JWT
3. JWT stored in httpOnly cookie
4. Middleware refreshes session on each request
5. RLS policies use JWT claims
```

#### Supabase Storage

**Role:** Binary asset storage (S3-compatible)

**Buckets:**
- `assets` - User uploads (images, videos, GIFs)
- `avatars` - User profile pictures
- `drop-assets` - Newsletter attachments

**Upload Pattern:**

```typescript
// 1. Upload to storage
const { data, error } = await supabase.storage
  .from('assets')
  .upload(`${userId}/${filename}`, file);

// 2. Get public URL
const url = supabase.storage
  .from('assets')
  .getPublicUrl(data.path).data.publicUrl;

// 3. Save metadata to database
await supabase.from('assets').insert({
  url,
  uploader_id: userId,
  // ... other metadata
});
```

#### Supabase Realtime

**Role:** WebSocket subscriptions for live updates

**Capabilities:**
- Postgres changes (INSERT, UPDATE, DELETE)
- Presence (who's online)
- Broadcast (custom events)

**Subscription Pattern:**

```typescript
useEffect(() => {
  const channel = supabase
    .channel('asset-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'asset_likes',
      filter: `asset_id=eq.${assetId}`
    }, (payload) => {
      // Update UI with new data
      queryClient.invalidateQueries(['asset', assetId]);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [assetId]);
```

---

### 3. Data Fetching Layer (React Query)

**Role:** Client-side data fetching, caching, and synchronization

**Key Patterns:**

#### Query Keys (Hierarchical)

```typescript
// lib/queries/asset-queries.ts
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: Filters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};
```

**Why:** Hierarchical keys enable precise cache invalidation.

#### Infinite Queries (Pagination)

```typescript
export function useAssetsInfinite(filters: Filters) {
  return useInfiniteQuery({
    queryKey: assetKeys.list(filters),
    queryFn: ({ pageParam = 0 }) => fetchAssets({ 
      ...filters, 
      offset: pageParam 
    }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === PAGE_SIZE 
        ? pages.length * PAGE_SIZE 
        : undefined,
  });
}
```

**Why:** Smooth infinite scroll with automatic pagination.

#### Optimistic Updates

```typescript
const { mutate } = useMutation({
  mutationFn: likeAsset,
  onMutate: async (assetId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['asset', assetId]);
    
    // Snapshot current value
    const previous = queryClient.getQueryData(['asset', assetId]);
    
    // Optimistically update
    queryClient.setQueryData(['asset', assetId], (old) => ({
      ...old,
      likeCount: old.likeCount + 1,
      isLiked: true,
    }));
    
    return { previous };
  },
  onError: (err, assetId, context) => {
    // Rollback on error
    queryClient.setQueryData(['asset', assetId], context.previous);
  },
  onSettled: (assetId) => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries(['asset', assetId]);
  },
});
```

**Why:** Instant UI feedback with automatic error recovery.

---

### 4. Component Architecture

#### Component Hierarchy

```
Page (Server Component)
  ↓
Layout Components (Server)
  ↓
Feature Components (Client)
  ↓
UI Components (shadcn/ui)
```

#### Component Categories

**1. Server Components**
- Location: `app/*/page.tsx`
- Purpose: Initial data fetching, SEO
- Example: `app/home/page.tsx`

**2. Client Feature Components**
- Location: `components/[feature]/`
- Purpose: Interactive features
- Example: `components/assets/asset-card.tsx`

**3. UI Primitives**
- Location: `components/ui/`
- Purpose: Reusable, accessible base components
- Example: `components/ui/button.tsx` (shadcn)

**4. Layout Components**
- Location: `components/layout/`
- Purpose: Navigation, header, footer
- Example: `components/layout/navbar.tsx`

#### Component Design Patterns

**Compound Components:**

```typescript
// Complex UI with multiple parts
<DropEditor>
  <DropEditor.Header />
  <DropEditor.Toolbar />
  <DropEditor.Canvas />
  <DropEditor.Sidebar />
</DropEditor>
```

**Render Props:**

```typescript
// Flexible rendering
<DataFetcher
  query={assetsQuery}
  render={({ data, isLoading }) => (
    isLoading ? <Skeleton /> : <AssetGrid assets={data} />
  )}
/>
```

**Custom Hooks:**

```typescript
// Encapsulate logic
function useAssetLike(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => toggleLike(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset', assetId]);
    },
  });
}

// Usage
function AssetCard({ asset }: Props) {
  const { mutate: toggleLike } = useAssetLike(asset.id);
  return <button onClick={() => toggleLike()}>Like</button>;
}
```

---

## Data Architecture

### Database Schema Overview

#### Entity Relationship Diagram

```
users (1) ────< (many) assets
  │                 │
  │                 │ (many-to-many via asset_streams)
  │                 │
  │               streams (1) ────< (many) stream_members
  │                 │
  │                 │
  │            stream_bookmarks
  │            stream_follows
  │
  ├──< user_follows (self-referential)
  │
  ├──< asset_likes
  ├──< asset_views
  ├──< asset_comments ────< comment_likes
  │
  ├──< notifications
  │
  ├──< drops ────< drop_blocks ────< drop_posts
  │                                  drop_image_blocks
  │
  └──< drop_schedules
```

### Core Tables

#### users

**Purpose:** User profiles and authentication metadata

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  job_title TEXT,
  location TEXT,
  platform_role TEXT DEFAULT 'user',
  figma_access_token TEXT,  -- Encrypted
  figma_token_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `username` (unique) - Profile lookups
- `email` (unique) - Auth lookups

#### assets

**Purpose:** Uploaded designs, images, videos, embeds

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- 'image', 'video', 'embed'
  url TEXT NOT NULL,
  medium_url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT,  -- 'image', 'video', 'embed'
  embed_url TEXT,   -- Original embed URL
  embed_provider TEXT,  -- 'figma', 'loom', etc.
  visibility TEXT DEFAULT 'public',  -- 'public', 'unlisted'
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `uploader_id` - User's assets
- `created_at DESC` - Chronological feed
- `asset_type` - Filter by type
- `visibility` - Public vs unlisted

#### streams

**Purpose:** Organizational units (like tags + collections)

```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_type TEXT NOT NULL,  -- 'user', 'team'
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',  -- 'active', 'archived'
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `name` (unique) - Lookup by name
- `owner_id` - Owner's streams
- `is_private` - Public stream queries

#### asset_streams

**Purpose:** Many-to-many relationship (assets ↔ streams)

```sql
CREATE TABLE asset_streams (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (asset_id, stream_id)
);
```

**Indexes:**
- `asset_id` - Asset's streams
- `stream_id` - Stream's assets
- `added_at DESC` - Chronological within stream

### Relationship Tables

#### user_follows

```sql
CREATE TABLE user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id != followed_id)  -- Can't follow yourself
);
```

#### stream_follows

```sql
CREATE TABLE stream_follows (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, stream_id)
);
```

#### asset_likes

```sql
CREATE TABLE asset_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_id)
);
```

**Real-time Configuration:**
```sql
-- Required for real-time filtering
ALTER TABLE asset_likes REPLICA IDENTITY FULL;
```

### Feature Tables

#### drops (Newsletters)

```sql
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES drop_schedules(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',  -- 'draft', 'published'
  published_at TIMESTAMPTZ,
  is_superseded BOOLEAN DEFAULT false,
  date_range_start DATE,
  date_range_end DATE,
  filter_stream_ids UUID[],
  filter_user_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### drop_schedules

```sql
CREATE TABLE drop_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,  -- 'weekly', 'biweekly', 'monthly', 'custom'
  day_of_week INTEGER,      -- 0-6 (Sunday-Saturday)
  day_of_month INTEGER,     -- 1-31
  custom_interval_days INTEGER,
  generation_time TIME,      -- Time of day to generate
  timezone TEXT,
  stream_ids UUID[],
  user_ids UUID[],
  date_range_mode TEXT,      -- 'last_n_days', 'since_last'
  date_range_days INTEGER,
  status TEXT DEFAULT 'active',  -- 'active', 'paused'
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Data Denormalization

**Principle:** Denormalize for read performance, use triggers to maintain consistency.

**Example: Asset View Count**

```sql
-- Denormalized counter in assets table
ALTER TABLE assets ADD COLUMN view_count INTEGER DEFAULT 0;

-- Atomic RPC to increment
CREATE FUNCTION increment_view_count(asset_id UUID)
RETURNS INTEGER AS $$
  UPDATE assets 
  SET view_count = view_count + 1 
  WHERE id = asset_id 
  RETURNING view_count;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Track individual views for "Seen by" tooltip
CREATE TABLE asset_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, user_id)
);
```

**Why:** Fast reads (no COUNT query), detailed tracking available when needed.

---

## API Layer

### API Architecture Pattern

**RESTful conventions with Next.js App Router:**

```
app/api/[resource]/
  ├── route.ts            # GET (list), POST (create)
  ├── [id]/
  │   ├── route.ts       # GET (read), PATCH (update), DELETE
  │   └── [action]/
  │       └── route.ts   # POST (custom action)
```

### Authentication & Authorization

**Middleware-based session validation:**

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createServerClient(request);
  
  // Refresh session if needed
  await supabase.auth.getSession();
  
  return response;
}
```

**API route protection:**

```typescript
// app/api/assets/route.ts
export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Proceed with authenticated logic
  // ...
}
```

### API Response Patterns

**Success Response:**

```typescript
return Response.json({
  data: result,
  meta: {
    total: count,
    page: pageNumber,
    limit: pageSize,
  }
}, { status: 200 });
```

**Error Response:**

```typescript
return Response.json({
  error: 'Resource not found',
  code: 'NOT_FOUND',
  details: {
    resource: 'asset',
    id: assetId,
  }
}, { status: 404 });
```

### Request/Response Flow

```
┌──────────┐
│ Client   │
└────┬─────┘
     │ HTTP Request
     ▼
┌─────────────────┐
│ Middleware      │ ← Validates session, refreshes JWT
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ API Route       │ ← Business logic, validation
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Supabase Client │ ← Database query (with RLS)
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ PostgreSQL      │ ← RLS enforces permissions
└────┬────────────┘
     │ Result
     ▼
┌──────────┐
│ Client   │ ← JSON response
└──────────┘
```

### API Endpoint Categories

See [API_REFERENCE.md](./API_REFERENCE.md) for complete documentation.

---

## Frontend Architecture

### State Management Strategy

**Multi-tiered approach:**

1. **Server State** - React Query
   - Remote data (API responses)
   - Caching, invalidation, refetching
   - Optimistic updates

2. **URL State** - Next.js routing
   - Navigation state
   - Query parameters
   - Shareable state

3. **Component State** - React hooks
   - UI state (modals, dropdowns)
   - Form inputs
   - Transient state

4. **Global State** - React Context
   - User session
   - Theme preferences
   - Search context

**Decision Tree:**

```
Does the state need to be shared?
├─ No → useState, useReducer
└─ Yes → Is it server data?
    ├─ Yes → React Query
    └─ No → Is it URL-related?
        ├─ Yes → Next.js router
        └─ No → Context API
```

### Component Communication Patterns

**1. Props (Parent → Child)**

```typescript
<AssetCard 
  asset={asset}
  onLike={handleLike}
  isSelected={selected}
/>
```

**2. Callbacks (Child → Parent)**

```typescript
function AssetCard({ onLike }: Props) {
  return <button onClick={() => onLike(asset.id)}>Like</button>;
}
```

**3. Context (Shared State)**

```typescript
const SearchContext = createContext<SearchState>();

function SearchProvider({ children }) {
  const [query, setQuery] = useState('');
  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

// Usage
function SearchInput() {
  const { query, setQuery } = useContext(SearchContext);
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

**4. React Query (Server State)**

```typescript
// Hook defines query
function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => fetchAsset(id),
  });
}

// Multiple components can use same data
function Component1() {
  const { data } = useAsset('123'); // Fetches if needed
}

function Component2() {
  const { data } = useAsset('123'); // Uses cache
}
```

### Form Handling

**Pattern: Controlled components with validation**

```typescript
function CreateAssetForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    streams: [],
  });
  
  const [errors, setErrors] = useState({});
  
  const { mutate, isLoading } = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      router.push('/home');
      toast.success('Asset created!');
    },
    onError: (error) => {
      setErrors(error.fieldErrors);
    },
  });
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Submit
    mutate(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        error={errors.title}
      />
      {/* More fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

### Error Handling

**Error Boundaries:**

```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <AssetGrid />
</ErrorBoundary>
```

---

## Real-time Architecture

### Supabase Realtime Integration

**Three real-time modes:**

1. **Postgres Changes** - Database row changes
2. **Presence** - Who's online
3. **Broadcast** - Custom events

### Real-time Subscription Pattern

```typescript
function useAssetLikes(assetId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`asset-likes:${assetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'asset_likes',
        filter: `asset_id=eq.${assetId}`,
      }, (payload) => {
        // Invalidate React Query cache
        queryClient.invalidateQueries(['asset', assetId, 'likes']);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, queryClient]);
}
```

### Presence (Typing Indicators)

```typescript
function useTypingIndicator(assetId: string) {
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  
  useEffect(() => {
    const channel = supabase.channel(`comments:${assetId}`);
    
    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setTypingUsers(users.filter(u => u.isTyping));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ 
            user_id: user.id,
            username: user.username,
            isTyping: false,
          });
        }
      });
    
    return () => supabase.removeChannel(channel);
  }, [assetId, user]);
  
  // Debounced typing notification
  const notifyTyping = useMemo(
    () => debounce(() => {
      channel.track({ ...user, isTyping: true });
      setTimeout(() => {
        channel.track({ ...user, isTyping: false });
      }, 3000);
    }, 500),
    [channel, user]
  );
  
  return { typingUsers, notifyTyping };
}
```

### Real-time Performance Considerations

**1. Targeted Subscriptions**

❌ **Bad:** Subscribe to entire table
```typescript
.on('postgres_changes', { table: 'asset_likes' })
```

✅ **Good:** Filter to relevant rows
```typescript
.on('postgres_changes', { 
  table: 'asset_likes',
  filter: `asset_id=eq.${assetId}` 
})
```

**2. Batch Updates**

Debounce rapid updates to prevent UI thrashing:

```typescript
const debouncedInvalidate = useMemo(
  () => debounce(
    () => queryClient.invalidateQueries(['assets']),
    300
  ),
  [queryClient]
);
```

**3. Channel Cleanup**

Always unsubscribe to prevent memory leaks:

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

---

## Security Architecture

### Authentication Flow

```
1. User enters credentials
   ↓
2. GoTrue validates against auth.users
   ↓
3. JWT signed with JWT_SECRET
   ↓
4. Token stored in httpOnly cookie
   ↓
5. Middleware validates JWT on each request
   ↓
6. RLS policies use JWT claims (auth.uid())
```

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1706745600,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {},
  "user_metadata": {}
}
```

### Row Level Security (RLS)

**Principle:** Database-level authorization, enforced for all queries.

**Example: Assets Table**

```sql
-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Public read for public assets
CREATE POLICY "Public assets are viewable by everyone"
ON assets FOR SELECT
USING (visibility = 'public');

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert"
ON assets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploader_id);

-- Users can update own assets
CREATE POLICY "Users can update own assets"
ON assets FOR UPDATE
TO authenticated
USING (auth.uid() = uploader_id);

-- Users can delete own assets
CREATE POLICY "Users can delete own assets"
ON assets FOR DELETE
TO authenticated
USING (auth.uid() = uploader_id);
```

### Private Streams Access Control

**Challenge:** Recursive RLS policies cause performance issues.

**Solution:** SECURITY DEFINER functions

```sql
-- Function runs with elevated privileges (bypasses RLS)
CREATE FUNCTION can_access_stream(stream_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stream_record streams%ROWTYPE;
BEGIN
  SELECT * INTO stream_record FROM streams WHERE id = stream_id;
  
  -- Public streams
  IF NOT stream_record.is_private THEN
    RETURN TRUE;
  END IF;
  
  -- Owner
  IF stream_record.owner_id = user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Member
  IF EXISTS (
    SELECT 1 FROM stream_members 
    WHERE stream_members.stream_id = stream_id 
    AND stream_members.user_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Use in RLS policy
CREATE POLICY "Stream members can access private streams"
ON assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM asset_streams
    WHERE asset_streams.asset_id = assets.id
    AND can_access_stream(asset_streams.stream_id, auth.uid())
  )
);
```

### API Key Encryption

**Sensitive data (Figma tokens) encrypted at rest:**

```typescript
// lib/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Usage:**

```typescript
// Save encrypted token
const encryptedToken = encrypt(figmaToken);
await supabase
  .from('users')
  .update({ figma_access_token: encryptedToken })
  .eq('id', userId);

// Retrieve and decrypt
const { data } = await supabase
  .from('users')
  .select('figma_access_token')
  .eq('id', userId)
  .single();

const figmaToken = decrypt(data.figma_access_token);
```

---

## Performance & Optimization

### Database Optimization

**1. N+1 Query Prevention**

❌ **Bad:** Fetch assets, then fetch streams for each
```typescript
const assets = await fetchAssets();
for (const asset of assets) {
  asset.streams = await fetchStreams(asset.id); // N queries!
}
```

✅ **Good:** Join in single query
```typescript
const assets = await supabase
  .from('assets')
  .select(`
    *,
    streams:asset_streams(
      stream:streams(*)
    )
  `)
  .limit(20);
```

**2. Denormalization for Aggregates**

Instead of `COUNT(*)` on every page load, maintain denormalized counters:

```sql
-- Denormalized in assets table
ALTER TABLE assets ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN like_count INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Triggers maintain consistency
CREATE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE assets SET like_count = like_count + 1 WHERE id = NEW.asset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE assets SET like_count = like_count - 1 WHERE id = OLD.asset_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_like_count
AFTER INSERT OR DELETE ON asset_likes
FOR EACH ROW
EXECUTE FUNCTION update_like_count();
```

**3. Indexes**

```sql
-- Composite indexes for common queries
CREATE INDEX idx_assets_uploader_created 
  ON assets(uploader_id, created_at DESC);

CREATE INDEX idx_asset_streams_stream_added 
  ON asset_streams(stream_id, added_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_assets_public 
  ON assets(created_at DESC) 
  WHERE visibility = 'public';
```

### Frontend Optimization

**1. React.memo for Expensive Components**

```typescript
export const AssetCard = React.memo(function AssetCard({ asset }: Props) {
  // Expensive rendering logic
  return <div>...</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.asset.id === nextProps.asset.id
    && prevProps.asset.likeCount === nextProps.asset.likeCount;
});
```

**2. Dynamic Imports (Code Splitting)**

```typescript
// Heavy component loaded on-demand
const DropEditor = dynamic(
  () => import('@/components/drops/drop-editor'),
  { 
    loading: () => <Skeleton />,
    ssr: false,  // Client-side only
  }
);
```

**3. Image Optimization**

```typescript
import Image from 'next/image';

<Image
  src={asset.thumbnail_url}
  alt={asset.title}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={asset.blurHash}
  loading="lazy"
/>
```

**4. Virtual Scrolling**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function AssetList({ assets }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <AssetCard asset={assets[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Caching Strategy

**1. React Query Cache**

```typescript
// lib/constants/cache.ts
export const CACHE_TIMES = {
  SHORT: 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

// Usage
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    staleTime: CACHE_TIMES.MEDIUM,
    cacheTime: CACHE_TIMES.LONG,
  });
}
```

**2. Next.js Caching**

```typescript
// Static generation (cached forever)
export const revalidate = 3600; // 1 hour

// Dynamic with cache
export async function generateStaticParams() {
  const streams = await fetchPopularStreams();
  return streams.map((stream) => ({ slug: stream.name }));
}
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────┐
│  Local Machine                              │
│  ┌────────────┐    ┌──────────────────┐    │
│  │ Next.js    │    │ Docker Compose   │    │
│  │ (Port 3000)│───▶│ - PostgreSQL     │    │
│  │            │    │ - GoTrue         │    │
│  │            │    │ - Storage        │    │
│  │            │    │ - Realtime       │    │
│  └────────────┘    │ - Studio         │    │
│                    └──────────────────┘    │
└─────────────────────────────────────────────┘
```

**Setup:**
```bash
# 1. Start Supabase
docker compose up -d

# 2. Run migrations
./migrate.sh

# 3. Start Next.js
npm run dev
```

### Production Architecture (Recommended)

```
                        ┌─────────────┐
                        │   Vercel    │
                        │  (Next.js)  │
                        └──────┬──────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  Supabase   │    │  LiteLLM    │    │   Resend    │
    │   Cloud     │    │   (AI)      │    │  (Email)    │
    │             │    │             │    │             │
    │ - Database  │    │             │    │             │
    │ - Auth      │    │             │    │             │
    │ - Storage   │    │             │    │             │
    │ - Realtime  │    │             │    │             │
    └─────────────┘    └─────────────┘    └─────────────┘
```

**Deployment Steps:**

1. **Deploy Supabase:**
   - Use Supabase Cloud (recommended)
   - Or self-host on AWS/GCP/Digital Ocean

2. **Deploy Next.js:**
   ```bash
   # Vercel deployment
   vercel --prod
   
   # Or Docker
   docker build -t mainstream .
   docker run -p 3000:3000 mainstream
   ```

3. **Configure Environment:**
   - Update Vercel environment variables
   - Point to production Supabase URL
   - Set production API keys

4. **Run Migrations:**
   ```bash
   # Connect to production database
   psql $DATABASE_URL < scripts/migrations/*.sql
   ```

### Scaling Considerations

**Horizontal Scaling (Multiple Instances):**
- Next.js is stateless (scales easily)
- Load balancer distributes traffic
- PostgreSQL connection pooling (Supavisor)

**Database Scaling:**
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer/Supavisor)
- Caching layer (Redis) for hot data

**Storage Scaling:**
- CDN for static assets (Cloudflare, CloudFront)
- Object storage scales automatically (S3, Supabase Storage)

**Real-time Scaling:**
- Supabase Realtime scales automatically
- Multiple Realtime instances behind load balancer

---

## Design Patterns

### 1. Repository Pattern (Data Access)

**Purpose:** Abstract database queries behind interfaces

```typescript
// lib/repositories/asset-repository.ts
export class AssetRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async findById(id: string): Promise<Asset | null> {
    const { data } = await this.supabase
      .from('assets')
      .select('*, uploader:users(*), streams:asset_streams(stream:streams(*))')
      .eq('id', id)
      .single();
    return data;
  }
  
  async findByUser(userId: string, options: PaginationOptions): Promise<Asset[]> {
    const { data } = await this.supabase
      .from('assets')
      .select('*')
      .eq('uploader_id', userId)
      .range(options.offset, options.offset + options.limit - 1);
    return data;
  }
  
  async create(asset: CreateAssetInput): Promise<Asset> {
    const { data } = await this.supabase
      .from('assets')
      .insert(asset)
      .select()
      .single();
    return data;
  }
}

// Usage in API route
export async function GET(request: Request) {
  const supabase = await createClient();
  const repository = new AssetRepository(supabase);
  
  const assets = await repository.findByUser(userId, { offset: 0, limit: 20 });
  return Response.json({ data: assets });
}
```

### 2. Custom Hook Pattern (Encapsulation)

**Purpose:** Encapsulate complex logic for reuse

```typescript
// lib/hooks/use-asset-like.ts
export function useAssetLike(assetId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Check if already liked
      const { data: existing } = await supabase
        .from('asset_likes')
        .select('*')
        .eq('asset_id', assetId)
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        // Unlike
        await supabase
          .from('asset_likes')
          .delete()
          .eq('asset_id', assetId)
          .eq('user_id', user.id);
        return { action: 'unliked' };
      } else {
        // Like
        await supabase
          .from('asset_likes')
          .insert({ asset_id: assetId, user_id: user.id });
        return { action: 'liked' };
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries(['asset', assetId]);
      const previous = queryClient.getQueryData(['asset', assetId]);
      
      queryClient.setQueryData(['asset', assetId], (old: any) => ({
        ...old,
        likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
        isLiked: !old.isLiked,
      }));
      
      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['asset', assetId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['asset', assetId]);
    },
  });
}

// Usage (simple!)
function AssetCard({ asset }: Props) {
  const { mutate: toggleLike, isLoading } = useAssetLike(asset.id);
  
  return (
    <button onClick={() => toggleLike()} disabled={isLoading}>
      {asset.isLiked ? '❤️' : '🤍'} {asset.likeCount}
    </button>
  );
}
```

### 3. Compound Component Pattern

**Purpose:** Related components that work together

```typescript
// components/drops/drop-editor.tsx
interface DropEditorContextValue {
  blocks: Block[];
  addBlock: (block: Block) => void;
  updateBlock: (id: string, data: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
}

const DropEditorContext = createContext<DropEditorContextValue | null>(null);

export function DropEditor({ children, dropId }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  
  const contextValue = {
    blocks,
    addBlock: (block) => setBlocks([...blocks, block]),
    updateBlock: (id, data) => setBlocks(blocks.map(b => 
      b.id === id ? { ...b, ...data } : b
    )),
    deleteBlock: (id) => setBlocks(blocks.filter(b => b.id !== id)),
  };
  
  return (
    <DropEditorContext.Provider value={contextValue}>
      <div className="drop-editor">
        {children}
      </div>
    </DropEditorContext.Provider>
  );
}

DropEditor.Header = function Header() {
  return <div className="drop-editor-header">...</div>;
};

DropEditor.Canvas = function Canvas() {
  const { blocks } = useContext(DropEditorContext)!;
  return <div className="drop-editor-canvas">{blocks.map(...)}</div>;
};

DropEditor.Toolbar = function Toolbar() {
  const { addBlock } = useContext(DropEditorContext)!;
  return <div className="drop-editor-toolbar">...</div>;
};

// Usage
<DropEditor dropId="123">
  <DropEditor.Header />
  <DropEditor.Toolbar />
  <DropEditor.Canvas />
</DropEditor>
```

### 4. Render Props Pattern

**Purpose:** Flexible component rendering

```typescript
interface DataFetcherProps<T> {
  query: UseQueryResult<T>;
  render: (data: T) => ReactNode;
  loading?: ReactNode;
  error?: (error: Error) => ReactNode;
}

function DataFetcher<T>({ query, render, loading, error }: DataFetcherProps<T>) {
  if (query.isLoading) {
    return <>{loading || <Skeleton />}</>;
  }
  
  if (query.isError) {
    return <>{error ? error(query.error) : <ErrorState error={query.error} />}</>;
  }
  
  if (!query.data) {
    return null;
  }
  
  return <>{render(query.data)}</>;
}

// Usage
<DataFetcher
  query={useAssets()}
  render={(assets) => <AssetGrid assets={assets} />}
  loading={<AssetGridSkeleton />}
  error={(error) => <Alert variant="destructive">{error.message}</Alert>}
/>
```

---

## Scalability Considerations

### Current Capacity

**Estimated capacity with current architecture:**
- **Users:** 10,000+ concurrent users
- **Assets:** 1M+ assets
- **Requests:** 1,000 req/s (with caching)
- **Real-time:** 10,000+ concurrent WebSocket connections

### Bottleneck Analysis

| Component | Bottleneck | Mitigation |
|-----------|-----------|------------|
| **Database** | Connection pool (100) | PgBouncer connection pooling |
| **Storage** | Bandwidth | CDN for hot assets |
| **Next.js** | Single instance | Horizontal scaling (load balancer) |
| **Realtime** | WebSocket connections | Supabase Realtime auto-scales |

### Scaling Roadmap

**Phase 1: Optimize (1K-10K users)**
- Enable React Query caching
- Add database indexes
- Implement CDN for assets
- Use Next.js Image optimization

**Phase 2: Scale Vertically (10K-50K users)**
- Upgrade database instance (more CPU/RAM)
- Add read replicas
- Increase Next.js container resources
- Add Redis for session storage

**Phase 3: Scale Horizontally (50K-500K users)**
- Multiple Next.js instances behind load balancer
- Database sharding by user ID
- Separate read/write database instances
- Dedicated Realtime cluster

**Phase 4: Distribute (500K+ users)**
- Multi-region deployment
- Edge caching (Cloudflare Workers)
- Geo-distributed database (CockroachDB)
- Microservices architecture (separate services for drops, assets, etc.)

---

## Appendices

### A. Glossary

| Term | Definition |
|------|------------|
| **Asset** | Uploaded design, image, video, or embed |
| **Stream** | Organizational unit (like tags + collections) |
| **Drop** | AI-powered newsletter |
| **Schedule** | Recurring drop generation configuration |
| **RLS** | Row Level Security (database-level authorization) |
| **JWT** | JSON Web Token (authentication token) |
| **SSR** | Server-Side Rendering |
| **CSR** | Client-Side Rendering |
| **Optimistic UI** | Update UI before server confirms |

### B. File Structure Reference

See project structure in [docs/README.md](./README.md#project-structure).

### C. Environment Variables

See [docs/QUICK_START.md](./QUICK_START.md#environment-setup).

### D. Migration History

See [docs/MIGRATIONS.md](./MIGRATIONS.md) (coming soon).

### E. Performance Benchmarks

**Typical Response Times:**
- Asset listing: 50-100ms
- Asset detail: 30-50ms
- Search: 100-200ms
- Real-time update latency: 50-150ms
- Drop generation: 5-15s

**Database Query Performance:**
- Simple SELECT: <10ms
- Complex JOIN: 20-50ms
- Full-text search: 50-100ms
- Aggregations: 100-200ms

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Document Version:** 2.0  
**Last Reviewed:** January 2026  
**Next Review:** March 2026

For questions or suggestions, see [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue.
