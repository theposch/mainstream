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
- `users` - User profiles
- `streams` - Organizational units
- `assets` - Uploaded designs
- `asset_streams` - Many-to-many asset-stream relationships
- `asset_likes` - Like tracking
- `asset_comments` - Comments with threading
- `comment_likes` - Comment likes
- `user_follows` - User following relationships
- `stream_follows` - Stream following relationships (NEW)
- `stream_bookmarks` - External links for streams (NEW)
- `notifications` - Activity feed

**Migration Files:**
- `scripts/migrations/001_initial_schema.sql`
- `scripts/migrations/002_seed_data.sql`
- `scripts/migrations/003_stream_follows.sql` (NEW)
- `scripts/migrations/004_stream_bookmarks.sql` (NEW)
- `scripts/migrations/007_add_comment_likes.sql`

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
- `POST /api/assets/upload` - Upload new asset
- `DELETE /api/assets/[id]` - Delete asset (owner only)
- `GET /api/assets/following` - Assets from followed users
- `POST /api/assets/[id]/like` - Like asset
- `DELETE /api/assets/[id]/like` - Unlike asset
- `GET /api/assets/[id]/comments` - Get comments
- `POST /api/assets/[id]/comments` - Add comment

#### Comments
- `PUT /api/comments/[id]` - Update comment
- `DELETE /api/comments/[id]` - Delete comment
- `POST /api/comments/[id]/like` - Like comment
- `DELETE /api/comments/[id]/like` - Unlike comment

#### Streams
- `GET /api/streams` - List streams
- `POST /api/streams` - Create stream (idempotent)
- `GET /api/streams/[id]` - Get stream details
- `PUT /api/streams/[id]` - Update stream
- `DELETE /api/streams/[id]` - Delete stream (owner only)
- `GET /api/streams/[id]/follow` - Get follow status, follower count, contributors, asset count
- `POST /api/streams/[id]/follow` - Follow stream
- `DELETE /api/streams/[id]/follow` - Unfollow stream
- `GET /api/streams/[id]/bookmarks` - List stream bookmarks
- `POST /api/streams/[id]/bookmarks` - Add bookmark (any authenticated user)
- `DELETE /api/streams/[id]/bookmarks/[bookmarkId]` - Delete bookmark (creator or owner)

#### Users
- `GET /api/users/[username]` - Get user profile
- `POST /api/users/[username]/follow` - Follow user
- `DELETE /api/users/[username]/follow` - Unfollow user
- `PUT /api/users/me` - Update current user

#### Other
- `GET /api/search` - Search with total counts
- `GET /api/notifications` - Get notifications
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
- Comment likes sync across tabs
- New comments appear in real-time
- Notification badges update live
- Stream follow counts update (optimistic)
- Bookmarks update across sessions

**Hooks:**
- `lib/hooks/use-asset-like.ts`
- `lib/hooks/use-comment-like.ts`
- `lib/hooks/use-asset-comments.ts`
- `lib/hooks/use-notifications.ts`
- `lib/hooks/use-stream-follow.ts` (NEW)
- `lib/hooks/use-stream-bookmarks.ts` (NEW)

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
streams (1) ----< (many) stream_bookmarks
assets (1) ----< (many) asset_likes
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
- `stream_follows.stream_id` (for follower counts)
- `stream_follows.user_id` (for user's followed streams)
- `stream_bookmarks.stream_id` (for bookmark lists)
- `stream_bookmarks.created_by` (for permission checks)

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
```

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

## Future Enhancements

### Optional Additions
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] Password reset flow
- [ ] Email notifications
- [ ] Advanced search filters
- [ ] Bulk asset operations
- [ ] Stream permissions (public/private members)
- [ ] Asset versioning
- [ ] Activity analytics
- [ ] Bookmark reordering (drag and drop)
- [ ] Bookmark metadata auto-fetch (page titles)

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
