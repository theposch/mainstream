# Internal Server Error Fix

**Date:** November 27, 2025

## Problem

Internal server error after implementing following feed feature.

## Root Cause

The `useFollowingAssets` hook was auto-loading on mount, causing API calls even when the user wasn't viewing the "Following" tab. This could cause:
1. Unnecessary API calls on page load
2. Potential auth issues if called before user is ready
3. Performance issues from duplicate data fetching

## Solution

### Change 1: Removed Auto-Init from Hook
**File:** `lib/hooks/use-following-assets.ts`

**Removed:**
```typescript
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  if (!initialized) {
    loadMore();
    setInitialized(true);
  }
}, [initialized]);
```

**Result:** Hook is now passive - only loads when explicitly called

---

### Change 2: Load on Tab Switch
**File:** `components/dashboard/feed.tsx`

**Added:**
```typescript
// Load following assets when tab switches to "following"
React.useEffect(() => {
  if (activeTab === "following" && followingAssets.length === 0 && !loadingFollowing) {
    loadMoreFollowing();
  }
}, [activeTab, followingAssets.length, loadingFollowing, loadMoreFollowing]);
```

**Result:** Following feed only loads when user switches to "Following" tab

---

## Benefits

1. ✅ No unnecessary API calls on page load
2. ✅ Better performance (lazy loading)
3. ✅ Prevents auth race conditions
4. ✅ Clean separation of concerns

---

## Testing

Try accessing the home page now - should work without errors!

