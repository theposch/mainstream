# AI Agent Quick Start

Quick onboarding guide for AI assistants working on the Cosmos codebase.

## 30-Second Summary

**What:** Design collaboration platform (Pinterest-style)  
**Status:** ✅ Fully functional with Supabase backend  
**Tech:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase  
**Last Updated:** November 2025

## Critical Context

### Recent Major Changes
- ✅ **Teams feature removed** - Streams serve this purpose now
- ✅ **Discover page removed** - Focus on Home feed and Streams
- ✅ **Data migration complete** - All components use Supabase (no mock data)
- ✅ **Comment likes implemented** - Real-time like functionality on comments
- ✅ **Following feed implemented** - See assets from users you follow
- ✅ **Settings API implemented** - User profile updates

### What NOT to Look For
- ❌ No `lib/mock-data/` (deleted after migration)
- ❌ No `lib/utils/assets-storage.ts` or `stream-storage.ts` (deleted)
- ❌ No teams pages (`/teams`, `/t/[slug]`) - removed
- ❌ No discover page (`/library`) - removed
- ❌ No workspace switcher component - removed
- ❌ No `website` field in user profiles - removed

## Project Structure

### Pages (`app/`)
```
home/page.tsx           - Main feed (Recent + Following tabs)
e/[id]/page.tsx        - Asset detail page
stream/[slug]/page.tsx - Stream page
streams/page.tsx       - All streams listing
u/[username]/page.tsx  - User profile (Shots/Streams/Liked)
auth/signup/page.tsx   - Signup
auth/login/page.tsx    - Login
```

### API Routes (`app/api/`)
```
assets/
  route.ts             - GET: List assets
  upload/route.ts      - POST: Upload asset
  following/route.ts   - GET: Assets from followed users
  [id]/
    like/route.ts      - POST/DELETE: Toggle like
    comments/route.ts  - GET/POST: Comments

comments/[id]/
  route.ts             - PUT/DELETE: Update/delete comment
  like/route.ts        - POST/DELETE: Toggle comment like

streams/
  route.ts             - GET/POST: List/create streams
  [id]/route.ts        - GET/PUT/DELETE: Stream operations

users/
  [username]/
    route.ts           - GET: User profile
    follow/route.ts    - POST/DELETE: Toggle follow
  me/route.ts          - PUT: Update current user

search/route.ts        - GET: Search assets/users/streams
notifications/route.ts - GET/PUT: Notifications
```

### Key Components
```
assets/
  element-card.tsx          - Asset card with hover
  masonry-grid.tsx          - Pinterest-style layout
  asset-detail-desktop.tsx  - Desktop modal
  asset-detail-mobile.tsx   - Mobile carousel
  comment-input.tsx         - Comment form with @mentions
  comment-item.tsx          - Comment with like button
  comment-list.tsx          - Threaded comments

streams/
  stream-header.tsx         - Stream page header
  stream-grid.tsx           - Stream listing grid
  stream-picker.tsx         - Stream selector for uploads

users/
  user-profile-header.tsx   - Profile header with follow button
  user-profile-tabs.tsx     - Tab navigation

layout/
  navbar-content.tsx        - Main navigation
  search-bar.tsx            - Global search with auto-suggest
  notifications-popover.tsx - Activity feed
  settings-dialog.tsx       - User settings modal
  upload-dialog.tsx         - Asset upload flow
```

### Hooks (`lib/hooks/`)
```
use-assets-infinite.ts      - Infinite scroll for recent assets
use-following-assets.ts     - Infinite scroll for following feed
use-asset-like.ts           - Like/unlike with real-time updates
use-asset-comments.ts       - CRUD operations for comments
use-comment-like.ts         - Like/unlike comments
use-user-follow.ts          - Follow/unfollow users
use-notifications.ts        - Real-time notifications
use-stream-mentions.ts      - Parse and create streams from hashtags
```

### Types (`lib/types/`)
```
database.ts - TypeScript interfaces for all DB entities:
  - Asset, Stream, User, Comment, Notification
  - All use snake_case (database convention)
```

## Data Model

```
users
  ├─ username, display_name, email, avatar_url, bio
  └─ owns → streams

streams
  ├─ name (slug), description, owner_id, is_private
  └─ assets (many-to-many via asset_streams)

assets
  ├─ title, url, uploader_id, width, height
  ├─ dominant_color, color_palette[]
  ├─ belongs to → streams (many-to-many)
  └─ has → likes, comments

asset_likes
  └─ asset_id, user_id, created_at

asset_comments
  ├─ asset_id, user_id, content, parent_id
  └─ has → likes (via comment_likes)

comment_likes
  └─ comment_id, user_id, created_at

user_follows
  └─ follower_id, following_id, created_at

notifications
  └─ user_id, type, content, is_read
```

## Authentication

**Current Implementation:** Supabase Auth with email/password

```typescript
// Client-side: Use hook
import { useUser } from "@/lib/auth/use-user";
const { user, loading } = useUser();

// Server-side: Async utility
import { getCurrentUser } from "@/lib/auth/get-user";
const user = await getCurrentUser();
```

**Protected Routes:** Middleware at `middleware.ts` handles session refresh

## Database Clients

```typescript
// Client components (browser)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Server components/API routes
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // Note: await required

// Admin operations (bypasses RLS)
import { createAdminClient } from "@/lib/supabase/server";
const supabase = await createAdminClient();
```

## Naming Conventions

### Database (snake_case)
```typescript
display_name
avatar_url
created_at
is_private
```

### TypeScript/React (camelCase)
```typescript
displayName
avatarUrl
createdAt
isPrivate
```

### Conversion
```typescript
// Database → TypeScript
const user = {
  display_name: row.display_name,
  avatar_url: row.avatar_url,
};

// TypeScript → Database
const updates = {
  display_name: displayName,
  avatar_url: avatarUrl,
};
```

## Common Patterns

### Infinite Scroll
```typescript
const { assets, loadMore, hasMore, loading } = useAssetsInfinite(initialAssets);

// Intersection Observer triggers loadMore()
```

### Real-time Updates
```typescript
// Subscribe to changes
useEffect(() => {
  const channel = supabase
    .channel('asset-likes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'asset_likes',
      filter: `asset_id=eq.${assetId}`
    }, handleChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [assetId]);
```

### Optimistic Updates
```typescript
// Update UI immediately
setLiked(true);
setLikeCount(prev => prev + 1);

try {
  // Then sync with server
  await fetch(`/api/assets/${id}/like`, { method: 'POST' });
} catch {
  // Revert on error
  setLiked(false);
  setLikeCount(prev => prev - 1);
}
```

## File Upload Flow

1. User selects file in `upload-dialog.tsx`
2. Client creates FormData with:
   - `file` - The file blob
   - `title` - Asset title
   - `description` - Optional description
   - `streamIds` - JSON array of stream IDs
3. POST to `/api/assets/upload`
4. Server:
   - Validates authentication
   - Uploads to Supabase Storage (`assets` bucket)
   - Extracts image dimensions
   - Inserts into `assets` table
   - Creates `asset_streams` relationships
5. Returns asset ID
6. Client navigates to asset detail page

## Search Flow

1. User types in search bar
2. Debounced (300ms) query sent to context
3. Auto-suggest dropdown fetches from `/api/search`
4. Clicking result:
   - Assets → `/e/[id]`
   - Users → `/u/[username]`
   - Streams → `/stream/[slug]`
5. Pressing Enter → `/search?q=query`

## Streams + Hashtags

### Creation
Type `#stream-name` during upload → stream created if not exists

### Validation
- Lowercase letters, numbers, hyphens only
- 3-50 characters
- No leading/trailing hyphens

### Storage
- `streams` table: Stream metadata
- `asset_streams` table: Asset-stream relationships

## Performance Optimizations

### Image Optimization
- Next.js Image component for automatic optimization
- Thumbnail, medium, and full sizes generated on upload
- Lazy loading with Intersection Observer

### Code Splitting
- Dynamic imports for heavy components
- Server components by default
- Client components only when needed

### Memoization
```typescript
// Expensive computations
const filtered = useMemo(() => 
  assets.filter(a => a.title.includes(query))
, [assets, query]);

// Component memoization
export const Card = React.memo(CardComponent);
```

## Testing

### Manual Testing
1. Start Supabase: `cd supabase-docker && docker-compose up -d`
2. Start dev server: `npm run dev`
3. Create test user at `/auth/signup`
4. Upload test asset
5. Test likes, comments, following

### Database Queries
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres

# Example queries
SELECT * FROM users;
SELECT * FROM assets LIMIT 10;
SELECT a.*, u.username FROM assets a JOIN users u ON a.uploader_id = u.id;
```

## Common Issues

### "Column does not exist"
- Check snake_case vs camelCase
- Verify column exists in database schema

### "Permission denied for table"
- Check RLS policies in Supabase Studio
- Use admin client for server-side operations

### Real-time not working
- Verify Supabase Realtime is enabled
- Check channel subscription setup
- Ensure proper cleanup in useEffect

### Build cache issues
```bash
rm -rf .next
npm run dev
```

## Key Files to Review First

When working on a feature, review:
1. Database schema: `scripts/migrations/001_initial_schema.sql`
2. Type definitions: `lib/types/database.ts`
3. Related API route: `app/api/[feature]/route.ts`
4. Related hook: `lib/hooks/use-[feature].ts`
5. Related component: `components/[feature]/`

## Where Things Are

| Feature | Page | API | Hook | Component |
|---------|------|-----|------|-----------|
| Asset feed | `app/home/page.tsx` | `api/assets/route.ts` | `use-assets-infinite.ts` | `masonry-grid.tsx` |
| Following | `app/home/page.tsx` | `api/assets/following/route.ts` | `use-following-assets.ts` | `feed.tsx` |
| Asset detail | `app/e/[id]/page.tsx` | - | `use-asset-detail.ts` | `asset-detail-*.tsx` |
| Likes | - | `api/assets/[id]/like/route.ts` | `use-asset-like.ts` | `element-card.tsx` |
| Comments | - | `api/assets/[id]/comments/route.ts` | `use-asset-comments.ts` | `comment-*.tsx` |
| Streams | `app/stream/[slug]/page.tsx` | `api/streams/route.ts` | `use-stream-mentions.ts` | `stream-*.tsx` |
| Profiles | `app/u/[username]/page.tsx` | `api/users/[username]/route.ts` | `use-user-follow.ts` | `user-profile-*.tsx` |
| Search | `app/search/page.tsx` | `api/search/route.ts` | - | `search-*.tsx` |

## Git Workflow

Current branch strategy:
- `main` - Production-ready code
- `feature/*` - Feature branches
- Commit frequently, merge when tested

## Questions to Ask

When implementing features:
1. Does this need real-time updates? → Use Supabase Realtime
2. Should this be a server or client component? → Default to server
3. Does this need authentication? → Check session in API route
4. Is this a list? → Consider pagination/infinite scroll
5. Does this modify data? → Add optimistic UI updates

## Resources

- Database Schema: `scripts/migrations/`
- Type Definitions: `lib/types/database.ts`
- API Routes: `app/api/`
- Hooks: `lib/hooks/`
- Components: `components/`
- Supabase Studio: http://localhost:8000
