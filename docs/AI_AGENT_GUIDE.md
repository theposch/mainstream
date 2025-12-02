# AI Agent Quick Start

Quick onboarding guide for AI assistants working on the Mainstream codebase.

## 30-Second Summary

**What:** Design collaboration platform (Pinterest-style)  
**Status:** ✅ Fully functional with Supabase backend  
**Tech:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase  
**Last Updated:** December 2025

## Critical Context

### Recent Major Changes
- ✅ **Stream Following** - Users can follow streams; posts appear in Following tab
- ✅ **Stream Bookmarks** - Add external links (Jira, Figma, etc.) with favicons
- ✅ **Stream Header Redesign** - Two-row layout, `#` prefix, contributor tooltip
- ✅ **Server-side Prefetch** - Instant stream page loading (zero client fetches)
- ✅ **Rebranded** - Cosmos → Mainstream
- ✅ **Performance optimized** - N+1 queries fixed, React.memo, parallel queries
- ✅ **Like system rebuilt** - Server-side like status pre-fetching
- ✅ **Teams feature removed** - Streams serve this purpose now
- ✅ **Discover page removed** - Focus on Home feed and Streams
- ✅ **Data migration complete** - All components use Supabase (no mock data)
- ✅ **Delete functionality** - Assets and streams can be deleted by owner

### What NOT to Look For
- ❌ No `lib/mock-data/` (deleted after migration)
- ❌ No `lib/utils/assets-storage.ts` or `stream-storage.ts` (deleted)
- ❌ No teams pages (`/teams`, `/t/[slug]`) - removed
- ❌ No discover page (`/library`) - removed
- ❌ No workspace switcher component - removed
- ❌ No color extraction/search - removed

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
    route.ts           - DELETE: Delete asset
    like/route.ts      - POST/DELETE: Toggle like
    comments/route.ts  - GET/POST: Comments

comments/[id]/
  route.ts             - PUT/DELETE: Update/delete comment
  like/route.ts        - POST/DELETE: Toggle comment like

streams/
  route.ts             - GET/POST: List/create streams
  [id]/route.ts        - GET/PUT/DELETE: Stream operations
  [id]/follow/route.ts - GET/POST/DELETE: Follow status & toggle
  [id]/bookmarks/route.ts - GET/POST: Stream bookmarks
  [id]/bookmarks/[bookmarkId]/route.ts - DELETE: Remove bookmark

users/
  [username]/
    route.ts           - GET: User profile
    follow/route.ts    - POST/DELETE: Toggle follow
  me/route.ts          - PUT: Update current user

search/route.ts        - GET: Search assets/users/streams (with total counts)
notifications/route.ts - GET/PUT: Notifications
```

### Key Components
```
assets/
  element-card.tsx          - Asset card with hover (React.memo)
  masonry-grid.tsx          - Pinterest-style layout (React.memo)
  asset-detail-desktop.tsx  - Desktop modal
  asset-detail-mobile.tsx   - Mobile carousel
  comment-input.tsx         - Comment form with @mentions
  comment-item.tsx          - Comment with like button
  comment-list.tsx          - Threaded comments

streams/
  stream-header.tsx         - Stream header (follow, bookmarks, contributors)
  stream-grid.tsx           - Stream listing grid
  stream-picker.tsx         - Stream selector for uploads
  add-bookmark-dialog.tsx   - Dialog for adding bookmarks

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
use-following-assets.ts     - Infinite scroll for following feed (users + streams)
use-asset-like.ts           - Like/unlike with optimistic updates
use-asset-comments.ts       - CRUD operations for comments
use-comment-like.ts         - Like/unlike comments
use-user-follow.ts          - Follow/unfollow users
use-stream-follow.ts        - Follow/unfollow streams with optimistic updates
use-stream-bookmarks.ts     - CRUD for stream bookmarks
use-notifications.ts        - Real-time notifications
use-stream-mentions.ts      - Parse and create streams from hashtags
use-stream-dropdown-options.ts - Shared stream dropdown logic
```

### Types (`lib/types/`)
```
database.ts - TypeScript interfaces for all DB entities:
  - Asset (includes likeCount, isLikedByCurrentUser, streams)
  - Stream, User, Comment, Notification
  - StreamFollow, StreamBookmark (new)
  - All use snake_case (database convention)
```

## Data Model

```
users
  ├─ username, display_name, email, avatar_url, bio
  └─ owns → streams

streams
  ├─ name (slug), description, owner_id, is_private
  ├─ assets (many-to-many via asset_streams)
  ├─ has → followers (via stream_follows)
  └─ has → bookmarks (via stream_bookmarks)

assets
  ├─ title, url, uploader_id, width, height
  ├─ belongs to → streams (many-to-many)
  ├─ has → likes, comments
  └─ includes pre-fetched: likeCount, isLikedByCurrentUser, streams

asset_likes
  └─ asset_id, user_id, created_at

asset_comments
  ├─ asset_id, user_id, content, parent_id
  └─ has → likes (via comment_likes)

comment_likes
  └─ comment_id, user_id, created_at

user_follows
  └─ follower_id, following_id, created_at

stream_follows (NEW)
  └─ stream_id, user_id, created_at

stream_bookmarks (NEW)
  └─ id, stream_id, url, title, created_by, position, created_at

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
display_name, avatar_url, created_at, is_private, like_count
```

### TypeScript/React (camelCase)
```typescript
displayName, avatarUrl, createdAt, isPrivate, likeCount
```

## Performance Patterns

### Pre-fetched Like Data
```typescript
// Server-side pages fetch like data with assets
const assetsWithData = assets.map(asset => ({
  ...asset,
  likeCount: asset.asset_likes?.[0]?.count || 0,
  isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
}));

// Client hooks trust server data
const { isLiked, likeCount, toggleLike } = useAssetLike(
  asset.id,
  asset.isLikedByCurrentUser ?? false,  // From server
  asset.likeCount ?? 0                   // From server
);
```

### Batch Fetching (N+1 Prevention)
```typescript
// Fetch all data in single query
const { data: assets } = await supabase
  .from('assets')
  .select(`
    *,
    uploader:users!uploader_id(*),
    asset_streams(streams(*)),
    asset_likes(count)
  `);

// Then batch fetch user's likes
const { data: userLikes } = await supabase
  .from('asset_likes')
  .select('asset_id')
  .eq('user_id', user.id)
  .in('asset_id', assetIds);
```

### Memoization
```typescript
// Components
export const ElementCard = React.memo(function ElementCard({ ... }) {
  // ...
});

// Callbacks
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### Server-Side Prefetch (Stream Pages)
```typescript
// app/stream/[slug]/page.tsx
// All data fetched in parallel on server - zero client fetches
const [
  ownerResult,
  followCountResult,
  bookmarksResult,
  // ... 9 queries total
] = await Promise.all([
  supabase.from('users').select('*').eq('id', stream.owner_id).single(),
  supabase.from('stream_follows').select('*', { count: 'exact', head: true }),
  supabase.from('stream_bookmarks').select('*'),
  // ...
]);

// Pass as props to client component
<StreamHeader 
  stream={stream}
  initialFollowData={initialFollowData}
  initialBookmarks={bookmarks}
  currentUser={currentUserProfile}
/>

// Hooks accept initial data and skip fetch
const { isFollowing, toggleFollow } = useStreamFollow(streamId, initialFollowData);
```

## Common Patterns

### Infinite Scroll
```typescript
const { assets, loadMore, hasMore, loading } = useAssetsInfinite(initialAssets);

// Intersection Observer triggers loadMore()
```

### Optimistic Updates
```typescript
// Update UI immediately
setLiked(true);
setLikeCount(prev => prev + 1);

try {
  await fetch(`/api/assets/${id}/like`, { method: 'POST' });
} catch {
  // Revert on error
  setLiked(false);
  setLikeCount(prev => prev - 1);
}
```

### Upload Refresh
```typescript
// Upload dialog dispatches event
window.dispatchEvent(new CustomEvent('asset-uploaded', { detail: { asset } }));

// Profile page listens and refreshes
useEffect(() => {
  const handler = () => setRefreshKey(k => k + 1);
  window.addEventListener('asset-uploaded', handler);
  return () => window.removeEventListener('asset-uploaded', handler);
}, []);
```

## Where Things Are

| Feature | Page | API | Hook | Component |
|---------|------|-----|------|-----------|
| Asset feed | `app/home/page.tsx` | `api/assets/route.ts` | `use-assets-infinite.ts` | `masonry-grid.tsx` |
| Following | `app/home/page.tsx` | `api/assets/following/route.ts` | `use-following-assets.ts` | `feed.tsx` |
| Asset detail | `app/e/[id]/page.tsx` | - | `use-asset-detail.ts` | `asset-detail-*.tsx` |
| Likes | - | `api/assets/[id]/like/route.ts` | `use-asset-like.ts` | `element-card.tsx` |
| Comments | - | `api/assets/[id]/comments/route.ts` | `use-asset-comments.ts` | `comment-*.tsx` |
| Streams | `app/stream/[slug]/page.tsx` | `api/streams/route.ts` | `use-stream-mentions.ts` | `stream-*.tsx` |
| Stream Follow | `app/stream/[slug]/page.tsx` | `api/streams/[id]/follow/route.ts` | `use-stream-follow.ts` | `stream-header.tsx` |
| Stream Bookmarks | `app/stream/[slug]/page.tsx` | `api/streams/[id]/bookmarks/route.ts` | `use-stream-bookmarks.ts` | `stream-header.tsx` |
| Profiles | `app/u/[username]/page.tsx` | `api/users/[username]/route.ts` | `use-user-follow.ts` | `user-profile-*.tsx` |
| Search | `app/search/page.tsx` | `api/search/route.ts` | - | `search-*.tsx` |

## Git Workflow

Current branch strategy:
- `main` - Production-ready code
- `feature/*` - Feature branches
- `docs/*` - Documentation updates
- Commit frequently, merge when tested

## Common Issues

### "Column does not exist"
- Check snake_case vs camelCase
- Verify column exists in database schema

### "Permission denied for table"
- Check RLS policies in Supabase Studio
- Use admin client for server-side operations

### Like icon fills with delay
- Ensure server-side pages pre-fetch `isLikedByCurrentUser`
- Pass to `useAssetLike` hook as initial value

### Build cache issues
```bash
rm -rf .next
npm run dev
```

## Key Files to Review First

When working on a feature, review:
1. Database schema: `scripts/migrations/001_initial_schema.sql`
2. New migrations: `scripts/migrations/003_stream_follows.sql`, `004_stream_bookmarks.sql`
3. Type definitions: `lib/types/database.ts`
4. Related API route: `app/api/[feature]/route.ts`
5. Related hook: `lib/hooks/use-[feature].ts`
6. Related component: `components/[feature]/`

## Resources

- Database Schema: `scripts/migrations/`
- Type Definitions: `lib/types/database.ts`
- API Routes: `app/api/`
- Hooks: `lib/hooks/`
- Components: `components/`
- Supabase Studio: http://localhost:8000
