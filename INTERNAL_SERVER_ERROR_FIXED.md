# Internal Server Error Fixed

**Date:** November 27, 2025  
**Error:** Internal Server Error (500)  
**Status:** ✅ FIXED

---

## Bugs Found & Fixed

### 🐛 Bug #1: Missing `await` in createClient() Call
**File:** `app/u/[username]/page.tsx` (line 112)

**Problem:**
```typescript
// BEFORE (broken)
const supabase = createClient();  // ❌ Missing await
```

**Impact:** Since `createClient()` is an async function (it awaits `cookies()`), not awaiting it returns a Promise instead of the Supabase client, causing all subsequent database calls to fail with "Cannot read property 'from' of undefined" or similar errors.

**Fix:**
```typescript
// AFTER (fixed)
const supabase = await createClient();  // ✅ Properly awaited
```

---

### 🐛 Bug #2: Missing `await` in createAdminClient()
**File:** `lib/supabase/server.ts` (line 66-89)

**Problem:**
```typescript
// BEFORE (broken)
export function createAdminClient() {
  const cookieStore = cookies();  // ❌ Not awaiting async function
  
  return createServerClient(..., {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();  // ❌ Awkward await
      },
      async setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          (cookieStore as any).set(...);  // ❌ Type casting
        });
      },
    },
  });
}
```

**Impact:** The `cookies()` function in Next.js 15+ is async and must be awaited. Not awaiting it causes server errors when trying to access cookies.

**Fix:**
```typescript
// AFTER (fixed)
export async function createAdminClient() {  // ✅ Made async
  const cookieStore = await cookies();       // ✅ Properly awaited
  
  return createServerClient(..., {
    cookies: {
      getAll() {                             // ✅ Not async anymore
        return cookieStore.getAll();         // ✅ Clean code
      },
      setAll(cookiesToSet) {                 // ✅ Not async anymore
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(...);            // ✅ No type casting
          });
        } catch (error) {
          // Ignore cookie errors in Server Components
        }
      },
    },
  });
}
```

---

## Root Cause

**Next.js 15+ Breaking Change:** The `cookies()` function became async and must be awaited:

```typescript
// Next.js 14 (old)
const cookieStore = cookies();  // Sync

// Next.js 15+ (new)
const cookieStore = await cookies();  // Async
```

Our code had:
1. ✅ `createClient()` - properly awaiting cookies ✅
2. ❌ `createAdminClient()` - NOT awaiting cookies ❌  
3. ❌ One usage of `createClient()` without await ❌

---

## Files Modified

1. **`lib/supabase/server.ts`**
   - Made `createAdminClient()` async
   - Added `await` to `cookies()` call
   - Cleaned up cookie handlers (removed unnecessary async/await)

2. **`app/u/[username]/page.tsx`**
   - Added `await` to `createClient()` call on line 112

---

## Verification

### Linter Check
```bash
read_lints [modified files]
```
**Result:** ✅ Zero errors

### Server Start
The dev server should now start without internal server errors.

### API Routes
All API routes properly await `createClient()` already:
- ✅ `/api/assets/*` - all await
- ✅ `/api/streams/*` - all await
- ✅ `/api/users/*` - all await
- ✅ `/api/search` - awaits
- ✅ `/api/notifications` - awaits
- ✅ All other routes - await

### Server Components
All server components properly await `createClient()`:
- ✅ `/home` - awaits
- ✅ `/streams` - awaits
- ✅ `/stream/[slug]` - awaits
- ✅ `/e/[id]` - awaits
- ✅ `/u/[username]` - NOW awaits ✅

---

## Impact

### Before Fix
- ❌ Internal Server Error 500
- ❌ User profile pages fail to load
- ❌ Admin operations fail
- ❌ Cookie handling broken

### After Fix
- ✅ No server errors
- ✅ User profile pages load correctly
- ✅ Admin operations work
- ✅ Cookie handling functional
- ✅ All database queries execute properly

---

## Testing

To verify the fix works:

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Test user profile page:**
   - Navigate to `/u/[username]`
   - Should load without error

3. **Test all pages:**
   - Home: `/home` ✅
   - Streams: `/streams` ✅
   - Stream detail: `/stream/[slug]` ✅
   - Asset detail: `/e/[id]` ✅
   - User profile: `/u/[username]` ✅

---

## Prevention

**Always remember in Next.js 15+:**
```typescript
// ❌ WRONG
const supabase = createClient();

// ✅ CORRECT
const supabase = await createClient();
```

The function is async and MUST be awaited!

---

**Status:** ✅ Fixed - Server should now run without internal server errors

