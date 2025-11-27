# 🔍 Deep Dive: What's NOT Connected to Database Yet

**Analysis Date:** November 26, 2025  
**Status:** After Critical Fixes Complete

---

## 📊 SUMMARY

| Category | Total | Connected ✅ | Not Connected ❌ | % Complete |
|----------|-------|-------------|-----------------|------------|
| **Pages** | 8 | 4 | 4 | 50% |
| **Core Components** | 15 | 6 | 9 | 40% |
| **Storage Utils** | 2 | 0 | 2 | 0% |
| **APIs** | 13 | 13 | 0 | 100% |
| **Hooks** | 6 | 6 | 0 | 100% |

**Overall Progress: ~55% Complete**

---

## 🔴 PAGES STILL USING MOCK DATA (4 pages)

### 1. **Library/Discover Page** - `/app/library/page.tsx` 
**Status:** 0% Database Integration

**Current State:**
```typescript
import { streams } from "@/lib/mock-data/streams";
import { readAssets } from "@/lib/utils/assets-storage";

const featuredStreams = streams.slice(0, 4);
const assets = readAssets(); // JSON file storage
```

**What Needs Fixing:**
- Replace `streams` import with Supabase query for featured/trending streams
- Replace `readAssets()` with Supabase query
- Add category filtering from database
- Implement trending algorithm (likes, views, recency)

**Impact:** HIGH - Discovery page is a key feature
**Complexity:** Medium

---

### 2. **Teams Directory Page** - `/app/teams/page.tsx`
**Status:** 0% Database Integration

**Current State:**
```typescript
import { teams } from "@/lib/mock-data/teams";
import { streams } from "@/lib/mock-data/streams";
import { assets } from "@/lib/mock-data/assets";

const teamsData = teams.map(team => {
  const teamStreams = streams.filter(s => s.ownerType === 'team');
  const teamAssets = assets.filter(a => team.memberIds.includes(a.uploaderId));
  // ... aggregation
});
```

**What Needs Fixing:**
- Fetch teams from `teams` table
- Join with member counts, stream counts, asset counts
- Get recent posts via asset_streams
- Add pagination

**Impact:** HIGH - Teams are important for collaboration
**Complexity:** Medium-High (needs aggregation queries)

---

### 3. **Team Detail Page** - `/app/t/[slug]/page.tsx`
**Status:** 0% Database Integration (CLIENT-SIDE!)

**Current State:**
```typescript
"use client"; // ❌ Should be server component!

import { teams } from "@/lib/mock-data/teams";
import { streams } from "@/lib/mock-data/streams";
import { assets } from "@/lib/mock-data/assets";

const team = teams.find(t => t.slug === slug);
```

**What Needs Fixing:**
- Convert to async server component
- Query team by slug from database
- Fetch team members, streams, assets
- Check user permissions (team member, admin, etc.)
- Handle team settings/management

**Impact:** HIGH - Individual team pages are essential
**Complexity:** HIGH (needs permission system)

---

### 4. **Search Results** - `/app/search/page.tsx`
**Status:** Partially Connected (API exists but not used properly)

**Current State:**
- Page itself is OK (just renders component)
- But `SearchResults` component uses mock data (see components section)

**What Needs Fixing:**
- SearchResults component migration (covered below)

**Impact:** CRITICAL - Search is a core feature
**Complexity:** Low (API already exists)

---

## 🟡 COMPONENTS STILL USING MOCK DATA (9 components)

### 1. **SearchResults Component** - `components/search/search-results.tsx`
**Status:** 0% Database Integration

**Current State:**
```typescript
import { assets } from "@/lib/mock-data/assets";
import { streams } from "@/lib/mock-data/streams";
import { users } from "@/lib/mock-data/users";
import { teams } from "@/lib/mock-data/teams";

const results = searchAll(query, { assets, streams, users, teams });
```

**What Needs Fixing:**
- Remove mock imports
- Use `/api/search?q=...` (already implemented!)
- Add real-time as you type search
- Handle color search properly

**Impact:** CRITICAL - Search broken
**Complexity:** LOW (API ready, just hook it up)

---

### 2. **UploadDialog** - `components/layout/upload-dialog.tsx`
**Status:** 50% Database Integration

**Current State:**
```typescript
import { streams as allStreams } from "@/lib/mock-data/streams";

// Uses mock streams for hashtag suggestions
useStreamMentions(description, allStreams, streamIds, setStreamIds);
```

**What Needs Fixing:**
- Fetch active streams from API or database
- Update stream mentions to use real data
- Upload itself works, just stream selection uses mock data

**Impact:** MEDIUM - Upload works but stream selection limited
**Complexity:** LOW

---

### 3. **StreamPicker** - `components/streams/stream-picker.tsx`
**Status:** 0% Database Integration

**Current State:**
```typescript
import { getStreams, onStreamsUpdated } from "@/lib/utils/stream-storage";

const streams = getStreams(); // localStorage + mock data!
```

**What Needs Fixing:**
- Replace `getStreams()` with Supabase query
- Fetch user's accessible streams
- Handle team vs personal streams
- Remove localStorage dependency

**Impact:** HIGH - Used in uploads and organization
**Complexity:** MEDIUM

---

### 4. **Comment Components** (3 files)
- `components/assets/comment-item.tsx`
- `components/assets/comment-list.tsx`

**Status:** 25% Database Integration

**Current State:**
```typescript
import { Comment } from "@/lib/mock-data/comments";
import { User } from "@/lib/mock-data/users";
import { users } from "@/lib/mock-data/users"; // For looking up authors

const getUser = (userId: string) => users.find(u => u.id === userId);
```

**What Needs Fixing:**
- Remove mock type imports (use database types)
- Comments already come with user data from `useAssetComments`
- Just need to update types and remove user lookup

**Impact:** MEDIUM - Comments work but using wrong types
**Complexity:** LOW (types only)

---

### 5. **WorkspaceSwitcher** - `components/layout/workspace-switcher.tsx`
**Status:** 0% Database Integration

**Current State:**
```typescript
import { currentUser, users } from "@/lib/mock-data/users";
import { teams } from "@/lib/mock-data/teams";

const userTeams = teams.filter(team => 
  team.memberIds.includes(currentUser.id)
);
```

**What Needs Fixing:**
- Fetch current user from auth
- Query user's teams from database
- Implement workspace context
- Persist workspace selection

**Impact:** MEDIUM - Workspace switching not functional
**Complexity:** MEDIUM-HIGH (needs context)

---

### 6. **SearchSuggestions** - `components/layout/search-suggestions.tsx`
**Status:** Unknown (not examined in detail)

**Likely Issue:** Using mock data for suggestions

**What Needs Fixing:**
- Query recent searches
- Query popular searches
- Query trending content

**Impact:** LOW - Nice to have
**Complexity:** LOW

---

### 7. **CreateStreamDialog** - `components/layout/create-stream-dialog.tsx`
**Status:** Unknown (not examined in detail)

**Likely Issue:** Stream creation might use localStorage

**What Needs Fixing:**
- Verify it uses `/api/streams` POST
- Remove any localStorage writes

**Impact:** MEDIUM
**Complexity:** LOW

---

## 🔵 STORAGE UTILITIES STILL USING FILES (2 files)

### 1. **Assets Storage** - `lib/utils/assets-storage.ts`
**Status:** SHOULD BE DELETED

**Current State:**
```typescript
// Reads/writes to data/assets.json file
export function readAssets(): Asset[]
export function addAsset(asset: Asset): Promise<void>
export function deleteAsset(assetId: string): Promise<boolean>
```

**What To Do:**
- ⚠️ **This entire file should be deleted**
- All usage should go through API routes
- No direct file I/O from components

**Current Usage:**
- `app/library/page.tsx` - DELETE this usage
- Upload API route - Already replaced ✅

**Impact:** HIGH - Causes data inconsistency
**Action:** DELETE FILE after fixing library page

---

### 2. **Stream Storage** - `lib/utils/stream-storage.ts`
**Status:** SHOULD BE DELETED

**Current State:**
```typescript
// Reads/writes to localStorage
function getPersistedStreams(): Stream[]
function savePersistedStreams(streams: Stream[]): void
export function getStreams(): Stream[]
export function addStream(stream: Stream): Stream
```

**What To Do:**
- ⚠️ **This entire file should be deleted**
- All usage should go through `/api/streams`
- No localStorage for data persistence

**Current Usage:**
- `components/streams/stream-picker.tsx` - Replace with API
- `components/layout/create-stream-dialog.tsx` - Replace with API

**Impact:** HIGH - Causes data inconsistency
**Action:** DELETE FILE after fixing components

---

## ✅ WHAT'S ALREADY CONNECTED (For Reference)

### Pages ✅
1. `/app/home` - Dashboard feed from database
2. `/app/e/[id]` - Asset detail from database
3. `/app/u/[username]` - User profile from database (client-side, but works)
4. `/app/stream/[slug]` - Stream detail from database
5. `/app/streams` - Streams list from database

### Components ✅
1. `DashboardFeed` - Uses infinite scroll hook
2. `ElementCard` - Real-time likes
3. `AssetDetailDesktop` - Real-time comments/likes
4. `AssetDetailMobile` - Real-time comments/likes
5. `UserProfileHeader` - Follow button works
6. `NotificationsPopover` - Real-time notifications

### Hooks ✅
1. `use-assets-infinite` - Pagination
2. `use-asset-like` - Likes with real-time
3. `use-asset-comments` - Comments with real-time
4. `use-notifications` - Notifications with real-time
5. `use-user-follow` - Follow system
6. `use-asset-detail` - Wrapper (works)

### APIs ✅ (All 13 done)
- Asset CRUD, likes, comments
- User profiles, follow
- Streams CRUD, assets
- Notifications
- Search

---

## 🎯 RECOMMENDED PRIORITY ORDER

### PHASE A: Critical Search (Day 1)
**Goal:** Make search functional

1. ✅ Fix `SearchResults` component - Use `/api/search`
2. ✅ Test search functionality end-to-end

**Effort:** 1-2 hours  
**Impact:** CRITICAL - Search currently broken

---

### PHASE B: Stream Management (Day 2)
**Goal:** Get stream selection working properly

3. ✅ Update `StreamPicker` to query database
4. ✅ Update `UploadDialog` stream suggestions
5. ✅ Update `CreateStreamDialog` (if needed)
6. ⚠️ **DELETE** `lib/utils/stream-storage.ts`

**Effort:** 3-4 hours  
**Impact:** HIGH - Affects uploads and organization

---

### PHASE C: Discovery & Teams (Days 3-4)
**Goal:** Get directory pages working

7. ✅ Migrate `/app/library/page.tsx`
   - Query featured streams
   - Query trending assets
   - Implement basic trending logic
8. ✅ Migrate `/app/teams/page.tsx`
   - Query teams with stats
   - Paginate results
9. ⚠️ **DELETE** `lib/utils/assets-storage.ts`

**Effort:** 6-8 hours  
**Impact:** HIGH - Key discovery features

---

### PHASE D: Team Pages (Days 5-6)
**Goal:** Individual team pages functional

10. ✅ Convert `/app/t/[slug]/page.tsx` to server component
11. ✅ Implement team detail queries
12. ✅ Add permission system
13. ✅ Handle team management

**Effort:** 8-10 hours  
**Impact:** HIGH - Important for collaboration

---

### PHASE E: Polish (Week 2)
**Goal:** Clean up remaining components

14. ✅ Fix comment component types
15. ✅ Implement `WorkspaceSwitcher` with context
16. ✅ Update `SearchSuggestions`
17. ✅ Add missing features (save to stream, etc.)

**Effort:** 6-8 hours  
**Impact:** MEDIUM - UX improvements

---

## 🚨 CRITICAL ISSUES TO WATCH

### 1. **Data Inconsistency**
- `assets-storage.ts` writes to JSON
- Database has separate data
- **Users see different data depending on where it's read from**

**Solution:** Delete storage utilities ASAP

---

### 2. **Client vs Server Components**
- `app/t/[slug]/page.tsx` is client-side (bad for SEO, slow)
- Should be server component
- Need to refactor state management

**Solution:** Convert to server component with proper data fetching

---

### 3. **Type Mismatches**
- Mock data uses camelCase (`uploaderId`, `displayName`)
- Database uses snake_case (`uploader_id`, `display_name`)
- Components mixing both causes crashes

**Solution:** Create proper TypeScript types from database schema

---

## 📝 NOTES

### What's Working Well ✨
- API layer is solid (13/13 routes done)
- Real-time subscriptions work great
- Core hooks are excellent
- Main feed is fast and functional

### What Needs Attention ⚠️
- Too much mock data still in use
- Storage utilities cause confusion
- Some components using wrong types
- Discovery features not functional

### Quick Wins 🎯
1. Search Results - 1 hour fix, huge impact
2. Stream Picker - 2 hour fix, immediate improvement
3. Comment types - 30 min fix, removes warnings
4. Delete storage files - Instant cleanup

---

**Ready to start Phase A (Search)?** Let me know and I'll begin implementation.



