# Features Removed - Cleanup Summary

**Date:** November 27, 2025  
**Reason:** Internal tool scope reduction - removed non-essential features

---

## ✅ Features Removed

### 1. ❌ Image Search
**Removed from:** `components/layout/search-bar.tsx`

**What was removed:**
- Image search button (camera icon)
- TODO comment about AI vision search
- `ImageIcon` import

**Why:** Advanced AI feature not needed for internal tool

---

### 2. ❌ Online Status Indicator
**Removed from:** `components/layout/user-menu.tsx`

**What was removed:**
- Green dot indicator on avatar
- TODO comment about WebSocket presence system

**Why:** Not needed for internal company tool

---

### 3. ❌ Billing & Subscription
**Removed from:** `components/layout/user-menu.tsx`

**What was removed:**
- "Billing" menu item
- TODO comment about subscription pages
- `CreditCard` icon import

**Why:** Internal tool - no monetization needed

---

### 4. ❌ Save from URL
**Removed from:** `components/layout/create-dialog.tsx`

**What was removed:**
- "Save from URL" button (disabled/coming soon)
- TODO comment
- `Link` icon import

**Why:** Decided not to implement this feature

---

### 5. ❌ More Menu Button
**Removed from:** 
- `components/assets/mobile-action-bar.tsx`
- `components/assets/asset-detail-mobile.tsx`

**What was removed:**
- "More" button with 3-dot icon
- `onMoreTap` prop and handler
- TODO comment about share/report functionality
- `MoreHorizontal` icon import

**Why:** No specific actions needed, keeping UI simpler

**UI Impact:** Mobile action bar now has 2 buttons instead of 3:
- ❤️ Like button (left)
- 💬 Comments button (center, full-width)

---

## 📝 Updated: Cloud Storage TODOs

**Updated in:** `lib/utils/file-storage.ts`

**Changed:** All cloud storage migration TODOs now reference **Supabase Storage** instead of generic S3/R2/Cloudflare.

### Why Supabase Storage?
- ✅ You already have Supabase
- ✅ Built on S3 (reliable, scalable)
- ✅ Automatic CDN
- ✅ Simple API (`supabase.storage.from()`)
- ✅ Integrated with your existing auth

### Updated TODOs:
1. **Main migration note** - Now shows Supabase Storage example code
2. **ensureUploadDirectories** - References Supabase buckets
3. **saveImageToPublic** - References Supabase upload API
4. **deleteUploadedFiles** - References Supabase remove API

---

## 📊 Impact Summary

| Category | Before | After | Change |
|----------|--------|-------|--------|
| **Code TODOs** | 26 | 21 | -5 removed |
| **UI Buttons Removed** | - | 5 | Simpler UI |
| **Unused Imports** | - | 5 | Cleaner code |
| **Lines Removed** | - | ~60 | Cleaner codebase |

---

## 🎯 Remaining TODOs: 21

### Outdated (1)
- `app/search/page.tsx` - Search backend TODO (already implemented)

### Missing Features (3)
- Settings save functionality (medium priority)
- Following feed filter (medium priority)
- Comment likes (low priority)

### Future Enhancements (12)
- Assets API pagination
- User mentions in comments
- Save to collection UI
- User settings navigation
- Profile activity tab
- Error logging service (Sentry)
- Search caching
- And more...

### Infrastructure (5)
- Supabase Storage migration (all 5 TODOs updated to reference Supabase)

---

## ✅ Result

**Codebase is now:**
- ✅ Simpler and more focused
- ✅ No unnecessary features for internal tool
- ✅ Cleaner UI (removed 5 buttons/menu items)
- ✅ Better documented cloud storage path (Supabase Storage)
- ✅ 5 fewer TODOs to maintain
- ✅ Zero linter errors

**All removed features were:**
- Not needed for internal company tool
- Future/nice-to-have features
- Cluttering the UI unnecessarily

---

## 🚀 Next Steps

The codebase is cleaner and more focused. Remaining work:
1. Delete 1 outdated TODO (`app/search/page.tsx`)
2. Optionally implement 2-3 medium-priority features
3. Keep 17 intentional TODOs as roadmap documentation

**The app is production-ready for internal use!** 🎉

