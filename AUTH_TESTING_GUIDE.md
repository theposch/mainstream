# Authentication Testing Guide

**Date**: November 26, 2025  
**Branch**: `feature/supabase-auth-pages`  
**Status**: Ready for Testing

---

## 🧪 Manual Testing Checklist

### Prerequisites
- ✅ Supabase Docker running: `cd supabase-docker && docker-compose ps`
- ✅ Next.js dev server running: `npm run dev`
- ✅ Browser open to: `http://localhost:3000`

---

## Test Suite

### Test 1: Signup Flow ✅

**Steps:**
1. Navigate to `http://localhost:3000/auth/signup`
2. Verify clean page with no navigation bar
3. Fill in the form:
   - Email: `testuser@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click "Create Account"

**Expected Results:**
- ✅ Form submits without errors
- ✅ Redirected to `/home`
- ✅ Navigation bar appears
- ✅ User can see the feed

**Verify in Supabase Studio:**
1. Open `http://localhost:54321`
2. Go to Authentication → Users
3. Should see `testuser@example.com` in the list
4. Check `created_at` timestamp

---

### Test 2: Validation Errors ✅

**Test 2a: Short Password**
1. Navigate to `/auth/signup`
2. Enter email: `test2@example.com`
3. Enter password: `pass` (less than 8 chars)
4. Enter confirm: `pass`
5. Click "Create Account"

**Expected:**
- ❌ Error message: "Password must be at least 8 characters long"
- ❌ Form does not submit

**Test 2b: Password Mismatch**
1. Email: `test3@example.com`
2. Password: `password123`
3. Confirm: `password456`
4. Click "Create Account"

**Expected:**
- ❌ Error message: "Passwords do not match"
- ❌ Form does not submit

**Test 2c: Duplicate Email**
1. Use same email as Test 1: `testuser@example.com`
2. Password: `password123`
3. Click "Create Account"

**Expected:**
- ❌ Error from Supabase: "User already registered"
- ❌ Form does not submit

**Test 2d: Invalid Email**
1. Email: `notanemail`
2. Password: `password123`
3. Click "Create Account"

**Expected:**
- ❌ Browser validation error
- ❌ Form does not submit

---

### Test 3: Login Flow ✅

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Verify clean page with no navigation
3. Fill in credentials from Test 1:
   - Email: `testuser@example.com`
   - Password: `password123`
4. Click "Sign In"

**Expected Results:**
- ✅ Form submits without errors
- ✅ Redirected to `/home`
- ✅ User is logged in
- ✅ Can navigate the app

---

### Test 4: Login Errors ✅

**Test 4a: Wrong Password**
1. Navigate to `/auth/login`
2. Email: `testuser@example.com`
3. Password: `wrongpassword`
4. Click "Sign In"

**Expected:**
- ❌ Error: "Invalid login credentials"
- ❌ Not logged in

**Test 4b: Non-existent User**
1. Email: `doesnotexist@example.com`
2. Password: `password123`
3. Click "Sign In"

**Expected:**
- ❌ Error: "Invalid login credentials"
- ❌ Not logged in

---

### Test 5: Logout Flow ✅

**Steps:**
1. Ensure you're logged in (run Test 3 if needed)
2. Navigate to `/home`
3. Click your avatar in top-right corner
4. Click "Log out" (red text at bottom)

**Expected Results:**
- ✅ Session cleared
- ✅ Redirected to `/auth/login`
- ✅ Cannot access `/home` without logging in again

---

### Test 6: Session Persistence ✅

**Steps:**
1. Log in successfully (Test 3)
2. Navigate to `/home`
3. Refresh the page (Cmd+R / Ctrl+R)
4. Navigate away and back: `/streams` → `/home`
5. Close browser tab and reopen to `/home`

**Expected Results:**
- ✅ Still logged in after refresh
- ✅ Still logged in after navigation
- ✅ Still logged in after reopening tab
- ✅ Session persists until logout

---

### Test 7: Protected Routes ⚠️

**Steps:**
1. Ensure you're logged OUT
2. Try accessing protected routes:
   - `/home`
   - `/streams`
   - `/teams`

**Current Behavior:**
- ⚠️ Routes are accessible (mock auth still active)
- ⚠️ Shows mock user data

**After Mock Auth Migration:**
- ✅ Should redirect to `/auth/login`
- ✅ Should only work when authenticated

---

### Test 8: Navigation Links ✅

**On Signup Page:**
1. Click "Sign in" link
2. Should navigate to `/auth/login`

**On Login Page:**
1. Click "Sign up" link  
2. Should navigate to `/auth/signup`

**After Login:**
1. Should see navigation bar
2. All nav links work: COSMOS®, Teams, Streams

---

### Test 9: UI/UX ✅

**Verify:**
- ✅ No navigation bar on `/auth/signup` and `/auth/login`
- ✅ Clean, fullscreen auth experience
- ✅ Form fields clearly labeled
- ✅ Error messages display prominently
- ✅ Loading states during submission ("Creating account...", "Signing in...")
- ✅ Buttons disabled during loading
- ✅ Placeholder text in fields
- ✅ OAuth buttons disabled (placeholders)
- ✅ Responsive on mobile sizes

---

### Test 10: Database Verification ✅

**After Creating Users:**
1. Open Supabase Studio: `http://localhost:54321`
2. Go to **Authentication** → **Users**
3. Verify each test user appears:
   - Email matches
   - `created_at` timestamp correct
   - `id` is UUID format
   - `email_confirmed_at` is set

4. Go to **Database** → **Table Editor** → **users**
5. Check if user profile was created:
   - Should have matching `id`
   - Should have `username`, `display_name`, etc.

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **Mock auth still active** - Protected routes don't check real sessions yet
2. **No email confirmation** - Users can login immediately without verifying email
3. **No password reset** - "Forgot password?" link is placeholder
4. **OAuth not functional** - Apple/Google/Meta buttons are disabled
5. **No user profile creation** - Users table not auto-populated on signup

### Workarounds:
- Manual testing required for now
- Use Supabase Studio to verify users
- Mock auth will be replaced in next phase

---

## 📊 Test Results Template

Use this template to record your testing:

```markdown
## Test Results - [Your Name] - [Date]

### Test 1: Signup Flow
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 2: Validation
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 3: Login Flow
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 4: Login Errors
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 5: Logout
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 6: Session Persistence
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 7: Protected Routes
- [ ] Pass / [ ] Fail (Expected to fail until mock auth replaced)
- Notes: _______________

### Test 8: Navigation Links
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 9: UI/UX
- [ ] Pass / [ ] Fail
- Notes: _______________

### Test 10: Database Verification
- [ ] Pass / [ ] Fail
- Notes: _______________

**Overall:** [ ] All Critical Tests Pass
**Blockers:** _______________
**Notes:** _______________
```

---

## 🚀 Quick Test Script

For rapid testing, run these steps:

```bash
# 1. Ensure services are running
cd supabase-docker && docker-compose ps

# 2. Open browser
open http://localhost:3000/auth/signup

# 3. Create test user
#    Email: test-$(date +%s)@example.com
#    Password: testpass123

# 4. Verify in Studio
open http://localhost:54321
#    Go to: Authentication → Users

# 5. Test logout
#    Click avatar → Log out

# 6. Test login
#    Use same credentials

# 7. Done!
```

---

## 📝 Next Steps After Testing

Once all tests pass:

1. ✅ Mark testing todo as complete
2. ⏳ Replace mock auth with real Supabase auth checks
3. ⏳ Update API routes to verify real sessions
4. ⏳ Add auth state to components
5. ⏳ Test protected routes work correctly

---

## 🎯 Success Criteria

Authentication system is ready when:

- ✅ Users can sign up with email/password
- ✅ Users can log in with credentials
- ✅ Users can log out
- ✅ Sessions persist across page refreshes
- ✅ Error messages are clear and helpful
- ✅ UI is clean and professional
- ✅ Users appear in Supabase Studio
- ⏳ Protected routes redirect to login when not authenticated
- ⏳ Real user data is shown (not mock data)

**Status**: 7/9 criteria met (78%)

---

**Testing completed by:** _____________  
**Date:** _____________  
**Branch tested:** `feature/supabase-auth-pages`  
**Commit:** `76f4948`

