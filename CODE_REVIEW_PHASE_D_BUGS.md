# Code Review - Phase D Bugs Found

**Date:** November 27, 2025  
**Status:** 2 Critical Bugs + 1 Warning Found

---

## 🐛 Critical Bug #1: Field Name Mismatch in StreamResource

**File:** `components/streams/stream-resources-list.tsx` + `lib/types/database.ts`

**Problem:**
```typescript
// lib/types/database.ts (line 70)
export interface StreamResource {
  resource_type: 'figma' | 'jira' | 'notion' | 'prd' | 'other';  // snake_case
}

// components/streams/stream-resources-list.tsx (line 17)
const ResourceTypeIcon: Record<StreamResource['resourceType'], ...> = {
  // Tries to access 'resourceType' (camelCase) but type has 'resource_type'
}

// Line 52
const Icon = ResourceTypeIcon[resource.resourceType];
// Will be undefined! Type has resource_type, not resourceType
```

**Impact:** 
- ⚠️ TypeScript compile error
- ⚠️ Runtime error - icons won't display
- ⚠️ Component will break when rendering resources

**Fix:** Change field name in database.ts to match component expectation OR update component to use snake_case

---

## 🐛 Critical Bug #2: Missing Field in User Type

**File:** `components/layout/settings-dialog.tsx`

**Problem:**
```typescript
// Line 60 - Settings dialog tries to access user.website
setWebsite(user.website || "");

// But User interface (lib/auth/use-user.ts) doesn't have website field
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  jobTitle?: string;
  teamId?: string;
  createdAt: string;
  // ❌ No website field!
}
```

**Impact:**
- ⚠️ TypeScript error (accessing undefined property)
- Settings dialog won't initialize website field correctly
- User's website won't be displayed/editable

**Fix:** Add `website?: string;` to User interface in both `lib/auth/use-user.ts` and `lib/auth/get-user.ts`

---

## ⚠️ Warning: Duplicate User Types

**Files:** `lib/types/database.ts` vs `lib/auth/use-user.ts` + `lib/auth/get-user.ts`

**Issue:**
Two different User interfaces exist:

**Database User (snake_case):**
```typescript
// lib/types/database.ts
export interface User {
  id: string;
  username: string;
  display_name: string;  // snake_case
  avatar_url: string;    // snake_case
  bio?: string;
  email?: string;
  created_at: string;    // snake_case
  updated_at?: string;   // snake_case
}
```

**Auth User (camelCase):**
```typescript
// lib/auth/use-user.ts & lib/auth/get-user.ts
export interface User {
  id: string;
  username: string;
  displayName: string;   // camelCase
  email: string;
  avatarUrl: string;     // camelCase
  bio?: string;
  jobTitle?: string;
  teamId?: string;
  createdAt: string;     // camelCase
}
```

**Current Status:**
- Auth utilities map database snake_case to camelCase
- Components use auth User (camelCase)
- Database types use raw format (snake_case)

**Potential Issues:**
- Confusion about which User type to import
- Easy to mix up camelCase vs snake_case
- Type errors if wrong import used

**Recommendation:**
- Rename one (e.g., `DatabaseUser` vs `AuthUser`)
- Or consolidate to single type
- Add JSDoc comments explaining the difference

---

## 🔍 Other Findings

### Settings Dialog Return Value
**File:** `components/layout/settings-dialog.tsx` (line 103)

```typescript
if (loading || !user) {
  return null;
}
```

**Issue:** Dialog returns `null` while loading instead of showing loading state.

**Impact:** Dialog appears to "not work" briefly on first open.

**Recommendation:** Return a loading skeleton or spinner instead of `null`.

---

## 📋 Summary

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 2 | Must fix before production |
| **Warning** | 1 | Should address |
| **Info** | 1 | Nice to have |

---

## ✅ Required Fixes

### Fix #1: StreamResource Field Names
**Option A (Recommended):** Update database type to match component
```typescript
// lib/types/database.ts
export interface StreamResource {
  id: string;
  streamId: string;        // was stream_id
  title: string;
  url: string;
  resourceType: 'figma' | 'jira' | 'notion' | 'prd' | 'other';  // was resource_type
  displayOrder: number;    // was display_order
  createdAt: string;       // was created_at
}
```

**Option B:** Update component to use snake_case
```typescript
const ResourceTypeIcon: Record<StreamResource['resource_type'], ...> = {
const Icon = ResourceTypeIcon[resource.resource_type];
```

### Fix #2: Add Website Field to User
```typescript
// lib/auth/use-user.ts & lib/auth/get-user.ts
export interface User {
  // ... existing fields
  website?: string;
  // ... rest
}

// In mapping function, add:
website: userProfile.website,
```

---

## 🧪 Testing Recommendations

After fixes:
1. Test stream resources list renders correctly
2. Test settings dialog loads user data
3. Verify website field displays
4. Check TypeScript compiles with no errors
5. Test all forms initialize correctly

---

**Found 2 critical bugs that need immediate fixing before the code is production-ready.**

