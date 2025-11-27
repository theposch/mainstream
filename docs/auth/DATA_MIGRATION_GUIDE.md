# Data Migration Reference

Reference guide for patterns used in the migration from mock data to Supabase.

## Status: ✅ COMPLETE

All components have been successfully migrated from mock data to Supabase database queries.

## Migration Patterns

### Pattern 1: Server Component

**Use when:** Fetching data for initial page load

```typescript
// Before (mock data)
import { assets } from "@/lib/mock-data/assets";

export default function Page() {
  return <Feed assets={assets} />;
}
```

```typescript
// After (Supabase)
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  
  const { data: assets } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users(*)
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  
  return <Feed initialAssets={assets} />;
}
```

### Pattern 2: Client Component with Hook

**Use when:** Need client-side interactivity

```typescript
// Before (mock data)
import { currentUser } from "@/lib/mock-data/users";

export function Component() {
  return <div>{currentUser.displayName}</div>;
}
```

```typescript
// After (Supabase)
import { useUser } from "@/lib/auth/use-user";

export function Component() {
  const { user, loading } = useUser();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return <div>{user.display_name}</div>;
}
```

### Pattern 3: Custom Hook for Data Fetching

**Use when:** Need reusable data fetching logic

```typescript
// lib/hooks/use-assets-infinite.ts
export function useAssetsInfinite(initialAssets: Asset[]) {
  const [assets, setAssets] = useState(initialAssets);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    const url = new URL('/api/assets', window.location.origin);
    if (cursor) url.searchParams.set('cursor', cursor);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    setAssets(prev => [...prev, ...data.assets]);
    setCursor(data.cursor);
    setHasMore(data.hasMore);
    setLoading(false);
  }, [cursor, loading, hasMore]);

  return { assets, loadMore, hasMore, loading };
}
```

### Pattern 4: API Route

**Use when:** Need server-side logic or authentication

```typescript
// app/api/assets/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get('limit') || '20');
  const cursor = searchParams.get('cursor');
  
  let query = supabase
    .from('assets')
    .select('*, uploader:users(*)')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  
  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  const hasMore = data.length > limit;
  const assets = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? data[data.length - 2].created_at : null;
  
  return Response.json({ assets, cursor: nextCursor, hasMore });
}
```

### Pattern 5: Real-time Updates

**Use when:** Need live updates (likes, comments, etc.)

```typescript
// lib/hooks/use-asset-like.ts
export function useAssetLike(assetId: string, initialLiked: boolean, initialCount: number) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const { user } = useUser();
  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    if (!assetId) return;

    const channel = supabase
      .channel(`asset-likes-${assetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'asset_likes',
        filter: `asset_id=eq.${assetId}`
      }, () => {
        // Refresh count
        fetchLikeCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId]);

  const toggleLike = async () => {
    if (!user) return;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      await fetch(`/api/assets/${assetId}/like`, { method });
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  return { isLiked, likeCount, toggleLike };
}
```

### Pattern 6: Optimistic UI Updates

**Use when:** Want instant feedback for user actions

```typescript
// Optimistic like example
const handleLike = async () => {
  // Update UI immediately
  setLiked(true);
  setLikeCount(prev => prev + 1);
  
  try {
    // Then sync with server
    await fetch(`/api/assets/${id}/like`, { method: 'POST' });
  } catch (error) {
    // Revert on error
    setLiked(false);
    setLikeCount(prev => prev - 1);
    toast.error('Failed to like asset');
  }
};
```

### Pattern 7: JOIN Queries

**Use when:** Need related data from multiple tables

```typescript
// Bad: N+1 queries
const { data: assets } = await supabase.from('assets').select('*');
for (const asset of assets) {
  const { data: uploader } = await supabase
    .from('users')
    .select('*')
    .eq('id', asset.uploader_id)
    .single();
  asset.uploader = uploader;
}
```

```typescript
// Good: Single JOIN query
const { data: assets } = await supabase
  .from('assets')
  .select(`
    *,
    uploader:users(*)
  `);
// Uploader data is already included
```

### Pattern 8: Many-to-Many Relationships

**Use when:** Working with junction tables (e.g., asset_streams)

```typescript
// Get all streams for an asset
const { data } = await supabase
  .from('streams')
  .select(`
    *,
    asset_streams!inner(asset_id)
  `)
  .eq('asset_streams.asset_id', assetId);

// Get all assets in a stream
const { data } = await supabase
  .from('assets')
  .select(`
    *,
    uploader:users(*),
    asset_streams!inner(stream_id)
  `)
  .eq('asset_streams.stream_id', streamId);
```

## Naming Conventions

### Database (snake_case)
- `display_name`
- `avatar_url`
- `created_at`
- `is_private`

### TypeScript/React (camelCase)
- `displayName`
- `avatarUrl`
- `createdAt`
- `isPrivate`

### Conversion

TypeScript types in `lib/types/database.ts` use snake_case to match database:

```typescript
interface User {
  id: string;
  username: string;
  display_name: string;  // snake_case
  avatar_url?: string;   // snake_case
  created_at: string;    // snake_case
}
```

## Common Gotchas

### 1. Async Server Client

```typescript
// Wrong
const supabase = createClient();  // Returns Promise!

// Correct
const supabase = await createClient();
```

### 2. RLS Policies

If queries return empty even though data exists:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- For dev, can disable (re-enable for prod!)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

### 3. Real-time Channel Cleanup

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();
  
  // Must cleanup!
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 4. Foreign Key Relationships

Use `!inner` for required joins:

```typescript
// Returns only assets that have streams
.select('*, asset_streams!inner(*)')

// Returns all assets (streams may be null)
.select('*, asset_streams(*)')
```

## Files Migrated

All components successfully migrated:
- ✅ Home feed (`app/home/page.tsx`)
- ✅ Asset detail pages (`app/e/[id]/page.tsx`)
- ✅ Stream pages (`app/stream/[slug]/page.tsx`)
- ✅ User profiles (`app/u/[username]/page.tsx`)
- ✅ Search results (`components/search/`)
- ✅ Notifications (`components/layout/notifications-popover.tsx`)
- ✅ Comments system (`components/assets/comment-*.tsx`)
- ✅ Like system (`components/assets/element-card.tsx`)
- ✅ Following feed (`components/dashboard/feed.tsx`)
- ✅ Settings dialog (`components/layout/settings-dialog.tsx`)

## Deleted Files

Mock data and storage layers removed:
- ~~`lib/mock-data/`~~ (all files deleted)
- ~~`lib/utils/assets-storage.ts`~~
- ~~`lib/utils/stream-storage.ts`~~
- ~~`lib/utils/search.ts`~~
- ~~`components/layout/workspace-switcher.tsx`~~ (dead code)

## Resources

- Database Schema: `scripts/migrations/001_initial_schema.sql`
- Type Definitions: `lib/types/database.ts`
- API Routes: `app/api/`
- Custom Hooks: `lib/hooks/`
- Supabase Docs: https://supabase.com/docs

---

**Status:** ✅ Migration Complete | All Patterns Documented
