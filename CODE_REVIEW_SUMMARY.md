# Code Review Summary - Quick Reference

## 🚨 MUST FIX IMMEDIATELY

### 1. **Memory Leak in useNotifications** 🔴
- **File:** `lib/hooks/use-notifications.ts:128`
- **Problem:** Cleanup function inside `.then()` never runs
- **Impact:** Channels never unsubscribe, memory leaks
- **Fix:** Use async/await with proper return in useEffect

### 2. **Wrong API Endpoint in useUserFollow** 🔴  
- **File:** `lib/hooks/use-user-follow.ts:88`
- **Problem:** Using `userId` but API expects `username`
- **Impact:** Follow button doesn't work
- **Fix:** Change hook to accept username or update API route

### 3. **No Input Validation** 🔴
- **File:** `app/stream/[slug]/page.tsx:20`
- **Problem:** Slug from URL not validated
- **Impact:** Potential security issue
- **Fix:** Validate slug format with regex

## ⚠️ FIX SOON (Performance & Bugs)

### 4. **N+1 Query Problem** 🟠
- **File:** `app/streams/page.tsx`
- **Problem:** 1 + (N × 2) queries for N streams
- **Impact:** Slow page load
- **Fix:** Batch queries or use aggregation

### 5. **Client-Side Stream Fetching** 🟠
- **File:** `components/assets/element-card.tsx:68-81`  
- **Problem:** 50 queries for 50 cards
- **Impact:** Slow rendering, excessive requests
- **Fix:** Fetch server-side, pass as props

### 6. **Race Condition in Comments** 🟠
- **File:** `lib/hooks/use-asset-comments.ts`
- **Problem:** Single loading state for multiple ops
- **Impact:** User actions silently dropped
- **Fix:** Separate loading states per operation

### 7. **Missing Response Data** 🟠
- **File:** `lib/hooks/use-user-follow.ts:100-104`
- **Problem:** API returns `{success}` but hook expects `{isFollowing, followerCount}`
- **Impact:** UI shows wrong follower count
- **Fix:** Update API to return full data

### 8. **No Rate Limiting** 🟠
- **Files:** Like/Follow API routes
- **Problem:** Users can spam actions
- **Impact:** Abuse potential
- **Fix:** Add rate limiting middleware

## 📋 IMPROVEMENTS (Architecture)

### 9. **TypeScript `any` Everywhere** 🟡
- **Impact:** No type safety, hidden bugs
- **Fix:** Create proper type definitions

### 10. **Client-Side DB Queries** 🟡
- **Impact:** Security risk, harder to optimize
- **Fix:** Move to server components

### 11. **No Error Boundaries** 🟡
- **Impact:** Entire app crashes on error
- **Fix:** Add error.tsx in app directory

### 12. **Stale Closures** 🟡
- **File:** `useAssetLike.toggleLike`
- **Impact:** Wrong values on rapid clicks
- **Fix:** Use functional setState

## ✨ NICE TO HAVE

- Loading skeletons (#22)
- Offline support (#24)
- Unit tests (#25)
- Integration tests (#26)
- Consistent error handling (#11)
- Production logs cleanup (#14)
- Pagination everywhere (#13)

---

## 📈 Priority Order

```
Day 1 (Critical):
├── Fix useNotifications memory leak
├── Fix useUserFollow endpoint  
└── Add input validation

Week 1 (High):
├── Add rate limiting
├── Fix N+1 queries
├── Move queries to server
└── Fix race conditions

Week 2 (Medium):
├── Add TypeScript types
├── Add error boundaries
├── Fix optimistic updates
└── Improve error handling

Week 3+ (Low):
├── Add tests
├── Add monitoring
└── Polish UX
```

---

## 🎯 Quick Wins (< 1 hour each)

1. ✅ Add slug validation (5 min)
2. ✅ Fix useUserFollow response data (10 min)
3. ✅ Add error boundaries (15 min)
4. ✅ Fix useNotifications cleanup (20 min)
5. ✅ Add loading states (30 min)

---

## 🔍 Testing Checklist

Before deploying fixes:
- [ ] Open/close notifications 20x → No memory increase
- [ ] Click follow button → Follower count updates
- [ ] Rapid-click like 5x → Correct final count
- [ ] Navigate to `/stream/<script>` → 404, not XSS
- [ ] Load page with 100 streams → < 3 seconds
- [ ] Open 50 asset cards → < 50 network requests
- [ ] Comment while updating → Both succeed
- [ ] Disconnect network → Clear error message

---

See `CODE_REVIEW_ISSUES.md` for detailed explanations and code examples.



