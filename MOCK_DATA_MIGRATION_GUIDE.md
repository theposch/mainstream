# Mock Data to Supabase Migration Guide

**Status**: Auth System Migrated ✅ | Data Layer Migration In Progress ⏳  
**Date**: November 26, 2025  
**Branch**: `feature/supabase-auth-pages`

---

## 🎯 Overview

This guide documents the migration from mock data to real Supabase database queries.

### ✅ Completed: Authentication System
- [x] Supabase Auth integration (signup, login, logout)
- [x] Session management via cookies
- [x] Root middleware for session refresh
- [x] `lib/auth/get-user.ts` - Server-side current user
- [x] `lib/auth/use-user.ts` - Client-side user hook
- [x] UserMenu updated to use real auth
- [x] Upload API route requires real authentication
- [x] No navigation on auth pages (`/auth/signup`, `/auth/login`)

### ⏳ Remaining: Data Layer Migration
- [ ] Replace mock data imports with database queries
- [ ] Update 20 components still using mock data
- [ ] Migrate API routes to query database
- [ ] Replace localStorage with database
- [ ] Add data fetching hooks/utilities

---

## 📂 Files Using Mock Data (20 files)

These files need to be updated to fetch from Supabase database:

### Client Components (High Priority)
1. ✅ `components/layout/user-menu.tsx` - **DONE**
2. `components/layout/search-suggestions.tsx`
3. `components/search/search-results.tsx`
4. `components/assets/element-card.tsx`
5. `components/layout/create-stream-dialog.tsx`
6. `components/dashboard/feed.tsx`
7. `components/assets/asset-detail-desktop.tsx`
8. `components/assets/asset-detail-mobile.tsx`
9. `components/assets/comment-item.tsx`
10. `components/assets/comment-list.tsx`
11. `components/assets/comment-input.tsx`
12. `components/layout/notifications-popover.tsx`
13. `components/layout/workspace-switcher.tsx`

### Server Components (Medium Priority)
14. `app/u/[username]/page.tsx` - User profile page
15. `app/stream/[slug]/page.tsx` - Stream detail page
16. `app/t/[slug]/page.tsx` - Team page
17. `components/streams/stream-header.tsx`
18. `components/users/user-profile-header.tsx`

### Utilities (Low Priority)
19. `lib/utils/search.ts`
20. `components/assets/use-asset-detail.ts`

---

## 🔄 Migration Pattern

### Before (Mock Data):
```typescript
"use client"
import { currentUser } from "@/lib/mock-data/users"
import { assets } from "@/lib/mock-data/assets"

export function MyComponent() {
  const user = currentUser  // Static mock data
  const allAssets = assets  // Static array
  
  return <div>{user.displayName}</div>
}
```

### After (Real Data - Client Component):
```typescript
"use client"
import { useUser } from "@/lib/auth/use-user"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function MyComponent() {
  const { user, loading } = useUser()
  const [assets, setAssets] = useState([])
  
  useEffect(() => {
    const fetchAssets = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })
      setAssets(data || [])
    }
    fetchAssets()
  }, [])
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please log in</div>
  
  return <div>{user.displayName}</div>
}
```

### After (Real Data - Server Component):
```typescript
import { getCurrentUser } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function MyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  
  const supabase = await createClient()
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })
  
  return <div>{user.displayName}</div>
}
```

---

## 🗄️ Database Query Examples

### Get Current User
```typescript
// Server-side
import { getCurrentUser } from "@/lib/auth/get-user"
const user = await getCurrentUser()

// Client-side
import { useUser } from "@/lib/auth/use-user"
const { user, loading, error } = useUser()
```

### Get All Assets
```typescript
const supabase = createClient() // or await createClient() on server
const { data: assets, error } = await supabase
  .from('assets')
  .select(`
    *,
    uploader:users!uploader_id (
      id,
      username,
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
```

### Get User's Assets
```typescript
const { data: assets } = await supabase
  .from('assets')
  .select('*')
  .eq('uploader_id', userId)
  .order('created_at', { ascending: false })
```

### Get Stream with Assets
```typescript
const { data: stream } = await supabase
  .from('streams')
  .select(`
    *,
    owner:users!owner_id (
      username,
      display_name,
      avatar_url
    ),
    stream_members (
      user_id,
      role,
      user:users (
        username,
        display_name,
        avatar_url
      )
    )
  `)
  .eq('id', streamId)
  .single()

// Get stream's assets
const { data: assets } = await supabase
  .from('stream_assets')
  .select(`
    asset:assets (
      *,
      uploader:users!uploader_id (
        username,
        display_name,
        avatar_url
      )
    )
  `)
  .eq('stream_id', streamId)
```

### Get Comments for Asset
```typescript
const { data: comments } = await supabase
  .from('asset_comments')
  .select(`
    *,
    author:users!author_id (
      username,
      display_name,
      avatar_url
    )
  `)
  .eq('asset_id', assetId)
  .order('created_at', { ascending: true })
```

### Get User's Notifications
```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select(`
    *,
    actor:users!actor_id (
      username,
      display_name,
      avatar_url
    )
  `)
  .eq('user_id', userId)
  .eq('read', false)
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## 🔧 Recommended Migration Order

### Phase 1: Core Components (Week 1)
1. **Feed** (`components/dashboard/feed.tsx`)
   - Fetch assets from database
   - Add pagination/infinite scroll
   - Remove mock data dependency

2. **Asset Cards** (`components/assets/element-card.tsx`)
   - Update to expect real data structure
   - Handle missing fields gracefully

3. **User Profile** (`app/u/[username]/page.tsx`)
   - Fetch user by username from database
   - Get user's assets
   - Handle not found case

### Phase 2: Interactive Features (Week 2)
4. **Comments** (`components/assets/comment-*.tsx`)
   - Fetch comments from database
   - Post new comments
   - Real-time updates

5. **Asset Detail** (`components/assets/asset-detail-*.tsx`)
   - Fetch asset by ID
   - Show real user data
   - Like functionality

6. **Notifications** (`components/layout/notifications-popover.tsx`)
   - Fetch from database
   - Mark as read
   - Real-time subscriptions

### Phase 3: Streams & Teams (Week 3)
7. **Stream Pages** (`app/stream/[slug]/page.tsx`)
   - Fetch stream from database
   - Get stream assets
   - Membership checks

8. **Create Stream** (`components/layout/create-stream-dialog.tsx`)
   - Insert into database
   - Handle members

9. **Team Pages** (`app/t/[slug]/page.tsx`)
   - Fetch team data
   - Team members
   - Team assets

### Phase 4: Search & Polish (Week 4)
10. **Search** (`lib/utils/search.ts`, `components/search/search-results.tsx`)
    - Database full-text search
    - Filter by type, user, stream
    - Performance optimization

11. **Workspace Switcher** (`components/layout/workspace-switcher.tsx`)
    - Fetch user's teams
    - Real team data

---

## 🎨 Data Fetching Patterns

### 1. Create Custom Hooks
```typescript
// lib/hooks/use-assets.ts
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchAssets = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('assets')
        .select('*, uploader:users!uploader_id(*)')
        .order('created_at', { ascending: false })
      
      if (error) setError(error.message)
      else setAssets(data || [])
      setLoading(false)
    }
    fetchAssets()
  }, [])
  
  return { assets, loading, error }
}
```

### 2. Server Actions for Mutations
```typescript
// app/actions/assets.ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function likeAsset(assetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { error } = await supabase
    .from('asset_likes')
    .insert({ asset_id: assetId, user_id: user.id })
  
  if (error) throw error
  revalidatePath('/home')
}
```

### 3. API Routes for Complex Operations
```typescript
// app/api/assets/[id]/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users!uploader_id(*),
      comments:asset_comments(*, author:users!author_id(*)),
      likes:asset_likes(count)
    `)
    .eq('id', params.id)
    .single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ asset })
}
```

---

## 🚀 Quick Start: Migrate One Component

Let's migrate `components/dashboard/feed.tsx` as an example:

### Step 1: Create data fetching hook
```typescript
// lib/hooks/use-feed.ts
"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"

type Asset = Database['public']['Tables']['assets']['Row'] & {
  uploader: Database['public']['Tables']['users']['Row']
}

export function useFeed(tab: 'recent' | 'following') {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchAssets = async () => {
      const supabase = createClient()
      
      let query = supabase
        .from('assets')
        .select('*, uploader:users!uploader_id(*)')
        .order('created_at', { ascending: false })
      
      // TODO: Implement following filter
      // if (tab === 'following') {
      //   query = query.in('uploader_id', followingUserIds)
      // }
      
      const { data } = await query
      setAssets(data || [])
      setLoading(false)
    }
    fetchAssets()
  }, [tab])
  
  return { assets, loading }
}
```

### Step 2: Update component
```typescript
// components/dashboard/feed.tsx
"use client"
import { useFeed } from "@/lib/hooks/use-feed"
import { MasonryGrid } from "@/components/assets/masonry-grid"

export function DashboardFeed() {
  const [activeTab, setActiveTab] = useState<"recent" | "following">("recent")
  const { assets, loading } = useFeed(activeTab)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div className="w-full min-h-screen">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <MasonryGrid assets={assets} />
    </div>
  )
}
```

### Step 3: Test
1. Navigate to `/home`
2. Verify assets load from database
3. Check console for errors
4. Test tab switching

---

## ✅ Checklist for Each Component

When migrating a component:

- [ ] Identify all mock data imports
- [ ] Replace with database queries or hooks
- [ ] Add loading states
- [ ] Add error handling
- [ ] Handle empty states
- [ ] Update TypeScript types
- [ ] Remove mock data imports
- [ ] Test functionality
- [ ] Check console for errors
- [ ] Verify data updates properly

---

## 🐛 Common Issues & Solutions

### Issue: User profile doesn't exist yet
**Problem**: User just signed up, profile trigger hasn't run yet  
**Solution**: Fall back to auth user data
```typescript
const user = userProfile || {
  id: authUser.id,
  username: authUser.email?.split('@')[0],
  displayName: authUser.email?.split('@')[0],
  email: authUser.email,
  avatarUrl: `https://avatar.vercel.sh/${authUser.email}.png`
}
```

### Issue: Session not available in client component
**Problem**: Can't use `createClient` from `server.ts` in client components  
**Solution**: Use `createClient` from `client.ts` instead
```typescript
// Client component
import { createClient } from "@/lib/supabase/client"  // ✓ Correct

// Server component
import { createClient } from "@/lib/supabase/server"  // ✓ Correct
```

### Issue: Infinite re-renders in useEffect
**Problem**: Missing dependencies or state updates in useEffect  
**Solution**: Add proper dependencies and use functional state updates
```typescript
useEffect(() => {
  // Fetch data
}, [stableValue])  // Only re-run when stableValue changes
```

### Issue: RLS blocking queries
**Problem**: Row Level Security policy preventing reads  
**Solution**: Check RLS policies in Supabase Studio
```sql
-- Allow authenticated users to read all assets
CREATE POLICY "Users can read all assets"
ON assets FOR SELECT
TO authenticated
USING (true);
```

---

## 📚 Resources

- [Supabase Database Queries](https://supabase.com/docs/guides/database/tables)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

## 🎯 Success Criteria

Migration is complete when:

- ✅ No imports from `@/lib/mock-data/*`
- ✅ All components fetch from Supabase database
- ✅ Real-time data updates work
- ✅ Search uses database queries
- ✅ Authentication gates work properly
- ✅ Performance is acceptable
- ✅ Error handling is robust
- ✅ Tests pass

---

**Last Updated**: November 26, 2025  
**Progress**: 1/20 components migrated (5%)  
**Next**: Migrate feed component and asset cards

