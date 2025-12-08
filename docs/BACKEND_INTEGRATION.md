# Backend Integration Status

Current status of Mainstream backend integration with Supabase.

## Overview

✅ **Complete** - All backend integration is finished and functional.

**Tech Stack:**
- PostgreSQL via Supabase (self-hosted Docker)
- Supabase Auth (email/password)
- Supabase Storage (S3-compatible)
- Supabase Realtime (WebSocket subscriptions)

## Completed Features

### ✅ Authentication
- Email/password signup and login
- Session management with middleware
- Protected API routes
- Client and server auth utilities
- Auto-confirmation for local dev

**Files:**
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client + admin client
- `lib/auth/get-user.ts` - Server-side user fetching
- `lib/auth/use-user.ts` - Client-side user hook
- `middleware.ts` - Session refresh
- `app/auth/signup/page.tsx` - Signup page
- `app/auth/login/page.tsx` - Login page

### ✅ Database Schema
All tables created with Row Level Security:
- `users` - User profiles (+ `figma_access_token`, `figma_token_updated_at`)
- `streams` - Organizational units
- `assets` - Uploaded designs (+ `asset_type`, `embed_url`, `embed_provider`, `width`, `height`)
- `asset_streams` - Many-to-many asset-stream relationships
- `asset_likes` - Like tracking
- `asset_views` - View tracking (unique per user, 2s threshold)
- `asset_comments` - Comments with threading (no nested replies)
- `comment_likes` - Comment likes
- `user_follows` - User following relationships
- `stream_follows` - Stream following relationships
- `stream_bookmarks` - External links for streams
- `stream_members` - Private stream membership (role-based access)
- `notifications` - Activity feed (+ `content`, `comment_id` for deep linking)
- `user_notification_settings` - Notification preferences (toggles per type)

**Migration Files:**
- `scripts/migrations/001_initial_schema.sql`
- `scripts/migrations/002_seed_data.sql`
- `scripts/migrations/003_stream_follows.sql`
- `scripts/migrations/004_stream_bookmarks.sql`
- `scripts/migrations/007_add_comment_likes.sql`
- `scripts/migrations/009_add_asset_views.sql`
- `scripts/migrations/010_asset_views_rls.sql`
- `scripts/migrations/011_notifications_rls_policies.sql` - Real-time notifications
- `scripts/migrations/012_realtime_comments_likes.sql` - Real-time for comments
- `scripts/migrations/013_add_comment_notification_type.sql`
- `scripts/migrations/014_add_notification_content.sql`
- `scripts/migrations/015_add_comment_id_to_notifications.sql`
- `scripts/migrations/016_add_embed_support.sql` - Figma embeds
- `scripts/migrations/017_add_figma_integration.sql` - Figma token storage
- `scripts/migrations/028_user_notification_settings.sql` - Notification preferences
- `scripts/migrations/029_increment_view_count_rpc.sql` - View count RPC
- `scripts/migrations/030_record_asset_view_rpc.sql` - Atomic view recording RPC
- `scripts/migrations/032_stream_members_rls_policies.sql` - Stream members RLS
- `scripts/migrations/033_fix_streams_rls_for_members.sql` - Streams RLS for members

### ✅ Storage
Configured buckets:
- `assets` - Uploaded images (public, 50MB limit)
- `avatars` - User avatars (public, 5MB limit)

Storage policies allow:
- Public read access
- Authenticated user uploads
- Owner deletion

### ✅ API Routes

#### Assets
- `GET /api/assets` - List assets with pagination
- `POST /api/assets/upload` - Upload new asset (images + animated GIFs)
- `POST /api/assets/embed` - Create embed asset from URL (Figma)
- `GET /api/assets/[id]` - Get single asset with enriched data
- `PATCH /api/assets/[id]` - Update asset metadata
- `DELETE /api/assets/[id]` - Delete asset (owner only)
- `GET /api/assets/following` - Assets from followed users
- `POST /api/assets/[id]/like` - Like asset (creates notification)
- `DELETE /api/assets/[id]/like` - Unlike asset
- `POST /api/assets/[id]/view` - Record view (after 2s threshold, excludes owner)
- `GET /api/assets/[id]/viewers` - Get viewer list for tooltip
- `GET /api/assets/[id]/comments` - Get comments (batch fetched)
- `POST /api/assets/[id]/comments` - Add comment (creates notification)

#### Comments
- `PUT /api/comments/[id]` - Update comment
- `DELETE /api/comments/[id]` - Delete comment
- `POST /api/comments/[id]/like` - Like comment (creates notification)
- `DELETE /api/comments/[id]/like` - Unlike comment

#### Streams
- `GET /api/streams` - List streams (respects membership for private)
- `POST /api/streams` - Create stream (idempotent)
- `GET /api/streams/[id]` - Get stream details
- `PUT /api/streams/[id]` - Update stream (name, description, privacy)
- `DELETE /api/streams/[id]` - Delete stream (owner only)
- `GET /api/streams/[id]/follow` - Get follow status, follower count, contributors, asset count
- `POST /api/streams/[id]/follow` - Follow stream
- `DELETE /api/streams/[id]/follow` - Unfollow stream
- `GET /api/streams/[id]/bookmarks` - List stream bookmarks
- `POST /api/streams/[id]/bookmarks` - Add bookmark (members/owner)
- `DELETE /api/streams/[id]/bookmarks/[bookmarkId]` - Delete bookmark (creator or owner)
- `GET /api/streams/[id]/members` - List members (private streams)
- `POST /api/streams/[id]/members` - Add member (owner/admin only)
- `DELETE /api/streams/[id]/members?user_id=xxx` - Remove member
- `GET /api/streams/[id]/assets` - List assets (with access control)
- `POST /api/streams/[id]/assets` - Add asset (with access control)
- `DELETE /api/streams/[id]/assets?asset_id=xxx` - Remove asset

#### Users
- `GET /api/users` - List users with pagination (People page)
- `GET /api/users/[username]` - Get user profile
- `POST /api/users/[username]/follow` - Follow user (respects notification settings)
- `DELETE /api/users/[username]/follow` - Unfollow user
- `PUT /api/users/me` - Update current user profile
- `POST /api/users/me/avatar` - Upload avatar
- `DELETE /api/users/me/avatar` - Remove avatar (reset to default)
- `POST /api/users/me/email` - Change email
- `POST /api/users/me/password` - Change password
- `DELETE /api/users/me/delete` - Delete account
- `GET /api/users/me/integrations` - Get integration status (Figma)
- `POST /api/users/me/integrations` - Connect/disconnect integrations
- `GET /api/users/me/notification-settings` - Get notification preferences
- `PUT /api/users/me/notification-settings` - Update notification preferences

#### Other
- `GET /api/search` - Search with total counts
- `GET /api/notifications` - Get notifications (enriched with asset data)
- `PUT /api/notifications` - Mark as read

### ✅ Performance Optimizations
- **N+1 query fixes** - Batch fetch streams, likes, user data with assets
- **Server-side like pre-fetching** - `isLikedByCurrentUser` and `likeCount` from server
- **Server-side stream data prefetch** - Follow status, bookmarks, contributors loaded server-side
- **Parallel queries** - `Promise.all()` for concurrent database requests
- **React.memo** - Key components memoized
- **Cursor-based pagination** - Efficient infinite scroll
- **Optimistic UI updates** - Instant feedback for likes, follows, and bookmarks
- **JOIN queries** - Avoid N+1 problems
- **Database indexes** - On foreign keys and common lookups

### ✅ Real-time Features
Implemented with Supabase Realtime:
- Asset likes update instantly
- Comment likes sync across tabs (race-condition fixed)
- New comments appear in real-time
- Notification badges update live
- Stream follow counts update (optimistic)
- Bookmarks update across sessions
- Typing indicators via Presence API
- Comment deep linking with highlight

**Hooks:**
- `lib/hooks/use-asset-like.ts`
- `lib/hooks/use-asset-view.ts` - Atomic view recording with real-time count callback
- `lib/hooks/use-comment-like.ts` - With race-condition prevention
- `lib/hooks/use-asset-comments.ts`
- `lib/hooks/use-notifications.ts` - Enriches with asset data
- `lib/hooks/use-stream-follow.ts`
- `lib/hooks/use-stream-bookmarks.ts`
- `lib/hooks/use-stream-members.ts` - Private stream member management
- `lib/hooks/use-typing-indicator.ts` - Supabase Presence for typing
- `lib/hooks/use-figma-integration.ts` - Figma token management

**Real-time Requirements:**
```sql
-- Required for real-time filtering on notifications, comments, likes
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE asset_comments REPLICA IDENTITY FULL;
ALTER TABLE comment_likes REPLICA IDENTITY FULL;
```

## Architecture Decisions

### Why Supabase?
- PostgreSQL (proven, scalable)
- Built-in auth (no custom implementation)
- Built-in storage (S3-compatible)
- Real-time subscriptions (WebSocket)
- Self-hosted option (Docker)
- Compatible with cloud version

### Why Self-Hosted?
- Full control over data
- Free for development
- Easy to deploy to company servers
- Same APIs as Supabase Cloud

### Data Layer Patterns

#### Server Components (Default)
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('assets').select('*');
  return <div>{/* Render data */}</div>;
}
```

#### Client Components (When Needed)
```typescript
'use client';
import { useEffect, useState } from 'react';
import { createClient } from "@/lib/supabase/client";

export function Component() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const supabase = createClient();
    supabase.from('assets').select('*').then(({ data }) => setData(data));
  }, []);
  
  return <div>{/* Render data */}</div>;
}
```

#### API Routes
```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('assets').select('*');
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ data });
}
```

## Database Design

### Relationships

```
users (1) ----< (many) streams
users (1) ----< (many) assets
streams (many) >----< (many) assets  [via asset_streams]
users (many) >----< (many) users     [via user_follows]
users (many) >----< (many) streams   [via stream_follows]
users (many) >----< (many) streams   [via stream_members]
streams (1) ----< (many) stream_bookmarks
assets (1) ----< (many) asset_likes
assets (1) ----< (many) asset_views  [unique per user, increments view_count]
assets (1) ----< (many) asset_comments
comments (1) ----< (many) comment_likes
```

### Indexing Strategy

Indexes on:
- All foreign keys (automatic with FK constraints)
- `users.username` (for profile lookups)
- `streams.name` (for slug lookups)
- `assets.created_at` (for chronological feeds)
- `asset_streams.stream_id` (for stream pages)
- `asset_views.asset_id, viewed_at` (for viewer list queries)
- `asset_views.user_id` (for user view history)
- `stream_follows.stream_id` (for follower counts)
- `stream_follows.user_id` (for user's followed streams)
- `stream_bookmarks.stream_id` (for bookmark lists)
- `stream_bookmarks.created_by` (for permission checks)
- `stream_members.stream_id` (for membership checks)
- `stream_members.user_id` (for user's accessible streams)

### RLS Policies

**Public Read:**
- Assets, streams, user profiles, stream bookmarks

**Authenticated Write:**
- Create assets, streams, comments, bookmarks
- Like assets and comments
- Follow users and streams

**Owner Only:**
- Update/delete own assets
- Update/delete own streams
- Update/delete own comments
- Update own profile
- Delete stream bookmarks (creator or stream owner)
- Add/remove stream members (owner or admin)
- Update member roles (owner only)

**Stream Members Access:**
- Private streams visible to owner and members
- Stream assets/bookmarks accessible to members
- Uses SECURITY DEFINER functions to prevent RLS recursion

## Testing

### Local Development
```bash
# Start Supabase
cd supabase-docker && docker-compose up -d

# Start Next.js
npm run dev

# Access
# - App: http://localhost:3000
# - Studio: http://localhost:8000
```

### Database Queries
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres

# Example queries
SELECT COUNT(*) FROM assets;
SELECT COUNT(*) FROM users;
SELECT * FROM asset_streams;
```

### API Testing
```bash
# Test auth
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test assets
curl http://localhost:3000/api/assets?limit=10

# Test search
curl http://localhost:3000/api/search?q=design&type=assets
```

## Security

### Environment Variables
Never commit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=safe_in_browser
SUPABASE_SERVICE_ROLE_KEY=NEVER_expose_to_browser

# Optional: For encrypting API tokens (Figma, etc.)
ENCRYPTION_KEY=your_64_char_hex_key  # openssl rand -hex 32
```

### Token Encryption
API tokens (e.g., Figma Personal Access Token) are encrypted at rest:

```typescript
// lib/utils/encryption.ts
import { encrypt, decrypt, isEncrypted } from '@/lib/utils/encryption';

// Encrypt before saving to DB
const encryptedToken = encrypt(rawToken);

// Decrypt when using
const rawToken = decrypt(encryptedToken);

// Auto-detection - handles both encrypted and plaintext
const token = decrypt(storedValue); // Works either way
```

**Algorithm:** AES-256-GCM (authenticated encryption)
**Graceful fallback:** Works without key (plaintext mode for dev)

### RLS Best Practices
- Always enable RLS on public tables
- Use `auth.uid()` in policies
- Test policies in Supabase Studio
- Use admin client to bypass RLS when needed

### API Route Protection
```typescript
const user = await getCurrentUser();
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Monitoring

### Logs
```bash
# Supabase logs
cd supabase-docker
docker-compose logs -f

# Specific service
docker-compose logs -f db
docker-compose logs -f auth
docker-compose logs -f storage
```

### Database Performance
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Figma Integration
Users can connect their Figma account for frame-specific thumbnails:

**Setup:**
1. User goes to Settings → Connected Accounts
2. Enters Figma Personal Access Token (from Figma → Settings → Personal access tokens)
3. Token validated against Figma `/v1/me` endpoint
4. Encrypted and stored in `users.figma_access_token`

**Thumbnail Flow:**
1. User pastes Figma URL with `node-id` parameter
2. System checks for user's Figma token
3. **With token:** Calls Figma REST API to render specific frame
4. **Without token:** Falls back to oEmbed API (file-level thumbnail)
5. Thumbnail downloaded and stored locally (never expires)

**Files:**
- `lib/utils/embed-providers.ts` - `fetchFigmaFrameThumbnail()`
- `app/api/users/me/integrations/route.ts` - Token CRUD
- `components/layout/settings-dialog.tsx` - UI for token management

## Future Enhancements

### Optional Additions
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] Password reset flow
- [ ] Email notifications
- [ ] Advanced search filters
- [ ] Bulk asset operations
- [ ] Asset versioning
- [ ] Activity analytics
- [ ] Bookmark reordering (drag and drop)
- [ ] Bookmark metadata auto-fetch (page titles)
- [ ] YouTube/Vimeo embeds (provider detection ready)
- [ ] Video uploads (WebM conversion)

### Scalability Considerations
- Add read replicas for high traffic
- Implement caching layer (Redis)
- CDN for static assets
- Database connection pooling
- Rate limiting on API routes

## Troubleshooting

### Connection Issues
```bash
# Check Docker
docker ps

# Restart services
cd supabase-docker
docker-compose restart

# View logs
docker-compose logs -f db
```

### Auth Issues
```bash
# Verify auto-confirm is enabled
docker-compose exec auth env | grep AUTOCONFIRM

# Should show: GOTRUE_MAILER_AUTOCONFIRM=true
```

### Database Issues
```sql
-- Check if tables exist
\dt

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'assets';

-- Disable RLS for debugging (dev only!)
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
```

## Resources

- Supabase Studio: http://localhost:8000
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Next.js Docs: https://nextjs.org/docs

## Documentation

- `docs/SUPABASE_SETUP.md` - Setup guide
- `docs/STREAMS_FEATURE.md` - Streams deep dive
- `docs/auth/` - Auth-specific docs
- `scripts/migrations/` - Database migrations
