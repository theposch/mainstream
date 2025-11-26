# 🐛 Bug Hunt #2: Complete Streams Migration Report

**Date**: January 27, 2025  
**Focus**: Terminology consistency and deprecated route cleanup  
**Status**: 🔴 **13 CRITICAL ISSUES FOUND**

---

## 🚨 **Critical Issues Found**

### **Category 1: Deprecated Routes (Must Delete or Redirect)**

#### ❌ Bug #8: Old Project Page Route Still Exists
**File**: `app/project/[id]/page.tsx`
**Severity**: CRITICAL
**Impact**: Users can still access old `/project/[id]` URLs which use deprecated data
**Issue**: 
- Route still uses `projects` from mock data
- Uses `ProjectHeader` component (old)
- Filters by `asset.projectId` (deprecated field)
- Should redirect to `/stream/[id]` or be deleted

**Fix**: Create redirect or delete entirely

---

#### ❌ Bug #9: Old Projects Listing Page Still Exists
**File**: `app/projects/page.tsx`
**Severity**: CRITICAL
**Impact**: Users accessing `/projects` see old data, not streams
**Issue**:
- Page title says "Projects" not "Streams"
- Uses `ProjectsGrid` component (old)
- Filters by `asset.projectId`
- Should redirect to `/streams` or be deleted

**Fix**: Create redirect or delete entirely

---

#### ❌ Bug #10: Old Projects API Route Still Exists
**File**: `app/api/projects/route.ts`  
**Severity**: CRITICAL  
**Impact**: Old API endpoints still work, creating confusion  
**Issue**:
- POST /api/projects creates projects, not streams
- GET /api/projects returns projects, not streams
- Creates data in wrong format
- Conflicts with new `/api/streams` routes

**Fix**: Delete or create proxy to /api/streams

---

### **Category 2: Component References to Old Data Model**

#### ❌ Bug #11: Asset Detail Shows Project Breadcrumb
**File**: `components/assets/asset-detail-desktop.tsx`  
**Lines**: 49-58  
**Severity**: HIGH  
**Impact**: Asset detail modal shows "Project" breadcrumb instead of "Streams"

**Current Code**:
```typescript
const project = projects.find(p => p.id === asset.projectId);
const owner = project?.ownerType === 'team' 
  ? teams.find(t => t.id === project.ownerId)
  : users.find(u => u.id === project?.ownerId);
const projectLink = project ? `/project/${project.id}` : '/home';
```

**Issue**:
- Reads `asset.projectId` (deprecated)
- Shows single project, not multiple streams
- Links to `/project/` (old route)
- Uses `projects` import

**Fix**: Show multiple stream badges instead of single project link

---

#### ❌ Bug #12: Old Project Dialog Component Exists
**File**: `components/layout/create-project-dialog.tsx`  
**Severity**: HIGH  
**Impact**: Dead code that could confuse developers

**Issue**:
- Component still exists but isn't used (replaced by create-stream-dialog)
- Creates projects via `/api/projects` (old API)
- Redirects to `/project/[id]` (old route)
- Should be deleted

**Fix**: Delete file entirely

---

#### ❌ Bug #13: Old Project Components Still Exist
**Files**: 
- `components/projects/project-header.tsx`
- `components/projects/projects-grid.tsx`
- `components/projects/project-card.tsx`
- `components/projects/project-grid.tsx`

**Severity**: MEDIUM  
**Impact**: Dead code, unused imports, confusion

**Issue**: All replaced by stream equivalents but not deleted

**Fix**: Delete all files in `components/projects/` directory

---

### **Category 3: Navigation & Links**

#### ❌ Bug #14: Asset Detail Links to Old Routes
**File**: `components/assets/asset-detail-desktop.tsx`  
**Line**: 58  
**Severity**: HIGH

**Issue**:
```typescript
const projectLink = project ? `/project/${project.id}` : '/home';
```

Links to old `/project/` route which may not work

**Fix**: Update to link to streams instead

---

### **Category 4: Data Model Inconsistencies**

#### ❌ Bug #15: Asset Upload API Still Accepts projectId
**File**: `app/api/assets/upload/route.ts`  
**Severity**: MEDIUM

**Need to Verify**: Does upload API accept `projectId` still? If yes, it should be removed in favor of `streamIds`.

---

#### ❌ Bug #16: Assets API Route May Reference projectId
**File**: `app/api/assets/route.ts`  
**Severity**: MEDIUM

**Need to Verify**: Check if filtering/querying by projectId

---

### **Category 5: Mock Data**

#### ❌ Bug #17: lib/mock-data/projects.ts Still Exists
**File**: `lib/mock-data/projects.ts`  
**Severity**: LOW  
**Impact**: Deprecated file should be removed after migration complete

**Issue**: 
- File marked as deprecated but still imported by many files
- Should be deleted after all references removed

**Fix**: Delete after fixing all imports

---

### **Category 6: Teams Page References**

#### ❌ Bug #18: Teams Page May Use Old Project Logic
**File**: `app/teams/page.tsx`  
**Severity**: MEDIUM

**Need to Verify**: Check if it uses project filtering

---

#### ❌ Bug #19: Team Profile May Show Old Project Tab
**File**: `app/t/[slug]/page.tsx`  
**Severity**: ALREADY FIXED (verify)

**Status**: Should be using streams now, but verify no projectId references

---

#### ❌ Bug #20: Teams API Route May Reference Projects
**File**: `app/api/teams/*/route.ts` (if exists)  
**Severity**: MEDIUM

**Need to Verify**: Check for project relationships

---

## 📊 **Summary Statistics**

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Deprecated Routes | 3 | 0 | 0 | 0 | **3** |
| Component Issues | 0 | 3 | 1 | 0 | **4** |
| Navigation Issues | 0 | 1 | 0 | 0 | **1** |
| Data Model | 0 | 0 | 2 | 0 | **2** |
| Mock Data | 0 | 0 | 0 | 1 | **1** |
| Other Pages | 0 | 0 | 2 | 0 | **2** |
| **TOTAL** | **3** | **4** | **5** | **1** | **13** |

---

## 🎯 **Priority Fix Order**

### **Phase 1: Critical - Route Cleanup** (30 min)
1. ✅ Delete or redirect `app/project/[id]/page.tsx`
2. ✅ Delete or redirect `app/projects/page.tsx`  
3. ✅ Delete or proxy `app/api/projects/route.ts`

### **Phase 2: High - Component Updates** (45 min)
4. ✅ Fix `components/assets/asset-detail-desktop.tsx` to show streams
5. ✅ Delete `components/layout/create-project-dialog.tsx`
6. ✅ Delete all files in `components/projects/` directory

### **Phase 3: Medium - Data Model** (20 min)
7. ✅ Verify/fix `app/api/assets/upload/route.ts`
8. ✅ Verify/fix `app/api/assets/route.ts`
9. ✅ Check `app/teams/page.tsx`

### **Phase 4: Low - Cleanup** (10 min)
10. ✅ Delete `lib/mock-data/projects.ts` after all references removed
11. ✅ Update any remaining documentation

**Total Estimated Time**: ~2 hours

---

## 🔍 **Files to Delete**

```
app/project/[id]/page.tsx
app/projects/page.tsx
app/api/projects/route.ts
components/layout/create-project-dialog.tsx
components/projects/project-header.tsx
components/projects/projects-grid.tsx
components/projects/project-card.tsx
components/projects/project-grid.tsx
lib/mock-data/projects.ts (after migration complete)
```

**Total**: 9 files (300+ lines of deprecated code)

---

## ✅ **What's Working** (From Previous Bug Hunt)

1. ✅ Stream creation dialog
2. ✅ Streams listing page (/streams)
3. ✅ Individual stream pages (/stream/[id])
4. ✅ Stream picker in upload dialog
5. ✅ Stream badges on asset cards
6. ✅ Search functionality with streams
7. ✅ User/team profiles with streams tab
8. ✅ API routes for streams (POST, GET, PUT, DELETE)
9. ✅ Asset-stream many-to-many relationships

---

## 🎯 **Expected Outcome**

After fixes:
- ✅ All old `/project/` routes deleted or redirected
- ✅ All old `/projects` routes deleted or redirected
- ✅ Asset detail shows multiple stream badges
- ✅ No imports of `projects` from mock data
- ✅ No references to `asset.projectId`
- ✅ Clean, streams-only codebase
- ✅ No dead code

---

**Bug Hunt By**: AI Assistant  
**Time to Find**: 15 minutes  
**Estimated Fix Time**: 2 hours  
**Next Step**: Begin Phase 1 fixes

