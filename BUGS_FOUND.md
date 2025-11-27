# 🐛 Bugs Found in Phase A-B Code Review

**Date:** November 27, 2025  
**Status:** 20 issues identified (3 critical, 4 high, 6 medium, 7 low)

---

## 🚨 **CRITICAL BUGS** (Fix Immediately)

### Bug #1: `/api/streams/[id]` Route is Non-Functional
- **File:** `app/api/streams/[id]/route.ts`
- **Issue:** All helper functions return `null` or empty arrays
- **Impact:** GET/PUT/DELETE operations fail silently
- **Fix:** Delete route OR implement with Supabase queries

### Bug #2: Upload Route Imports Deleted File
- **File:** `app/api/assets/upload/route.ts:54`
- **Issue:** `import { getStreams } from '@/lib/utils/stream-storage'`
- **Impact:** Stream validation will crash when file is deleted
- **Fix:** Replace with direct Supabase query

### Bug #3: StreamIds Not Parsed Correctly
- **File:** `app/api/assets/upload/route.ts:128`
- **Issue:** `formData.getAll('streamIds')` but client sends JSON string
- **Impact:** Stream associations don't work
- **Fix:** Parse JSON instead of using getAll()

---

## ⚠️ **HIGH PRIORITY**

### Bug #4: Mock Data Still Imported
- **Files:** 4 files still import `STREAM_VALIDATION` from mock-data
- **Impact:** Inconsistent with migration goals
- **Fix:** Create `lib/constants/streams.ts`

### Bug #5: TypeScript `any` Types
- **Files:** `search-results.tsx`, `upload-dialog.tsx`
- **Impact:** Loss of type safety
- **Fix:** Define proper interfaces

### Bug #6: Hard Page Reload
- **File:** `upload-dialog.tsx:290`
- **Issue:** `window.location.href = '/home'`
- **Impact:** Bad UX, loses state
- **Fix:** Use `router.push()` + `router.refresh()`

### Bug #7: No Debounce on Validation
- **File:** `create-stream-dialog.tsx:108`
- **Impact:** Database query on every keystroke
- **Fix:** Add 300ms debounce

---

## 🟡 **MEDIUM PRIORITY**

- Race condition in useStreamMentions
- alert() instead of toast notifications
- Color search fetches all assets (performance)
- No stream refresh mechanism
- Missing error boundaries
- Direct Supabase queries in components

---

## 🟢 **LOW PRIORITY**

- Inconsistent logging
- Missing loading states
- Accessibility improvements
- No pagination
- Magic numbers
- Documentation gaps

---

## 📋 Files Still Using Mock Data

**In Phase A-B Scope:**
- ✅ `components/search/search-results.tsx` - FIXED
- ✅ `components/layout/search-suggestions.tsx` - FIXED
- ⚠️ `components/streams/stream-picker.tsx` - Uses STREAM_VALIDATION
- ⚠️ `components/layout/upload-dialog.tsx` - Uses STREAM_VALIDATION
- ⚠️ `components/layout/create-stream-dialog.tsx` - Uses STREAM_VALIDATION
- ⚠️ `lib/hooks/use-stream-mentions.ts` - Uses Stream type + VALIDATION
- ⚠️ `app/api/assets/upload/route.ts` - Uses getStreams()

**Outside Phase A-B Scope:**
- 📄 `app/t/[slug]/page.tsx` - Team pages (Phase C)
- 📄 `app/teams/page.tsx` - Teams listing (Phase C)
- 📄 `app/library/page.tsx` - Library page (Phase D)
- 📄 `components/streams/stream-card.tsx` - Only uses Type
- 📄 Other stream components - Not in search/stream management

---

## ✅ Next Actions

### Immediate (Before Production):
1. [ ] Fix Bug #1 - Delete or fix `/api/streams/[id]` route
2. [ ] Fix Bug #2 - Remove stream-storage import from upload
3. [ ] Fix Bug #3 - Parse streamIds as JSON in upload

### High Priority (This Sprint):
4. [ ] Create `lib/constants/streams.ts`
5. [ ] Update all 4 files to import from new location
6. [ ] Add proper TypeScript types
7. [ ] Replace hard reload with router

### Medium Priority (Next Sprint):
8. [ ] Add toast notifications
9. [ ] Add error boundaries
10. [ ] Optimize color search

---

## 🧪 Test These After Fixes

1. Upload asset with streams ✓
2. Create stream from picker ✓
3. Create stream from hashtag ✓
4. Search for assets/users/streams ✓
5. Color search ✓
6. Stream name validation ✓
7. Duplicate stream names ✓

---

**Full Details:** See `CODE_REVIEW_PHASE_AB.md`

