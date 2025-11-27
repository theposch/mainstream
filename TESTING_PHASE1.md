# Phase 1 Testing Guide

## ✅ What We've Completed

### 1. Upload API Migration (`/app/api/assets/upload/route.ts`)
- ✅ Inserts assets directly into Supabase
- ✅ Creates `asset_streams` relationships  
- ✅ Generates notifications
- ✅ Handles file upload and image processing

### 2. Home Page Migration (`/app/home/page.tsx`)
- ✅ Queries Supabase directly
- ✅ Joins with users table for uploader info

### 3. Feed Component (`/components/dashboard/feed.tsx`)
- ✅ Handles snake_case database schema
- ✅ Empty state UI
- ✅ Infinite scroll ready

###4. Assets API (`/app/api/assets/route.ts`)
- ✅ Migrated from JSON to Supabase
- ✅ Proper error handling

### 5. Infinite Scroll (Phase 2)
- ✅ `use-assets-infinite.ts` hook
- ✅ Intersection Observer implementation
- ✅ Cursor-based pagination

## 🧪 Testing Steps

### Step 1: Check Database Connection
```bash
# Verify Supabase is running
docker ps | grep supabase

# Check database has data
docker exec supabase-db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM assets;"
# Expected: 5 assets

# Check RLS policies
docker exec supabase-db psql -U postgres -d postgres -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assets';"
```

### Step 2: Test Authentication
```bash
# Navigate to app
open http://localhost:3000

# Try to login/signup
# Username: testuser
# Email: test@example.com
```

### Step 3: Test Home Feed
```bash
# Navigate to home
open http://localhost:3000/home

# Expected: Should see 5 assets from seed data
# If empty: RLS policies might be blocking access
```

### Step 4: Test File Upload
```bash
# Click "Upload" button in navbar
# Select an image file
# Fill in title
# Click "Post"

# Expected: 
# - Upload progress
# - Redirect to /home
# - New asset appears in feed
```

### Step 5: Test API Directly
```bash
# Test assets endpoint
curl http://localhost:3000/api/assets | jq '.assets | length'
# Expected: Number > 0

# If 0, check server logs for errors
npm run dev
# Look for errors in console
```

## 🐛 Known Issues

### Issue 1: RLS Policies May Block Anonymous Access
**Symptom:** API returns 0 assets even though database has 5

**Cause:** Row Level Security policies in Supabase block anonymous reads

**Fix:**
```sql
-- Add policy for public read access (development only)
CREATE POLICY "Allow public read access to assets" 
  ON assets FOR SELECT 
  USING (true);

-- Or disable RLS temporarily for testing
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
```

**Apply fix:**
```bash
docker exec supabase-db psql -U postgres -d postgres -c "
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
"
```

### Issue 2: Auth Required for Upload
**Symptom:** Upload fails with "Authentication required"

**Expected:** This is correct behavior - users must be logged in

**Fix:** Sign up or login first at `/auth/signup` or `/auth/login`

### Issue 3: Type Mismatches (snake_case vs camelCase)
**Symptom:** TypeScript errors about property names

**Status:** Already fixed in Phase 1  
**Solution:** Updated all interfaces to match database schema (snake_case)

## 📊 Success Criteria

Phase 1 is successful when:

- [ ] ✅ Supabase is running and accessible
- [ ] ✅ Can view seed data in home feed
- [ ] ✅ Can sign up / login
- [ ] ✅ Can upload a new image
- [ ] ✅ Uploaded image appears in feed immediately
- [ ] ✅ Infinite scroll loads more assets
- [ ] ✅ No console errors

## 🔍 Debugging Commands

```bash
# Check server logs
npm run dev

# Check Supabase logs
docker logs supabase-kong

# Query database directly
docker exec -it supabase-db psql -U postgres -d postgres

# Inside psql:
\dt                          # List tables
SELECT * FROM assets;        # View assets
SELECT * FROM users;         # View users
\q                           # Quit
```

## 📝 Next Steps After Testing

Once Phase 1 is validated:
1. ✅ Move to Phase 3: Likes with real-time updates
2. ✅ Move to Phase 4: Comments system migration  
3. ✅ Move to Phase 5: Full-text search implementation



