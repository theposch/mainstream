# AI Agent Quick Start

Quick onboarding guide for AI assistants working on the Mainstream codebase.

## 30-Second Summary

**What:** Design collaboration platform (Pinterest-style)  
**Status:** ✅ Fully functional with Supabase backend  
**Tech:** Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase, LiteLLM  
**Last Updated:** December 2025

## Critical Context

### Recent Major Changes
- ✅ **React Query Cache Invalidation** - Following feed auto-refreshes after follow/unfollow (NEW)
- ✅ **Centralized Constants** - Cache times, page sizes, and timing in `lib/constants/cache.ts` (NEW)
- ✅ **String Utilities** - Shared `getInitials`, `truncate`, etc. in `lib/utils/string.ts` (NEW)
- ✅ **Error Boundaries** - Graceful error handling with `ErrorBoundary` component (NEW)
- ✅ **Dynamic Imports** - Lazy-loaded dialogs for better performance (NEW)
- ✅ **Media Query Hooks** - Shared `useIsMobile`, `useIsTablet` hooks (NEW)
- ✅ **Weekly Feed Grouping** - Posts grouped by week with "This week", "Last week" headers
- ✅ **Feed Layout Toggle** - Switch between grid and detailed list views
- ✅ **Contributor Avatars** - Stacked avatar component showing who posted each week
- ✅ **Micro-animations & Delight** - Confetti celebrations, animated like button with particles
- ✅ **Cursor Consistency** - All interactive elements now show pointer cursor
- ✅ **Create Drop Filters** - Multi-select streams and users when creating drops
- ✅ **shadcn DatePicker** - Replace native date inputs with shadcn DatePicker component
- ✅ **UserPicker Component** - Multi-select user picker with search and keyboard navigation
- ✅ **Date Range Display** - Show date range in drop editor, preview, published view, and email
- ✅ **Timezone-safe Dates** - Dates stored/displayed correctly regardless of user timezone
- ✅ **Private Stream Members** - Add/remove users to private streams with roles (owner/admin/member)
- ✅ **Stream Editing** - Edit stream name, description, privacy from dropdown menu
- ✅ **Draft Deletion** - Delete drafts from drop cards and editor with optimistic UI
- ✅ **Notification Settings** - Toggle notifications by type (likes, comments, follows, mentions)
- ✅ **Real-time View Counts** - View count updates instantly via callback
- ✅ **Atomic View Recording** - Single RPC call handles view tracking atomically
- ✅ **Reply Notifications** - Both asset owner and comment author notified on replies
- ✅ **WebM Video Support** - Upload WebM videos up to 50MB with autoplay in feed
- ✅ **Loom Embeds** - Paste Loom URLs to embed videos with thumbnails
- ✅ **Route Protection** - Middleware redirects unauthenticated users to login
- ✅ **Arrow Key Navigation** - Navigate between assets in modal with keyboard
- ✅ **Drops (AI Newsletter)** - AI-powered weekly drops with block-based Notion-like editor
- ✅ **LiteLLM Integration** - AI description generation using Gemini 2.5 Flash
- ✅ **Unlisted Assets** - Images uploaded in drops don't appear in feed
- ✅ **Image Galleries** - Multi-image blocks with grid/featured layouts
- ✅ **Email Preview** - React Email components for email-compatible drops
- ✅ **Figma Embeds** - Paste Figma URLs to embed designs with thumbnails
- ✅ **Animated GIFs** - Full GIF support with animation on hover and GIF badge
- ✅ **Real-time Notifications** - Live notification updates with typing indicators
- ✅ **Comment Deep Linking** - Click notification to jump to specific comment with highlight
- ✅ **Token Encryption** - AES-256-GCM encryption for API tokens
- ✅ **View Tracking** - "Seen by X people" with hover tooltip showing viewers (2s threshold)
- ✅ **Comment Likes** - Like/unlike comments with real-time updates
- ✅ **Modal Overlay for Assets** - Pinterest-style instant modal from feed (React Query + nuqs)
- ✅ **React Query Integration** - Caching, prefetching, and optimistic updates
- ✅ **URL State Sync** - Modal state syncs with URL for deep linking & back button
- ✅ **Hover Prefetching** - Comments pre-loaded on card hover (150ms debounce)
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
drops/page.tsx         - Drops listing (newsletters)
drops/[id]/page.tsx    - Published drop view
drops/[id]/edit/page.tsx - Drop block editor
u/[username]/page.tsx  - User profile (Shots/Streams/Liked)
auth/signup/page.tsx   - Signup
auth/login/page.tsx    - Login
```

### API Routes (`app/api/`)
```
assets/
  route.ts             - GET: List assets
  upload/route.ts      - POST: Upload asset (images, GIFs, WebM videos up to 50MB)
  embed/route.ts       - POST: Create embed asset from URL (Figma, Loom)
  following/route.ts   - GET: Assets from followed users
  [id]/
    route.ts           - GET/PATCH/DELETE: Asset operations
    like/route.ts      - POST/DELETE: Toggle like
    comments/route.ts  - GET/POST: Comments
    view/route.ts      - POST: Record view (2s threshold)
    viewers/route.ts   - GET: List viewers for tooltip

comments/[id]/
  route.ts             - PUT/DELETE: Update/delete comment
  like/route.ts        - POST/DELETE: Toggle comment like

streams/
  route.ts             - GET/POST: List/create streams
  [id]/route.ts        - GET/PUT/DELETE: Stream operations
  [id]/follow/route.ts - GET/POST/DELETE: Follow status & toggle
  [id]/bookmarks/route.ts - GET/POST: Stream bookmarks
  [id]/bookmarks/[bookmarkId]/route.ts - DELETE: Remove bookmark
  [id]/members/route.ts - GET/POST/DELETE: Member management (private streams)
  [id]/assets/route.ts  - GET/POST/DELETE: Assets with access control


drops/
  route.ts             - GET/POST: List/create drops
  [id]/route.ts        - GET/PATCH/DELETE: Drop operations
  [id]/generate/route.ts - POST: Generate AI description
  [id]/publish/route.ts - POST: Publish drop (+ optional email)
  [id]/email-preview/route.ts - GET: Email HTML preview
  [id]/blocks/route.ts - POST/PUT: Create/reorder blocks
  [id]/blocks/[blockId]/route.ts - PATCH/DELETE: Update/delete block
  [id]/blocks/[blockId]/gallery/route.ts - POST/DELETE: Gallery images
  [id]/posts/route.ts  - POST: Add posts (legacy)
  [id]/posts/[postId]/route.ts - DELETE: Remove post (legacy)

ai/
  describe/route.ts    - POST: Generate AI asset description

users/
  route.ts             - GET: List users with pagination (People page)
  [username]/
    route.ts           - GET: User profile
    follow/route.ts    - POST/DELETE: Toggle follow
  me/route.ts          - PUT: Update current user
  me/avatar/route.ts   - POST/DELETE: Upload/remove avatar
  me/email/route.ts    - POST: Change email
  me/password/route.ts - POST: Change password
  me/delete/route.ts   - DELETE: Delete account
  me/integrations/route.ts - GET/POST: Manage integrations (Figma token)
  me/notification-settings/route.ts - GET/PUT: Notification preferences

search/route.ts        - GET: Search assets/users/streams (with total counts)
notifications/route.ts - GET/PUT: Notifications
```

### Key Components
```
dashboard/
  feed.tsx                    - Main feed with weekly grouping and layout toggle
  feed-tabs.tsx               - Recent/Following tab switcher
  week-header.tsx             - Weekly section header (post count + contributor avatars)
  contributor-avatars.tsx     - Stacked avatar group with tooltips and profile links

assets/
  element-card.tsx          - Asset card with grid/detailed layouts, hover, GIF badge (React.memo)
  masonry-grid.tsx          - Pinterest-style layout with layout prop, error boundaries (React.memo)
  asset-detail.tsx          - Responsive wrapper using useIsMobile hook
  asset-detail-desktop.tsx  - Desktop modal with view tracking, Figma embeds, smart preloading
  asset-detail-mobile.tsx   - Mobile carousel with view tracking, Figma embeds
  asset-card-error.tsx      - Error fallback for failed asset cards
  comment-input.tsx         - Comment form with @mentions, typing indicator
  comment-item.tsx          - Comment with like button, highlight animation
  comment-list.tsx          - Threaded comments (no nested replies)
  viewers-tooltip.tsx       - Hover tooltip showing who viewed
  typing-indicator.tsx      - "X is typing..." indicator

streams/
  stream-header.tsx         - Stream header (follow, bookmarks, contributors, members)
  stream-grid.tsx           - Stream listing grid
  stream-picker.tsx         - Multi-select stream picker (used in uploads and drop creation)
  add-bookmark-dialog.tsx   - Dialog for adding bookmarks
  manage-members-dialog.tsx - Add/remove members for private streams

users/
  user-picker.tsx           - Multi-select user picker with search (used in drop creation)

drops/
  create-drop-dialog.tsx    - New drop creation with DatePicker, StreamPicker, UserPicker
  drop-card.tsx             - Drop preview card with delete menu
  drops-grid.tsx            - Grid layout for drops
  drop-view.tsx             - Classic drop view (legacy)
  drop-publish-dialog.tsx   - Publish confirmation dialog
  delete-drop-dialog.tsx    - Confirm delete with error handling
  blocks/
    block-editor.tsx        - Notion-like interactive block editor
    block-renderer.tsx      - Client-side block rendering
    drop-blocks-view.tsx    - Preview/published drop view (with date range)
    email-block-renderer.tsx - Server-side email block rendering
    email-drop-view.tsx     - Full email template (with date range)

ui/ (shadcn components)
  button.tsx                - Base button with cursor-pointer (all variants)
  calendar.tsx              - Calendar component (react-day-picker v9)
  date-picker.tsx           - Reusable date picker (Popover + Calendar)
  like-button.tsx           - Animated like button with heartbeat and particles
  error-boundary.tsx        - Error boundary with reset capability

users/
  user-profile-header.tsx   - Profile header with follow button
  user-profile-tabs.tsx     - Tab navigation

layout/
  navbar-content.tsx        - Main navigation
  search-bar.tsx            - Global search with auto-suggest
  notifications-popover.tsx - Activity feed with comment deep linking
  settings-dialog.tsx       - User settings modal with Figma integration
  upload-dialog.tsx         - Asset upload flow
  create-dialog.tsx         - Create options (stream, upload, URL)
  embed-url-dialog.tsx      - Dialog for adding embeds via URL
  stream-dialog.tsx         - Create/edit stream dialog (dual-mode)
```

### Hooks (`lib/hooks/`)
```
use-assets-infinite.ts      - Infinite scroll for recent assets (React Query)
use-following-assets.ts     - Infinite scroll for following feed (React Query, auto-invalidation)
use-asset-like.ts           - Like/unlike with optimistic updates
use-asset-view.ts           - Record view after 2s (atomic RPC, real-time count callback)
use-asset-comments.ts       - CRUD operations (React Query + Supabase Realtime)
use-asset-prefetch.ts       - Hover-based data prefetching for instant modal
use-comment-like.ts         - Like/unlike comments (race-condition fixed)
use-comment-likes-manager.ts - Centralized comment likes state management
use-user-follow.ts          - Follow/unfollow users (+ cache invalidation)
use-stream-follow.ts        - Follow/unfollow streams (+ cache invalidation)
use-stream-bookmarks.ts     - CRUD for stream bookmarks
use-stream-members.ts       - Add/remove members with optimistic updates
use-notifications.ts        - Real-time notifications with asset enrichment
use-stream-mentions.ts      - Parse and create streams from hashtags
use-stream-dropdown-options.ts - Shared stream dropdown logic
use-typing-indicator.ts     - Real-time typing status (Supabase Presence)
use-figma-integration.ts    - Manage Figma token connection status
use-media-query.ts          - Shared media queries (useIsMobile, useIsTablet, etc.)
```

### Providers (`lib/providers/`)
```
query-provider.tsx          - React Query provider with DevTools (dev only)
```

### Queries (`lib/queries/`)
```
asset-queries.ts            - Query keys factory and fetch functions
                              - assetKeys.all, .list, .detail, .comments
                              - assetKeys.recent(), .following() - for infinite queries
                              - fetchAssetById, fetchAssetComments
```

### Types (`lib/types/`)
```
database.ts - TypeScript interfaces for all DB entities:
  - Asset (includes likeCount, isLikedByCurrentUser, view_count, streams, asset_type, embed_url, embed_provider, visibility)
  - Stream, User (includes figma_access_token)
  - Comment (single source of truth for comment data)
  - CommentUser (partial user data for comments)
  - Notification (includes content, comment_id)
  - NotificationType, ResourceType (type unions)
  - StreamFollow, StreamBookmark
  - AssetViewer (for view tooltip)
  - Drop, DropPost, DropBlock, DropBlockGalleryImage (AI newsletter system)
  - DropBlockType ('text' | 'heading' | 'post' | 'featured_post' | 'divider' | 'quote' | 'image_gallery')
  - All use snake_case (database convention)
```

### Utils (`lib/utils/`)
```
ai.ts                 - LiteLLM integration (isAIConfigured, AIError)
confetti.ts           - Celebration animations (triggerConfetti, triggerSmallConfetti)
embed-providers.ts    - Figma URL detection, oEmbed/API integration
encryption.ts         - AES-256-GCM token encryption utilities
image-processing.ts   - Sharp-based image/GIF processing
file-storage.ts       - Local file storage helpers
week-grouping.ts      - Group assets by week for feed display (WeekGroup interface)
string.ts             - String utilities (getInitials, truncate, capitalize, slugify, pluralize)
```

### Constants (`lib/constants/`)
```
cache.ts              - Centralized timing constants:
                        - CACHE_TIMES: staleTime, gcTime for React Query
                        - PAGE_SIZES: SSR_INITIAL, CLIENT_PAGE, MAX_LIMIT
                        - REALTIME: debounce, throttle values
                        - UI_TIMING: prefetch delay, highlight duration
                        - VIRTUALIZATION: thresholds and heights
```

## Data Model

```
users
  ├─ username, display_name, email, avatar_url, bio
  ├─ figma_access_token (encrypted), figma_token_updated_at
  └─ owns → streams

streams
  ├─ name (slug), description, owner_id, is_private
  ├─ assets (many-to-many via asset_streams)
  ├─ has → followers (via stream_follows)
  └─ has → bookmarks (via stream_bookmarks)

assets
  ├─ title, url, thumbnail_url, uploader_id, width, height, view_count
  ├─ asset_type ('image' | 'video' | 'embed'), embed_url, embed_provider ('figma' | 'loom')
  ├─ visibility ('public' | 'unlisted') - unlisted = drop-only, hidden from feed
  ├─ type ('image' | 'video' | 'link') - content type field
  ├─ belongs to → streams (many-to-many)
  ├─ has → likes, comments, views
  └─ includes pre-fetched: likeCount, isLikedByCurrentUser, view_count, streams

asset_likes
  └─ asset_id, user_id, created_at

asset_views
  └─ asset_id, user_id, viewed_at (unique per user, triggers view_count increment)

asset_comments
  ├─ asset_id, user_id, content, parent_id (no nested replies)
  └─ has → likes (via comment_likes)

comment_likes
  └─ comment_id, user_id, created_at

user_follows
  └─ follower_id, following_id, created_at

stream_follows
  └─ stream_id, user_id, created_at

stream_bookmarks
  └─ id, stream_id, url, title, created_by, position, created_at

stream_members
  └─ stream_id, user_id, role ('admin' | 'member'), joined_at

notifications
  └─ user_id, type (like_asset|like_comment|comment|reply_comment|follow|mention)
  └─ resource_id, resource_type, actor_id, content, comment_id, is_read

user_notification_settings
  └─ user_id (PK), in_app_enabled, likes_enabled, comments_enabled
  └─ follows_enabled, mentions_enabled, created_at, updated_at

drops
  ├─ title, description, status ('draft' | 'published')
  ├─ created_by, date_range_start, date_range_end
  ├─ filter_stream_ids[], filter_user_ids[]
  ├─ is_weekly, use_blocks
  └─ has → drop_blocks, drop_posts (legacy)

drop_blocks
  ├─ drop_id, type, position, content, heading_level
  ├─ asset_id (for post/featured_post)
  ├─ display_mode, crop_position_x, crop_position_y
  ├─ gallery_layout, gallery_featured_index
  └─ has → gallery_images (for image_gallery)

drop_block_gallery_images
  └─ block_id, asset_id, position

drop_posts (legacy)
  └─ drop_id, asset_id, position, display_mode, crop_position_x, crop_position_y
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

### Error Boundaries
```typescript
// Wrap components that might fail
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AssetCardErrorFallback } from "@/components/assets/asset-card-error";

<ErrorBoundary
  fallback={(error, reset) => (
    <AssetCardErrorFallback error={error} onRetry={reset} />
  )}
>
  <ElementCard asset={asset} />
</ErrorBoundary>
```

### Dynamic Imports (Code Splitting)
```typescript
// Lazy-load dialogs to reduce initial bundle
import dynamic from "next/dynamic";

const StreamDialog = dynamic(
  () => import("@/components/layout/stream-dialog").then((mod) => mod.StreamDialog),
  { ssr: false }
);

// Used in: streams-tab.tsx, create-dialog.tsx, stream-header.tsx
// Also: EditProfileDialog, ManageMembersDialog
```

### Shared Media Queries
```typescript
// Use centralized media query hooks (deduplicated listeners)
import { useIsMobile, useIsTablet } from "@/lib/hooks/use-media-query";

const isMobile = useIsMobile();   // < 768px
const isTablet = useIsTablet();   // < 1024px
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

### Modal Overlay Pattern (Asset Detail)
```typescript
// Feed opens assets as modal overlay (not page navigation)
// components/dashboard/feed.tsx
const [selectedAssetId, setSelectedAssetId] = useQueryState("asset"); // URL sync

const handleAssetClick = (asset: Asset) => setSelectedAssetId(asset.id);
const handleCloseModal = () => setSelectedAssetId("");

// Render modal when selected
{selectedAsset && (
  <AssetDetail asset={selectedAsset} onClose={handleCloseModal} />
)}
```

### React Query Prefetching
```typescript
// Hover prefetch for instant modal opening
// lib/hooks/use-asset-prefetch.ts
const { onMouseEnter, onMouseLeave } = useAssetPrefetch(assetId);

// Prefetches comments after 150ms hover
<ElementCard onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />

// Query keys for cache consistency
import { assetKeys } from "@/lib/queries/asset-queries";
queryClient.prefetchQuery({
  queryKey: assetKeys.comments(assetId),
  queryFn: () => fetchAssetComments(assetId),
});
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

### Cache Invalidation on Follow/Unfollow
```typescript
// When user follows/unfollows a stream or user, invalidate the Following feed
// This ensures the feed refreshes with new content when they visit the Following tab

import { useQueryClient } from "@tanstack/react-query";
import { assetKeys } from "@/lib/queries/asset-queries";

const queryClient = useQueryClient();

// After successful follow/unfollow:
queryClient.invalidateQueries({ queryKey: assetKeys.following() });

// Query keys are centralized in lib/queries/asset-queries.ts:
// assetKeys.following() → ["assets", "following"]
// assetKeys.recent() → ["assets", "recent"]
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

## Drops (AI Newsletter)

### Overview
AI-powered newsletters that summarize your team's weekly design work. Uses a Notion-like block-based editor.

### Key Features
- **Block Types**: Text, Heading (H1-H3), Post, Featured Post, Divider, Quote, Image Gallery
- **AI Generation**: Generate descriptions using LiteLLM (Gemini 2.5 Flash)
- **Unlisted Assets**: Images uploaded in drops are hidden from feed/search/profiles
- **Email Preview**: Renders using React Email components for cross-client compatibility
- **Display Modes**: Fit/Cover with adjustable crop position for images
- **Create Drop Filters**: Multi-select streams and users to filter which posts are included
- **Date Range Display**: Shows the date range in editor, preview, published view, and email
- **Timezone-safe**: Dates are stored and displayed correctly regardless of user timezone

### Create Drop Components
- `DatePicker` - shadcn date picker built on react-day-picker v9
- `StreamPicker` - Multi-select stream filter with compact variant
- `UserPicker` - Multi-select user filter with search and keyboard navigation

### Environment Variables
```env
# Required for AI features
LITELLM_BASE_URL=https://your-litellm-instance.com
LITELLM_API_KEY=your-api-key
LITELLM_MODEL=gemini/gemini-2.5-flash-preview-05-20

# Optional for email delivery
RESEND_API_KEY=re_your-resend-key
```

### Documentation
See `docs/DROPS_FEATURE.md` for comprehensive documentation.

---

## Where Things Are

| Feature | Page | API | Hook | Component |
|---------|------|-----|------|-----------|
| Asset feed | `app/home/page.tsx` | `api/assets/route.ts` | `use-assets-infinite.ts` | `feed.tsx`, `masonry-grid.tsx` |
| Weekly grouping | `app/home/page.tsx` | - | - | `week-header.tsx`, `contributor-avatars.tsx` |
| Layout toggle | `app/home/page.tsx` | - | - | `feed.tsx`, `element-card.tsx` |
| Following | `app/home/page.tsx` | `api/assets/following/route.ts` | `use-following-assets.ts` | `feed.tsx` |
| Asset detail | `app/e/[id]/page.tsx` | `api/assets/[id]/route.ts` | `use-asset-detail.ts` | `asset-detail-*.tsx` |
| Likes | - | `api/assets/[id]/like/route.ts` | `use-asset-like.ts` | `element-card.tsx` |
| Views | - | `api/assets/[id]/view/route.ts` | `use-asset-view.ts` | `viewers-tooltip.tsx` |
| Comments | - | `api/assets/[id]/comments/route.ts` | `use-asset-comments.ts` | `comment-*.tsx` |
| Comment Likes | - | `api/comments/[id]/like/route.ts` | `use-comment-like.ts` | `comment-item.tsx` |
| Typing indicator | - | - | `use-typing-indicator.ts` | `typing-indicator.tsx` |
| Figma embeds | - | `api/assets/embed/route.ts` | - | `embed-url-dialog.tsx` |
| Figma integration | - | `api/users/me/integrations/route.ts` | `use-figma-integration.ts` | `settings-dialog.tsx` |
| Streams | `app/stream/[slug]/page.tsx` | `api/streams/route.ts` | `use-stream-mentions.ts` | `stream-*.tsx` |
| Stream Follow | `app/stream/[slug]/page.tsx` | `api/streams/[id]/follow/route.ts` | `use-stream-follow.ts` | `stream-header.tsx` |
| Stream Bookmarks | `app/stream/[slug]/page.tsx` | `api/streams/[id]/bookmarks/route.ts` | `use-stream-bookmarks.ts` | `stream-header.tsx` |
| Stream Members | `app/stream/[slug]/page.tsx` | `api/streams/[id]/members/route.ts` | `use-stream-members.ts` | `manage-members-dialog.tsx` |
| Stream Edit | `app/stream/[slug]/page.tsx` | `api/streams/[id]/route.ts` | - | `stream-dialog.tsx` |
| Profiles | `app/u/[username]/page.tsx` | `api/users/[username]/route.ts` | `use-user-follow.ts` | `user-profile-*.tsx` |
| Search | `app/search/page.tsx` | `api/search/route.ts` | - | `search-*.tsx` |
| Notifications | - | `api/notifications/route.ts` | `use-notifications.ts` | `notifications-popover.tsx` |
| Drops | `app/drops/page.tsx` | `api/drops/route.ts` | - | `drops/drop-*.tsx` |
| Drop Editor | `app/drops/[id]/edit/page.tsx` | `api/drops/[id]/blocks/route.ts` | - | `drops/blocks/*.tsx` |
| Create Drop | - | `api/drops/route.ts` | - | `create-drop-dialog.tsx` |
| DatePicker | - | - | - | `ui/date-picker.tsx`, `ui/calendar.tsx` |
| UserPicker | - | `api/users/route.ts` | - | `users/user-picker.tsx` |
| AI Describe | - | `api/ai/describe/route.ts` | `use-ai-description.ts` | `post-metadata-form.tsx` |

## Embeds (Figma & Loom)

### Overview
Paste a Figma or Loom URL → automatically creates an embed asset with thumbnail preview.

### Supported Providers
- **Figma**: Design files, frames, prototypes
- **Loom**: Video recordings

### How It Works
1. User clicks "Add via URL" in create dialog
2. Pastes URL from supported provider
3. System detects provider and fetches thumbnail:
   - **Figma with token**: Frame-specific thumbnails via Figma REST API
   - **Figma without token**: File-level thumbnails via oEmbed API
   - **Loom**: Thumbnails via oEmbed API
4. Thumbnail is downloaded and stored locally (never expires)
5. Asset created with `asset_type: 'embed'`, `embed_provider: 'figma'` or `'loom'`

### Display
- **Figma**: Shows thumbnail in feed, interactive embed in detail view
- **Loom**: Shows thumbnail with VIDEO badge, plays in iframe in detail view
- Provider badges shown on cards (subtle, top-right corner)

### Environment Variables
```env
# Optional: For frame-specific Figma thumbnails
# Users can also add tokens in Settings → Connected Accounts
ENCRYPTION_KEY=your_64_char_hex_key  # openssl rand -hex 32
```

### Key Files
- `lib/utils/embed-providers.ts` - Provider detection, oEmbed/API integration (Figma, Loom)
- `app/api/assets/embed/route.ts` - Create embed assets
- `app/api/users/me/integrations/route.ts` - Manage Figma tokens
- `components/layout/embed-url-dialog.tsx` - URL input dialog

## Animated GIF Support

### Overview
Upload animated GIFs → preserved animation with GIF badge in feed.

### Processing Pipeline
1. **Detection**: Sharp detects if GIF is animated (`pages > 1`)
2. **Full size**: Animation preserved (optimized)
3. **Medium size**: Animation preserved (800px max)
4. **Thumbnail**: Static JPEG for performance

### Feed Display
- Shows static thumbnail by default
- **GIF badge** appears on card
- **Hover**: Plays full animation
- Uses native `<img>` for animated playback (bypasses Next.js Image optimization)

### Key Files
- `lib/utils/image-processing.ts` - `isAnimatedGif()`, `optimizeAnimatedGif()`, `generateGifThumbnail()`
- `app/api/assets/upload/route.ts` - Conditional GIF processing
- `components/assets/element-card.tsx` - GIF badge and hover animation

## WebM Video Support

### Overview
Upload WebM videos (up to 50MB) → autoplay in feed, controls in detail view.

### Upload Processing
1. **Validation**: File type must be `video/webm`, max 50MB
2. **Storage**: Video saved directly (no transcoding)
3. **Database**: `asset_type: 'video'`, `type: 'video'`

### Feed Display
- **VIDEO badge** appears on card
- **Autoplay** with loop, muted
- Uses native `<video>` element

### Detail View
- Full video player with controls
- Not muted by default

### Key Files
- `app/api/assets/upload/route.ts` - WebM handling (no image processing)
- `components/assets/element-card.tsx` - Video element with VIDEO badge
- `components/assets/asset-detail-desktop.tsx` - Video player with controls
- `components/layout/upload-dialog.tsx` - Accepts video/webm, 50MB limit

### Configuration
```typescript
// next.config.ts
experimental: {
  middlewareClientMaxBodySize: '50mb',  // For large video uploads
}
```

## Real-time Features

### Notifications
- WebSocket subscription to `notifications` table
- Filters by `recipient_id` (requires `REPLICA IDENTITY FULL`)
- Enriches with asset data on arrival

### Typing Indicators
- Uses Supabase Realtime Presence
- Channel per asset: `typing:${assetId}`
- Auto-clears after 3 seconds of inactivity
- Shows "X is typing..." with animated dots

### Comment Deep Linking
- Click notification → navigate to `/e/{assetId}?comment={commentId}`
- Scrolls to comment and highlights briefly
- Uses Framer Motion for highlight animation

### Key Migrations for Real-time
```sql
-- Required for real-time filtering
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE asset_comments REPLICA IDENTITY FULL;
ALTER TABLE comment_likes REPLICA IDENTITY FULL;
```

## Micro-animations & Delight

### Confetti Celebrations
Trigger confetti animations on key "posting" moments:

```typescript
import { triggerConfetti, triggerSmallConfetti } from "@/lib/utils/confetti";

// Big celebration - Drop publish
triggerConfetti();

// Small celebration - Image upload, embed creation
triggerSmallConfetti();
```

**Where used:**
- `drop-publish-dialog.tsx` - Publishing a drop
- `upload-dialog.tsx` - Successful image upload
- `embed-url-dialog.tsx` - Creating an embed
- `block-editor.tsx` - Uploading an asset in the block editor

### Animated Like Button
Reusable component with heartbeat animation and floating particles:

```typescript
import { LikeButton } from "@/components/ui/like-button";

<LikeButton
  isLiked={isLiked}
  likeCount={likeCount}
  onLike={handleLike}
  size="default"       // "sm" | "default" | "lg"
  variant="ghost"      // "ghost" | "solid"
/>
```

**Features:**
- Spring animation on like
- Floating heart particles
- Background glow effect
- Respects `prefers-reduced-motion`

**Used in:**
- `element-card.tsx` - Feed cards (solid variant)
- `asset-detail-desktop.tsx` - Desktop modal
- `asset-detail-mobile.tsx` - Mobile view
- `comment-item.tsx` - Comment likes (ghost variant)

### Cursor Consistency
All interactive elements use `cursor-pointer` for clear affordance:
- Base `Button` component includes it in variants
- Custom buttons add it explicitly
- Disabled states use `cursor-not-allowed`

## Weekly Feed Grouping

### Overview
The home feed groups posts by week for better organization. Each week section shows:
- Post count and week label ("4 posts this week", "6 posts last week")
- Stacked contributor avatars linking to profiles

### Key Components

**`WeekHeader`** (`components/dashboard/week-header.tsx`)
```typescript
<WeekHeader
  label="This week"      // or "Last week", "Nov 25 - Dec 1"
  postCount={4}
  contributors={[...]}   // Array of User objects
/>
```

**`ContributorAvatars`** (`components/dashboard/contributor-avatars.tsx`)
```typescript
<ContributorAvatars
  contributors={users}
  maxVisible={5}         // Shows "+X" badge for overflow
  size="default"         // "sm" | "default" | "lg"
/>
```

**`groupAssetsByWeek`** (`lib/utils/week-grouping.ts`)
```typescript
import { groupAssetsByWeek, type WeekGroup } from "@/lib/utils/week-grouping";

const weekGroups: WeekGroup[] = groupAssetsByWeek(assets);
// Returns: [{ key, label, postCount, contributors, assets }, ...]
```

### Feed Layout Toggle
The feed supports two layouts:
- **Grid** (default) - Visual masonry grid with overlay metadata
- **Detailed** - List view with metadata below images

Toggle buttons appear on the right side of the feed tabs (desktop only).

**ElementCard Layout Prop:**
```typescript
<ElementCard 
  asset={asset} 
  layout="grid"      // "grid" | "detailed"
/>
```

---

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
2. Key migrations:
   - `007_add_comment_likes.sql` - Comment likes
   - `009_add_asset_views.sql` - View tracking
   - `011_notifications_rls_policies.sql` - Real-time notifications
   - `016_add_embed_support.sql` - Figma embeds (asset_type, embed_url)
   - `017_add_figma_integration.sql` - Figma token storage
   - `018_add_drops.sql` - Drops base tables
   - `021_add_drop_blocks.sql` - Block-based editor
   - `022_add_image_gallery_block.sql` - Gallery blocks
   - `023_add_auth_user_trigger.sql` - Auto-create users on signup
   - `024_add_assets_rls_policies.sql` - Asset security policies
   - `025_add_asset_visibility.sql` - Unlisted assets
   - `026_add_video_asset_type.sql` - WebM video support
   - `028_user_notification_settings.sql` - Notification preferences table
   - `029_increment_view_count_rpc.sql` - View count increment function
   - `030_record_asset_view_rpc.sql` - Atomic view recording function
   - `032_stream_members_rls_policies.sql` - RLS for stream_members table
   - `033_fix_streams_rls_for_members.sql` - Allow members to see private streams
3. Type definitions: `lib/types/database.ts`
4. Related API route: `app/api/[feature]/route.ts`
5. Related hook: `lib/hooks/use-[feature].ts`
6. Related component: `components/[feature]/`
7. Utilities: `lib/utils/` (ai, embed-providers, encryption, image-processing)
8. Drops documentation: `docs/DROPS_FEATURE.md`

## Resources

- Database Schema: `scripts/migrations/`
- Type Definitions: `lib/types/database.ts`
- API Routes: `app/api/`
- Hooks: `lib/hooks/`
- Components: `components/`
- Supabase Studio: http://localhost:8000
