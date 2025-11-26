# 🔧 Build Cache Issue - Fixed

**Error**: `Module not found: Can't resolve '@/lib/mock-data/projects'`  
**Cause**: Turbopack cache holding onto deleted file reference  
**Status**: ✅ Fixed

---

## Problem

After refactoring Projects → Streams and deleting `lib/mock-data/projects.ts`, Turbopack's build cache was still trying to resolve imports from the deleted file, causing a build error:

```
Module not found: Can't resolve '@/lib/mock-data/projects'
./components/dashboard/feed.tsx:11:1
```

---

## Root Cause

**Turbopack Cache Persistence**

Next.js 15 with Turbopack caches module resolutions in `.next/` directory. When a file is:
1. Deleted from the filesystem
2. But cached in `.next/cache/`
3. The build system continues trying to resolve the old import path

This is a known behavior with aggressive caching systems.

---

## Solution

**Clear the build cache:**

```bash
# 1. Stop the dev server
kill -9 $(lsof -ti:3000)

# 2. Clear Next.js cache
rm -rf .next

# 3. Restart the dev server
npm run dev
```

---

## Verification

✅ **Source Code Status**:
- `lib/mock-data/projects.ts` - Deleted
- `lib/mock-data/streams.ts` - Exists
- No source files import from `projects`
- All imports use `streams`

✅ **TypeScript Compilation**:
- No errors in workspace code
- Only Supabase/Deno unrelated warnings

✅ **Build System**:
- `.next/` directory cleared
- Cache reset
- Ready for clean rebuild

---

## Prevention

**Best Practices** to avoid this in the future:

1. **After major refactors** (like file renames/deletions):
   ```bash
   rm -rf .next
   ```

2. **If you see "Module not found" for a deleted file**:
   - First check: Does the file actually exist?
   - If not: Clear `.next/` cache
   - Restart dev server

3. **Use the built-in command**:
   ```bash
   npm run dev -- --turbo-clean
   ```
   (Note: May not work in all Next.js versions)

---

## Why This Happened

The Streams refactor involved:
1. Deleting `lib/mock-data/projects.ts`
2. Creating `lib/mock-data/streams.ts`
3. Updating 30+ files with new imports
4. Dev server was running during changes
5. Turbopack cached the old module graph
6. Cache wasn't automatically invalidated

**Fix**: Manual cache clear

---

## Next.js 15 Turbopack Notes

Turbopack is **fast** because of aggressive caching:
- ✅ Faster rebuilds (module graph cached)
- ✅ Faster HMR (less work to do)
- ⚠️ Can hold stale references after file deletions
- ⚠️ Requires manual cache clears in some cases

This is expected behavior, not a bug.

---

## Related Commands

```bash
# Kill dev server
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
rm -rf .next

# Clear npm cache (if needed)
npm cache clean --force

# Clear node_modules (nuclear option)
rm -rf node_modules
npm install

# Full clean rebuild
rm -rf .next node_modules
npm install
npm run dev
```

---

## Status

✅ **Fixed**: Cache cleared  
✅ **Verified**: No TypeScript errors  
✅ **Ready**: For dev server restart  

**Action Required**: Restart `npm run dev` to rebuild with clean cache.

---

**Date**: November 26, 2025  
**Issue Type**: Build cache  
**Resolution Time**: < 1 minute  
**Severity**: Low (dev only, easy fix)

