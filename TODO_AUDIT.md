# TODO Audit - Comprehensive Analysis

**Date:** November 27, 2025  
**Total TODOs Found:** 26 comments across 12 files

---

## 📊 Summary by Category

| Category | Count | Status |
|----------|-------|--------|
| **Outdated (Already Done)** | 1 | ✅ Can delete |
| **Future Enhancements** | 15 | 🔵 Keep (intentional) |
| **Missing Features** | 3 | 🟡 Should implement |
| **Infrastructure** | 7 | 🟣 Future migration |

---

## ✅ OUTDATED TODOs (Already Done)

### 1. Search Backend Implementation
**File:** `app/search/page.tsx` (line 16-18)

```typescript
// TODO: When backend is implemented, fetch search results server-side:
// - Add: const results = await searchAPI(query, color);
// - Pass: initialResults={results} to SearchResults
```

**Status:** ❌ OUTDATED - Already done!

**Reality:**
- `/api/search` route exists and works ✅
- Search is functional ✅
- Client fetches from API ✅
- Color search works client-side (intentional)

**Action:** DELETE this TODO comment

---

## 🟡 MISSING FEATURES (Should Implement)

### 1. Settings Save Functionality
**File:** `components/layout/settings-dialog.tsx` (line 89-93)

```typescript
// TODO: Implement real API call to save settings
// - Endpoint: PUT /api/user/settings
// - Auth: Check session
// - Body: All settings data
// - Validate: Input sanitization, unique username check
```

**Status:** 🟡 NEEDED - Not implemented

**Current:** Shows "Settings saved successfully!" but doesn't actually save  
**Priority:** Medium (settings dialog works but changes aren't persisted)

**Required:**
- Create `/api/users/me/settings` route
- Update user profile in database
- Handle username uniqueness validation

---

### 2. Comment Likes
**Files:** 
- `components/assets/use-asset-detail.ts` (line 69)
- `components/assets/asset-detail-desktop.tsx` (line 103)

```typescript
// TODO: Implement comment likes API
console.log('Like comment:', commentId);
```

**Status:** 🟡 NEEDED - Not implemented

**Current:** Console log only, no actual like functionality  
**Priority:** Low (nice-to-have feature)

**Database:** No `comment_likes` table exists in schema  
**Required:**
- Add `comment_likes` table (similar to `asset_likes`)
- Create API route: `/api/comments/[id]/like`
- Implement like/unlike logic

---

### 3. Feed Filtering (Following Tab)
**File:** `components/dashboard/feed.tsx` (line 105-107)

```typescript
// TODO: Replace with real API calls based on tab
// Recent tab: all public assets
// Following tab: assets from users/teams user follows
```

**Status:** 🟡 NEEDED - Partially implemented

**Current:** 
- Recent tab: Works ✅
- Following tab: Just reverses the list (fake)

**Database:** `user_follows` table exists ✅  
**Priority:** Medium (following feature exists but feed doesn't use it)

**Required:**
- Query assets from followed users
- Filter based on `user_follows` table

---

## 🔵 FUTURE ENHANCEMENTS (Keep as Intentional TODOs)

### 1. Assets API Pagination
**File:** `app/api/assets/route.ts` (line 23-26, 33-35)

```typescript
// TODO: Add query parameters:
// - ?page=1&limit=50 - Pagination
// - ?streamId=xyz - Filter by stream
// - ?uploaderId=xyz - Filter by uploader
// TODO: Add total count, pagination meta, hasMore flag
```

**Status:** 🔵 FUTURE FEATURE

**Current:** Returns all assets (works for MVP)  
**Priority:** Low (implement when needed for scale)

---

### 2. Image Search
**File:** `components/layout/search-bar.tsx` (line 125-128)

```typescript
// TODO: Implement image search
// - Open file picker or camera (on mobile)
// - POST /api/search/image with file
// - Use AI vision API to find similar images
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (advanced feature, not needed for MVP)

---

### 3. Online Status
**File:** `components/layout/user-menu.tsx` (line 63-66)

```typescript
// TODO: Implement real online status
// - Use WebSocket or presence system
// - Update based on user activity
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (nice-to-have, not critical)

---

### 4. Billing/Subscription
**File:** `components/layout/user-menu.tsx` (line 91-94)

```typescript
// TODO: Navigate to billing/subscription page
// - Show current plan
// - Upgrade/downgrade options
// - Payment history
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (monetization feature for later)

---

### 5. Save from URL
**File:** `components/layout/create-dialog.tsx` (line 62)

```typescript
// TODO: Implement Save from URL functionality in future
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (nice-to-have)

---

### 6. More Menu in Asset Detail
**File:** `components/assets/asset-detail-mobile.tsx` (line 188)

```typescript
onMoreTap={() => { /* TODO: Show more menu */ }}
```

**Status:** 🔵 FUTURE FEATURE

**Current:** Button exists but does nothing  
**Priority:** Low (can add share, report, etc. later)

---

### 7. User Mentions in Comments
**File:** `components/assets/comment-input.tsx` (line 38-41)

```typescript
// Filter users for mentions - TODO: Replace with API call
const filteredUsers = React.useMemo(() => {
  return []; // For now, return empty array
}, []);
```

**Status:** 🔵 FUTURE FEATURE

**Current:** Mentions dropdown disabled  
**Priority:** Low (basic commenting works without mentions)

---

### 8. User Settings Navigation
**File:** `components/users/user-profile-header.tsx` (line 35-37)

```typescript
// TODO: Implement user settings navigation
// router.push('/settings') or router.push(`/u/${user.username}/settings`)
```

**Status:** 🔵 FUTURE FEATURE

**Current:** Settings button doesn't navigate  
**Priority:** Low (settings accessible from user menu)

---

### 9. Profile Activity Tab
**File:** `components/users/user-profile-tabs.tsx` (line 9-10)

```typescript
// TODO: Future tabs to implement:
// - "activity" tab - Recent comments, uploads, project updates
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (profile works with current tabs)

---

### 10. Save to Collection
**File:** `components/assets/element-card.tsx` (line 119-122)

```typescript
// TODO: Replace with real save to collection functionality
// - Open dialog to select collection/stream
// - POST /api/streams/:streamId/assets with { assetId }
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Low (can add assets to streams during upload)

---

### 11. Error Logging
**File:** `components/error-boundary.tsx` (line 27-28)

```typescript
// TODO: Log to error reporting service (Sentry, LogRocket, etc.)
console.error('Error caught by boundary:', error, errorInfo);
```

**Status:** 🔵 FUTURE FEATURE

**Priority:** Medium (good for production monitoring)

---

### 12. Search Context Enhancements
**File:** `lib/contexts/search-context.tsx` (line 161-164)

```typescript
// TODO: Future enhancements when backend is implemented:
// - Add results caching: results: SearchResults | null
// - Add error handling: error: Error | null
// - Add API call function: searchAPI
```

**Status:** 🔵 FUTURE FEATURE

**Note:** Backend IS implemented, but these optimizations aren't critical  
**Priority:** Low

---

## 🟣 INFRASTRUCTURE TODOs (Future Migration)

### Cloud Storage Migration (5 TODOs)
**File:** `lib/utils/file-storage.ts`

All related to migrating from local file storage to cloud (S3/R2/Cloudflare):

1. **Line 10-13:** General cloud storage migration note
2. **Line 68:** Remove ensureUploadDirectories when using cloud
3. **Line 110-113:** Replace saveImageToPublic with cloud upload
4. **Line 131:** Consider async writeFile
5. **Line 145-148:** Replace deleteUploadedFiles with cloud deletion

**Status:** 🟣 INFRASTRUCTURE

**Current:** Local file storage works fine for MVP  
**Priority:** Low (migrate when scaling or need CDN)

---

### Image Processing Enhancements
**File:** `lib/utils/image-processing.ts` (line 19-22)

```typescript
// TODO: FUTURE ENHANCEMENTS
// - Add WebP conversion support (smaller files)
// - Add AVIF support (even smaller)
// - Add watermarking capability
```

**Status:** 🟣 INFRASTRUCTURE

**Priority:** Low (current image processing works)

---

## 📋 Recommendations

### Immediate Actions (DELETE)
1. ✅ Delete outdated TODO in `app/search/page.tsx` - Search backend is done

### Should Implement Soon (Medium Priority)
1. 🟡 Settings save API - Settings dialog works but doesn't persist
2. 🟡 Following feed filter - Following feature exists but feed ignores it

### Can Implement Later (Low Priority)
1. 🔵 Comment likes - Nice-to-have
2. 🔵 Pagination on assets API - Not needed until you have 1000s of assets
3. 🔵 User mentions in comments - Basic commenting works
4. 🔵 Error logging service - Good for production

### Future Infrastructure (When Scaling)
1. 🟣 Cloud storage migration - When you need CDN/better performance
2. 🟣 WebP/AVIF conversion - When optimizing file sizes
3. 🟣 Image search - Advanced AI feature

---

## 🎯 Action Plan

### Quick Wins (Can Delete Now)
- ❌ `app/search/page.tsx` line 16-18 - Backend exists

### Medium Priority (Implement Next)
- 🟡 Settings save functionality
- 🟡 Following feed filtering

### Everything Else
- Keep as intentional TODOs for future development
- They document planned features clearly
- No action needed

---

## Summary

**Total TODOs in CODE:** 26  
**Outdated:** 1 (delete it)  
**Missing Features:** 3 (consider implementing)  
**Intentional Future Work:** 22 (keep them)

**TODOs in DOCUMENTATION:** 100+ (see below)

**The codebase is in great shape!** Most TODOs are intentional markers for future enhancements, not blockers.

---

## 📚 DOCUMENTATION TODOs (Outdated)

### Critical Finding: Documentation is Out of Date

The following documentation files contain **100+ TODO references** that are **outdated** because they describe the system **BEFORE** the Supabase migration:

#### 1. `docs/TODO_FILES_REFERENCE.md` (⚠️ COMPLETELY OUTDATED)
**Status:** This entire file is obsolete  
**Why:** Written before migration, describes mock data system  
**Contains:** 70+ TODO references to features that are now implemented

**Examples of outdated content:**
- Line 116: "⬜ TODO: Replace entire file with database queries" ❌ DONE
- Line 174-175: Multiple TODOs about replacing mock data ❌ DONE
- Line 204-206: "TODO: Replace `addAsset()` with database INSERT" ❌ DONE
- Line 212-216: "TODO: Replace with database SELECT, add pagination" ❌ DONE

**Recommendation:** 🗑️ DELETE or move to `docs/archive/`

---

#### 2. `docs/BACKEND_INTEGRATION.md` (⚠️ PARTIALLY OUTDATED)
**Status:** Contains outdated references  
**Why:** Describes mock data system and migration path

**Outdated sections:**
- Line 228-229: "Still uses in-memory (TODO)" for user/team pages ❌ NOW USES DATABASE
- Line 253: "TODO - Delete asset and files" - Still valid ✅
- References to `lib/utils/assets-storage.ts` which was deleted

**Recommendation:** 📝 UPDATE to reflect current Supabase implementation

---

#### 3. `docs/AI_AGENT_GUIDE.md` (⚠️ PARTIALLY OUTDATED)
**Status:** Still references TODO system from mock data era

**Outdated content:**
- Lines 137-147: Examples of TODO comments that are now done
- Lines 203-224: "TODO System Explained" - most examples are completed
- Line 350: References TODO_FILES_REFERENCE.md as current documentation

**Recommendation:** 📝 UPDATE to reflect Supabase migration is complete

---

#### 4. `docs/IMAGE_UPLOAD.md` (⚠️ PARTIALLY OUTDATED)
**Status:** Contains completed TODOs

**Outdated sections:**
- Line 108-110: "TODO: When adding database" ❌ DATABASE IS ADDED
- Line 149-151: "TODO: Replace addAsset() with database INSERT" ❌ DONE
- Line 212-214: "TODO: Replace filesystem with S3" - Still valid for cloud migration ✅

**Recommendation:** 📝 UPDATE first two sections, keep cloud migration TODO

---

#### 5. `docs/auth/DATA_MIGRATION_GUIDE.md` (⚠️ PARTIALLY OUTDATED)
**Contains:** Line 421-423: "TODO: Implement following filter"

**Status:** Valid TODO, same as the one in `components/dashboard/feed.tsx`

**Recommendation:** ✅ KEEP (valid future work)

---

#### 6. `docs/streams-feature-specification.plan.md` (⚠️ HISTORICAL)
**Contains:** Multiple TODOs describing the migration plan

**Status:** This is a historical planning document  
**Recommendation:** 📦 Move to `docs/archive/` (already implemented)

---

#### 7. `docs/archive/*.md` Files
**Contains:** Various TODOs in archived documents

**Status:** Expected (these are historical)  
**Recommendation:** ✅ LEAVE AS-IS (archive is for history)

---

### Documentation Cleanup Recommendations

| File | Status | Action | Priority |
|------|--------|--------|----------|
| `docs/TODO_FILES_REFERENCE.md` | Obsolete | 🗑️ Delete or archive | HIGH |
| `docs/BACKEND_INTEGRATION.md` | Outdated | 📝 Update | HIGH |
| `docs/AI_AGENT_GUIDE.md` | Outdated | 📝 Update | MEDIUM |
| `docs/IMAGE_UPLOAD.md` | Partially outdated | 📝 Update | MEDIUM |
| `docs/streams-feature-specification.plan.md` | Historical | 📦 Move to archive | LOW |
| `docs/archive/*` | Historical | ✅ Keep as-is | N/A |
| `README.md` | Outdated | 📝 Update | HIGH |

---

### README.md Specific Issues

The README contains many references to the **mock data system** that no longer exists:

**Outdated sections:**
- Line 254: "TODO comments explaining backend replacement" - Backend is already connected
- Line 320: "20+ files with TODO comments (many now implemented!)" - Understates progress
- Line 346-357: "TODO Comments" section - Most are now done
- Line 455: "TODO Comments: 80+ remaining (30+ completed!)" - Should be "26 remaining, 80+ completed"

**Recommendation:** 📝 Major update needed to reflect:
- ✅ Migration complete
- ✅ Supabase integrated
- ✅ Mock data deleted
- ✅ Only 26 TODOs remain (all intentional future work)

