# Manual Test Checklist: Streams Feature with localStorage Persistence

**Version:** 1.0  
**Date:** November 26, 2025  
**Purpose:** Comprehensive manual testing of streams feature with localStorage persistence

---

## 🎯 Test Environment Setup

### Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Browser console open (F12) for debugging
- [ ] Browser localStorage accessible (DevTools → Application → Local Storage)
- [ ] Test image file ready for upload (`test_image.png`)

### Initial State
- [ ] Clear browser localStorage: `localStorage.clear()` in console
- [ ] Refresh page to start with clean slate
- [ ] Verify 8 mock streams are visible in `/streams` page

---

## Test Suite 1: Stream Creation via Dialog

### Test 1.1: Valid Slug Creation
**Steps:**
1. Click "Create" button in navbar
2. Click "New Stream"
3. Type stream name: `test-stream-one`
4. Add description: `Test stream created manually`
5. Click "Create Stream"

**Expected Results:**
- [ ] Real-time validation shows "Available" (green checkmark)
- [ ] Create button becomes enabled
- [ ] Dialog closes after submission
- [ ] Redirects to `/stream/test-stream-one`
- [ ] Stream page loads successfully (not 404)
- [ ] Stream appears in localStorage (check Application tab)

---

### Test 1.2: Invalid Slug Validation
**Steps:**
1. Click "Create" → "New Stream"
2. Try invalid names one by one:
   - `Test Stream` (spaces)
   - `test_stream` (underscores)
   - `TestStream` (uppercase)
   - `test#stream` (special chars)
   - `#test-stream` (starts with #)

**Expected Results:**
- [ ] Each invalid name shows error: "Use lowercase letters, numbers, and hyphens only"
- [ ] Create button remains disabled
- [ ] Typing `#test-stream` auto-strips # to become `test-stream`

---

### Test 1.3: Duplicate Detection
**Steps:**
1. Create stream: `duplicate-test`
2. Close dialog, try creating another: `duplicate-test`

**Expected Results:**
- [ ] Shows error: "Stream name already taken"
- [ ] Create button disabled
- [ ] Checks against both mock streams AND localStorage streams

---

### Test 1.4: Persistence After Page Refresh
**Steps:**
1. Create stream: `persistence-test`
2. Verify redirects to `/stream/persistence-test`
3. Refresh browser (F5)
4. Navigate to `/streams` page

**Expected Results:**
- [ ] After refresh, stream page still loads (not 404)
- [ ] Stream appears in `/streams` grid
- [ ] localStorage still contains the stream

---

## Test Suite 2: Stream Creation via Hashtag

### Test 2.1: Create Stream from Description
**Steps:**
1. Click "Create" → "Upload Files"
2. Upload test image
3. In description field, type: `Testing with #ui-experiments and #new-hashtag-stream`
4. Observe pills above description

**Expected Results:**
- [ ] "ui-experiments" pill appears (existing stream)
- [ ] Dropdown appears for `#new-hashtag-stream` showing "Create new stream"
- [ ] Pills sync with hashtags in real-time

---

### Test 2.2: Multiple Hashtags
**Steps:**
1. In upload description, type: `#stream-one #stream-two #stream-three`

**Expected Results:**
- [ ] Three separate dropdowns or pills appear
- [ ] Each can be created independently
- [ ] All appear in stream picker after creation

---

### Test 2.3: Hashtag Auto-Complete
**Steps:**
1. Type `#ios` in description
2. Wait for dropdown

**Expected Results:**
- [ ] Dropdown shows "ios-app-redesign" as suggestion
- [ ] Can select to complete the hashtag
- [ ] After selection, text replaces to `#ios-app-redesign`

---

## Test Suite 3: Upload with Streams

### Test 3.1: Upload with Existing Streams
**Steps:**
1. Click "Create" → "Upload Files"
2. Upload test image
3. In stream picker (compact mode), click to expand
4. Select 2-3 existing streams
5. Add title: "Test Upload with Multiple Streams"
6. Click "Upload"

**Expected Results:**
- [ ] Selected streams show as pills
- [ ] Upload succeeds
- [ ] Asset appears on home feed with all stream badges visible
- [ ] Click each stream badge → navigates to correct stream page
- [ ] Asset appears on each stream page

---

### Test 3.2: Upload with New Stream (via hashtag)
**Steps:**
1. Upload image
2. Description: `Posted to #brand-new-stream`
3. Upload asset

**Expected Results:**
- [ ] New stream "brand-new-stream" is created
- [ ] Added to localStorage
- [ ] Asset has stream badge for "brand-new-stream"
- [ ] Stream appears in `/streams` page immediately (without refresh)

---

### Test 3.3: Mixed Existing and New Streams
**Steps:**
1. Upload image
2. Select existing stream from picker: "component-library"
3. Add hashtag in description: `#another-new-stream`
4. Upload

**Expected Results:**
- [ ] Asset tagged with both streams
- [ ] New stream created and persisted
- [ ] Both badges visible on asset

---

## Test Suite 4: Stream Page Navigation

### Test 4.1: Navigate to Mock Stream
**Steps:**
1. Go to `/streams`
2. Click on "ios-app-redesign" card

**Expected Results:**
- [ ] URL is `/stream/ios-app-redesign` (semantic URL)
- [ ] Page loads successfully
- [ ] Stream header displays correctly
- [ ] Assets associated with stream are displayed

---

### Test 4.2: Navigate to Persisted Stream
**Steps:**
1. Create new stream: `nav-test-stream`
2. Click stream badge from anywhere in app

**Expected Results:**
- [ ] URL is `/stream/nav-test-stream`
- [ ] Page loads (not 404)
- [ ] Stream details display correctly

---

### Test 4.3: Stream Badges Click-Through
**Steps:**
1. From home feed, click various stream badges

**Expected Results:**
- [ ] Each badge navigates to correct stream page
- [ ] All semantic URLs work
- [ ] No broken links

---

## Test Suite 5: Stream Persistence

### Test 5.1: localStorage Persistence
**Steps:**
1. Create 3 new streams
2. Open DevTools → Application → Local Storage → `localhost:3000`
3. Find key: `cosmos_user_streams`

**Expected Results:**
- [ ] Key exists
- [ ] Contains array of 3 stream objects
- [ ] Each has correct structure (id, name, description, etc.)

---

### Test 5.2: Cross-Tab Sync
**Steps:**
1. Open app in two browser tabs
2. In Tab 1: Create stream "cross-tab-test"
3. Switch to Tab 2

**Expected Results:**
- [ ] Tab 2 automatically updates to show new stream
- [ ] No page refresh needed
- [ ] Stream picker in both tabs shows new stream

---

### Test 5.3: Persistence After Browser Restart
**Steps:**
1. Create streams: `persist-1`, `persist-2`
2. Close all browser tabs
3. Close browser completely
4. Reopen browser and navigate to app

**Expected Results:**
- [ ] Created streams still exist
- [ ] Appear in `/streams` page
- [ ] Can navigate to their pages successfully

---

### Test 5.4: Clear localStorage
**Steps:**
1. In console: `localStorage.removeItem('cosmos_user_streams')`
2. Refresh page

**Expected Results:**
- [ ] User-created streams disappear
- [ ] Only 8 original mock streams remain
- [ ] No errors in console

---

## Test Suite 6: Edge Cases

### Test 6.1: Duplicate of Mock Stream
**Steps:**
1. Try creating stream with same name as mock: `ios-app-redesign`

**Expected Results:**
- [ ] Shows error: "Stream name already taken"
- [ ] Cannot create duplicate

---

### Test 6.2: Special Characters in Hashtag
**Steps:**
1. In upload description, type: `#Test@Stream!`

**Expected Results:**
- [ ] Invalid characters stripped
- [ ] Auto-sanitizes to valid slug
- [ ] Or shows error

---

### Test 6.3: Very Long Stream Name
**Steps:**
1. Try creating stream: `this-is-a-very-long-stream-name-that-exceeds-fifty-characters-total`

**Expected Results:**
- [ ] Validation error if > 50 chars
- [ ] Input field enforces max length

---

### Test 6.4: Empty Stream Name
**Steps:**
1. Click "Create Stream" with empty name field

**Expected Results:**
- [ ] Button disabled
- [ ] Cannot submit

---

### Test 6.5: Upload with 5+ Streams
**Steps:**
1. Upload image
2. Try adding 6 different streams (via picker + hashtags)

**Expected Results:**
- [ ] Max streams enforced (typically 5)
- [ ] Shows error message
- [ ] Or allows but with warning

---

### Test 6.6: Navigate to Non-Existent Stream
**Steps:**
1. Manually type URL: `/stream/does-not-exist-stream`

**Expected Results:**
- [ ] Shows 404 page
- [ ] No console errors

---

## Test Suite 7: Stream Picker Integration

### Test 7.1: Compact Picker Shows All Streams
**Steps:**
1. Open upload dialog
2. Click stream picker (compact mode)

**Expected Results:**
- [ ] Shows both mock streams (8) and persisted streams
- [ ] Sorted by most recently updated
- [ ] Search works across all streams

---

### Test 7.2: Search Functionality
**Steps:**
1. Open stream picker
2. Type in search: `ios`

**Expected Results:**
- [ ] Filters to show only matching streams
- [ ] Shows "ios-app-redesign"
- [ ] Updates as you type

---

### Test 7.3: Create Stream from Picker
**Steps:**
1. Open stream picker
2. Click "+ Create New Stream" button
3. Create stream
4. Return to picker

**Expected Results:**
- [ ] New stream immediately appears in picker
- [ ] No need to close/reopen dialog
- [ ] Can select newly created stream

---

## Test Suite 8: API Integration

### Test 8.1: GET /api/streams
**Steps:**
1. In console: `fetch('/api/streams').then(r => r.json()).then(console.log)`

**Expected Results:**
- [ ] Returns both mock and persisted streams
- [ ] Response includes all expected fields
- [ ] No duplicates

---

### Test 8.2: POST /api/streams
**Steps:**
1. In console:
```javascript
fetch('/api/streams', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: 'api-test-stream', ownerType: 'user', isPrivate: false})
}).then(r => r.json()).then(console.log)
```

**Expected Results:**
- [ ] Returns created stream object
- [ ] Stream appears in localStorage
- [ ] Stream appears in `/streams` page

---

### Test 8.3: GET /api/streams/:slug
**Steps:**
1. Create stream: `slug-test`
2. In console: `fetch('/api/streams/slug-test').then(r => r.json()).then(console.log)`

**Expected Results:**
- [ ] Returns stream object
- [ ] 200 status code
- [ ] Works for both slug and ID

---

## 🎯 Success Criteria

**All tests must pass for production readiness:**

- [ ] **Stream Creation**: Both dialog and hashtag methods work
- [ ] **Slug Validation**: Enforced correctly with real-time feedback
- [ ] **localStorage Persistence**: Streams persist across sessions
- [ ] **Semantic URLs**: All `/stream/:slug` URLs work
- [ ] **Stream Picker**: Shows merged list (mock + persisted)
- [ ] **Upload Flow**: Assets can be tagged with multiple streams
- [ ] **Navigation**: All stream links work correctly
- [ ] **No 404s**: Newly created streams are immediately accessible
- [ ] **No Console Errors**: Clean console throughout testing
- [ ] **Cross-Component Sync**: Stream updates propagate across components

---

## 📝 Test Results Template

```
Test Date: _________________
Tester: ___________________

Total Tests: 50+
Passed: ____
Failed: ____
Blocked: ____

Critical Issues Found:
1. 
2. 
3. 

Minor Issues Found:
1. 
2. 
3. 

Notes:
____________________________________
____________________________________
____________________________________
```

---

## 🐛 Known Issues / Limitations

1. **SSR Limitation**: Server-rendered pages don't see localStorage streams on initial load. Page must be client-side navigated to see new streams.
2. **Mock Data**: This is a temporary persistence layer. Real database integration required for production.
3. **No Multi-Device Sync**: localStorage is per-browser. Streams don't sync across devices.

---

## 🔧 Debug Commands

**Clear all persisted streams:**
```javascript
localStorage.removeItem('cosmos_user_streams')
```

**View persisted streams:**
```javascript
JSON.parse(localStorage.getItem('cosmos_user_streams') || '[]')
```

**Manually add stream:**
```javascript
const streams = JSON.parse(localStorage.getItem('cosmos_user_streams') || '[]')
streams.push({
  id: 'debug-1',
  name: 'debug-stream',
  ownerType: 'user',
  ownerId: 'user-1',
  isPrivate: false,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})
localStorage.setItem('cosmos_user_streams', JSON.stringify(streams))
window.dispatchEvent(new Event('streams-updated'))
```

