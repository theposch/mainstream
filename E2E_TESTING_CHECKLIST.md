# End-to-End Testing Checklist for Cosmos App
**Testing Date:** _____________  
**Tester:** _____________  
**Browser:** _____________  
**Viewport Size:** _____________

---

## ✅ Test 1: Core Navigation & Layout

### Home Page Redirect (/)
- [ ] Navigate to `http://localhost:3000/`
- [ ] **Expected:** Redirects to `/home`
- [ ] **Actual:** _______________
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Home Feed (/home)
- [ ] Navigate to `http://localhost:3000/home`
- [ ] **Verify:**
  - [ ] Masonry grid loads with design assets
  - [ ] Navbar is present at top
  - [ ] "Create" button is visible in navbar
  - [ ] Page title/heading displays correctly
- [ ] **Console Errors:** ☐ None ☐ Present (list below)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Library Page (/library)
- [ ] Navigate to `http://localhost:3000/library`
- [ ] **Verify:**
  - [ ] User's personal library view displays
  - [ ] Filters/sorting options present
  - [ ] Assets load correctly
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Projects Page (/projects)
- [ ] Navigate to `http://localhost:3000/projects`
- [ ] **Verify:**
  - [ ] Project grid displays
  - [ ] Project cards show thumbnails
  - [ ] Project names and metadata visible
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Teams Page (/teams)
- [ ] Navigate to `http://localhost:3000/teams`
- [ ] **Verify:**
  - [ ] Teams listing displays
  - [ ] Team cards show avatars and info
  - [ ] Can click through to team pages
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Search Page (/search)
- [ ] Navigate to `http://localhost:3000/search`
- [ ] **Verify:**
  - [ ] Search interface loads
  - [ ] Search bar is functional
  - [ ] Can input search terms
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

---

## ✅ Test 2: User Profile Tests (/u/[username])

### Basic Profile Loading
- [ ] Navigate to `http://localhost:3000/u/jane-cooper`
- [ ] **Verify Profile Header:**
  - [ ] Avatar image loads properly
  - [ ] Display name: "Jane Cooper" is visible
  - [ ] Username: "@jane-cooper" displays
  - [ ] Job title displays (e.g., "Senior Product Designer")
  - [ ] Team badge/link is present and clickable
  - [ ] "Edit Profile" button shows (if viewing own profile)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Tab Navigation - Initial State
- [ ] **Verify Tabs Present:**
  - [ ] "Shots" tab (default/active)
  - [ ] "Projects" tab
  - [ ] "Liked" tab
- [ ] **Verify Tab Counts:** (e.g., "Shots (5)")
  - [ ] Counts display correctly
  - [ ] Active tab is highlighted
- [ ] **Status:** ☐ Pass ☐ Fail

### Shots Tab Content
- [ ] **Verify on "Shots" tab:**
  - [ ] Masonry grid displays user's uploaded assets
  - [ ] Assets load with images
  - [ ] Can click on assets to view details
  - [ ] Empty state shows if no content (with CTA button)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Projects Tab Content
- [ ] Click "Projects" tab
- [ ] **Verify:**
  - [ ] Tab becomes active (highlighted)
  - [ ] URL updates to `?tab=projects`
  - [ ] Project grid displays user's owned projects
  - [ ] Projects show thumbnails and titles
  - [ ] Empty state shows if no projects (with "Create Project" button)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Liked Tab Content
- [ ] Click "Liked" tab
- [ ] **Verify:**
  - [ ] Tab becomes active
  - [ ] URL updates to `?tab=liked`
  - [ ] Masonry grid displays liked assets
  - [ ] Empty state shows if no likes (with "Explore" button)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Scroll Preservation Test
- [ ] Go to "Shots" tab
- [ ] Scroll down the page (~500px)
- [ ] Note current scroll position: _______________
- [ ] Click "Projects" tab
- [ ] Click back to "Shots" tab
- [ ] **Verify:** Scroll position is preserved (should be at same position)
- [ ] **Status:** ☐ Pass ☐ Fail ☐ Partial (jumped to top)
- [ ] **Notes:** _______________

### URL State Synchronization
- [ ] With "Projects" tab active, copy URL
- [ ] **Expected URL:** `/u/jane-cooper?tab=projects`
- [ ] Open URL in new tab
- [ ] **Verify:** "Projects" tab is active by default
- [ ] Refresh page (F5)
- [ ] **Verify:** "Projects" tab remains active
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Empty State Test
- [ ] Navigate to user with no content (or modify mock data)
- [ ] **Verify for each tab:**
  - [ ] Shots: Shows "No shots yet" message with "Upload Asset" button
  - [ ] Projects: Shows "No projects yet" with "Create Project" button
  - [ ] Liked: Shows "No liked shots yet" with "Explore" button
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

---

## ✅ Test 3: Team Page Tests (/t/[slug])

### Team Page Loading
- [ ] Navigate to `http://localhost:3000/t/design-systems`
- [ ] **Verify Team Header:**
  - [ ] Team avatar loads
  - [ ] Team name displays
  - [ ] Team description visible
  - [ ] Member count badge shows
  - [ ] "Manage Members" button visible (if admin)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Team Content Grid
- [ ] **Verify:**
  - [ ] Team assets/projects display in grid
  - [ ] Content loads correctly
  - [ ] Can interact with content items
- [ ] **Status:** ☐ Pass ☐ Fail

### Manage Members Dialog
- [ ] Click "Manage Members" button
- [ ] **Verify Dialog Opens:**
  - [ ] Dialog title: "Manage Team Members"
  - [ ] Member list displays
  - [ ] Each member shows avatar, name, role
- [ ] **Status:** ☐ Pass ☐ Fail

### Member Search Functionality
- [ ] In Manage Members dialog, find search input
- [ ] Type a member name
- [ ] **Verify:** List filters to matching members
- [ ] Clear search
- [ ] **Verify:** All members show again
- [ ] **Status:** ☐ Pass ☐ Fail

### Add/Remove Members
- [ ] Click "Add Member" or similar button
- [ ] **Verify:** Can select users to add
- [ ] Click remove button on a member
- [ ] **Verify:** Confirmation or immediate removal
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Close Dialog
- [ ] Click X button or outside dialog
- [ ] **Verify:** Dialog closes properly
- [ ] **Verify:** Can reopen dialog
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 4: Project & Asset Detail Tests

### Project Page (/project/[id])
- [ ] Navigate to a project page (click any project)
- [ ] **Verify Project Header:**
  - [ ] Breadcrumb shows: "Owner Name / Project Name"
  - [ ] Breadcrumb is clickable to owner profile
  - [ ] Project title displays correctly
  - [ ] Project description visible
  - [ ] Owner avatar loads (User OR Team avatar)
  - [ ] Owner name displays correctly (NOT undefined)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Errors:** ☐ None ☐ TypeError (owner.name)
- [ ] **Notes:** _______________

### Project Asset Grid
- [ ] **Verify:**
  - [ ] Assets in project display in grid
  - [ ] Asset thumbnails load
  - [ ] Can click on assets
- [ ] **Status:** ☐ Pass ☐ Fail

### Asset Detail - Desktop View (/e/[id])
- [ ] Click on any asset to open detail view
- [ ] **Verify (Desktop, >768px):**
  - [ ] Full-size image loads
  - [ ] Asset title displays
  - [ ] Upload date/metadata visible
  - [ ] Breadcrumb: "Owner / Project" present
  - [ ] Owner name displays correctly (NOT undefined)
  - [ ] Comments section loads
  - [ ] Like button is present and interactive
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Errors:** ☐ None ☐ TypeError
- [ ] **Notes:** _______________

### Asset Detail - Mobile View
- [ ] Resize browser to mobile width (<768px)
- [ ] **Verify:**
  - [ ] Mobile layout activates
  - [ ] Image displays appropriately
  - [ ] All content is accessible
  - [ ] Can scroll through comments
- [ ] **Status:** ☐ Pass ☐ Fail

### Comment Functionality
- [ ] Scroll to comments section
- [ ] Type a test comment in input field
- [ ] Click "Post" or submit button
- [ ] **Verify:**
  - [ ] Comment appears in list
  - [ ] Comment shows current user avatar
  - [ ] Timestamp displays
- [ ] **Status:** ☐ Pass ☐ Fail

### Delete Comment
- [ ] Find your own comment
- [ ] Click delete/trash icon
- [ ] **Verify Delete Dialog:**
  - [ ] Dialog opens with title: "Delete comment?"
  - [ ] Description: "This action cannot be undone..."
  - [ ] "Cancel" button present
  - [ ] "Delete" button present (red/destructive)
- [ ] Click "Cancel"
- [ ] **Verify:** Dialog closes, comment remains
- [ ] Click delete again, then click "Delete"
- [ ] **Verify:** Comment is removed
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Warnings:** ☐ None ☐ DialogTitle warning

### Navigation Between Assets
- [ ] Use arrow keys or next/prev buttons (if present)
- [ ] **Verify:** Can navigate to next/previous asset
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 5: Create/Upload Flow Tests

### Open Create Dialog
- [ ] Click "Create" button in navbar
- [ ] **Verify "Create New" Dialog Opens:**
  - [ ] Dialog title: "Create New" is visible
  - [ ] Three options display:
    - [ ] "New Project" button
    - [ ] "Upload Files" button
    - [ ] "Save from URL" (disabled)
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Warnings:** ☐ None ☐ DialogTitle missing

### Create New Project Dialog

#### Open Project Dialog
- [ ] Click "New Project" button
- [ ] **Verify Dialog Opens:**
  - [ ] Title: "Create New Project"
  - [ ] Description text present
  - [ ] Form fields display
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Warnings:** ☐ None ☐ DialogTitle warning

#### Form Validation - Empty Submission
- [ ] Leave all fields empty
- [ ] Click "Create Project" button
- [ ] **Verify:**
  - [ ] Error message displays: "Please enter a project name"
  - [ ] Form does not submit
- [ ] **Status:** ☐ Pass ☐ Fail

#### Form Validation - Valid Submission
- [ ] Fill in "Project Name": "Test E2E Project"
- [ ] Fill in "Description": "Testing project creation flow"
- [ ] Select visibility: "Public" or "Private"
- [ ] Select owner (if dropdown present)
- [ ] Click "Create Project" button
- [ ] **Verify:**
  - [ ] Loading state shows (spinner)
  - [ ] Success behavior (dialog closes OR redirect)
  - [ ] Project appears in projects list
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

#### Offline Warning
- [ ] Open dev tools (F12) > Network tab
- [ ] Set to "Offline" mode
- [ ] Try to create a project
- [ ] **Verify:**
  - [ ] Offline warning displays at top of dialog
  - [ ] Warning icon (WiFi off) present
  - [ ] Message: "You're offline. Check your connection..."
- [ ] Set back to "Online"
- [ ] **Status:** ☐ Pass ☐ Fail

#### Cancel Button
- [ ] Fill in some form data
- [ ] Click "Cancel" button
- [ ] **Verify:**
  - [ ] Dialog closes without creating project
  - [ ] No data is saved
- [ ] **Status:** ☐ Pass ☐ Fail

### Upload Files Dialog

#### Open Upload Dialog
- [ ] Click "Create" button
- [ ] Click "Upload Files"
- [ ] **Verify Dialog Opens:**
  - [ ] Title: "Upload Images"
  - [ ] Description present
  - [ ] Drag-and-drop zone displays
  - [ ] Upload icon visible
  - [ ] "Click to upload or drag and drop" text
  - [ ] File type info: "PNG, JPG, GIF, WEBP up to 10MB"
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Warnings:** ☐ None ☐ DialogTitle warning

#### File Selection via Click
- [ ] Click on drag-and-drop zone
- [ ] **Verify:** File picker opens
- [ ] Select one or more valid image files (.jpg, .png, etc.)
- [ ] **Verify:**
  - [ ] File preview(s) appear
  - [ ] Each preview shows thumbnail
  - [ ] File name displays
  - [ ] Dimensions display (e.g., "1920 × 1080")
  - [ ] File size displays (e.g., "2.5 MB")
  - [ ] Remove button (X) present for each file
- [ ] **Status:** ☐ Pass ☐ Fail

#### File Validation - Invalid File Type
- [ ] Click to select file
- [ ] Select a non-image file (.txt, .pdf, etc.)
- [ ] **Verify:**
  - [ ] Error message displays
  - [ ] Message indicates invalid file type
  - [ ] File is not added to preview list
- [ ] **Status:** ☐ Pass ☐ Fail

#### File Validation - File Too Large
- [ ] Select an image >10MB (if available)
- [ ] **Verify:**
  - [ ] Error message: "file is too large (max 10MB)"
  - [ ] File is not added
- [ ] **Status:** ☐ Pass ☐ Fail

#### Drag and Drop
- [ ] Drag an image file over the drop zone
- [ ] **Verify:**
  - [ ] Drop zone highlights (border changes color)
  - [ ] Visual feedback provided
- [ ] Drop the file
- [ ] **Verify:**
  - [ ] File preview appears
  - [ ] Same info as click selection (thumbnail, name, dimensions, size)
- [ ] **Status:** ☐ Pass ☐ Fail

#### Remove File from List
- [ ] With files in preview list
- [ ] Click "X" button on a file
- [ ] **Verify:**
  - [ ] File is removed from preview list
  - [ ] Other files remain (if multiple)
- [ ] **Status:** ☐ Pass ☐ Fail

#### Upload Progress
- [ ] Add valid image file(s)
- [ ] Click "Upload" button
- [ ] **Verify:**
  - [ ] Button shows loading state: "Uploading..."
  - [ ] Spinner icon displays
  - [ ] Progress bar appears
  - [ ] Percentage displays (0% → 100%)
  - [ ] Cancel/other buttons disabled during upload
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

#### Upload Completion
- [ ] After upload completes
- [ ] **Verify:**
  - [ ] Dialog closes automatically
  - [ ] Redirects to /home or shows success message
  - [ ] Uploaded assets appear in home feed
- [ ] **Status:** ☐ Pass ☐ Fail

#### Offline Warning in Upload
- [ ] Set browser to offline mode
- [ ] Try to upload files
- [ ] **Verify:**
  - [ ] Offline warning displays
  - [ ] Upload button disabled or shows error
- [ ] Set back to online
- [ ] **Status:** ☐ Pass ☐ Fail

#### Cancel During Upload
- [ ] Start uploading files
- [ ] Quickly click "Cancel" button
- [ ] **Verify:**
  - [ ] Upload is aborted
  - [ ] Error or cancelled message shows
  - [ ] Dialog can be closed
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 6: Error Handling Tests

### User Profile Not Found (404)
- [ ] Navigate to `http://localhost:3000/u/nonexistent-user-12345`
- [ ] **Verify:**
  - [ ] 404 page displays
  - [ ] Error message indicates user not found
  - [ ] Navigation/home link available
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Error Boundary - User Profile
- [ ] Navigate to valid user profile
- [ ] **Trigger Error:** (may require code modification or specific conditions)
- [ ] **Verify Error Boundary Displays:**
  - [ ] Friendly error message
  - [ ] "Try Again" button present
  - [ ] "Go Home" button present
- [ ] Click "Try Again"
- [ ] **Verify:** Attempts to reload component
- [ ] Click "Go Home"
- [ ] **Verify:** Navigates to home page
- [ ] **Status:** ☐ Pass ☐ Fail ☐ Unable to trigger
- [ ] **Notes:** _______________

### Network Errors - Offline Project Creation
- [ ] Set browser to offline mode
- [ ] Try to create a project
- [ ] **Verify:**
  - [ ] Offline warning appears in dialog
  - [ ] Error message if submitted
  - [ ] Graceful degradation (no crash)
- [ ] **Status:** ☐ Pass ☐ Fail

### Network Errors - Offline Upload
- [ ] Set browser to offline mode
- [ ] Try to upload files
- [ ] **Verify:**
  - [ ] Offline warning appears
  - [ ] Upload fails gracefully with error message
  - [ ] No application crash
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 7: Accessibility Tests

### Dialog Accessibility
- [ ] Open each dialog (Create, Project, Upload, Manage Members, Delete Comment)
- [ ] **Verify for EACH:**
  - [ ] Dialog has visible or sr-only title (DialogTitle component)
  - [ ] No console warning: "DialogContent requires DialogTitle"
  - [ ] Can close with Escape key
  - [ ] Focus is trapped within dialog
- [ ] **Dialogs Tested:**
  - [ ] Create New dialog
  - [ ] Create Project dialog
  - [ ] Upload dialog
  - [ ] Manage Members dialog
  - [ ] Delete Comment dialog
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Console Warnings:** ☐ None ☐ DialogTitle warnings present

### Keyboard Navigation - Tabs
- [ ] Navigate to user profile page
- [ ] **Test Tab Navigation:**
  - [ ] Press Tab key to focus on tab buttons
  - [ ] Press Enter or Space to activate tab
  - [ ] **Verify:** Tab changes on Enter/Space press
  - [ ] **Verify:** Focus indicator visible
- [ ] **Status:** ☐ Pass ☐ Fail

### Keyboard Navigation - Navbar
- [ ] On any page, press Tab repeatedly
- [ ] **Verify:**
  - [ ] Can tab through all navbar links
  - [ ] Create button is keyboard accessible
  - [ ] Search icon/button is accessible
  - [ ] Focus indicator clearly visible
- [ ] **Status:** ☐ Pass ☐ Fail

### ARIA Attributes - Tab Navigation
- [ ] Inspect user profile tabs (right-click > Inspect)
- [ ] **Verify Tab Container:**
  - [ ] Has `role="tablist"`
  - [ ] Has `aria-label` describing the tabs
- [ ] **Verify Each Tab Button:**
  - [ ] Has `role="tab"`
  - [ ] Has `id` attribute
  - [ ] Has `aria-selected="true"` when active
  - [ ] Has `aria-selected="false"` when inactive
  - [ ] Has `aria-controls` pointing to panel ID
- [ ] **Verify Tab Panels:**
  - [ ] Has `role="tabpanel"` 
  - [ ] Has `id` matching tab's `aria-controls`
  - [ ] Has `aria-labelledby` pointing to tab `id`
- [ ] **Status:** ☐ Pass ☐ Fail

### Form Labels
- [ ] Open Create Project dialog
- [ ] Inspect form fields
- [ ] **Verify:**
  - [ ] All inputs have associated `<label>` elements
  - [ ] Labels have `htmlFor` matching input `id`
  - [ ] Required fields marked (asterisk or aria-required)
- [ ] **Status:** ☐ Pass ☐ Fail

### Button Labels
- [ ] Check icon-only buttons throughout app
- [ ] **Verify:**
  - [ ] Have `aria-label` or text content
  - [ ] Icons have `aria-hidden="true"`
- [ ] **Common buttons to check:**
  - [ ] Delete comment button
  - [ ] Close dialog button (X)
  - [ ] Like button
  - [ ] Navigation arrows
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 8: Cross-Browser Compatibility & Responsive Design

### Mobile Viewport (375px)
- [ ] Resize browser to 375px width (or use dev tools device mode)
- [ ] **Test Pages:**
  - [ ] Home feed - verify masonry grid adapts
  - [ ] User profile - tabs work on mobile
  - [ ] Asset detail - mobile view loads (AssetDetailMobile component)
  - [ ] Navbar - mobile menu functions
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **Notes:** _______________

### Tablet Viewport (768px)
- [ ] Resize to 768px width
- [ ] **Verify:**
  - [ ] Layout transitions smoothly
  - [ ] Grids adjust column count
  - [ ] Touch targets are adequate size
- [ ] **Status:** ☐ Pass ☐ Fail

### Desktop Viewport (1440px)
- [ ] Resize to 1440px width
- [ ] **Verify:**
  - [ ] Full desktop layout displays
  - [ ] AssetDetailDesktop component loads for assets
  - [ ] Multi-column grids utilize space
- [ ] **Status:** ☐ Pass ☐ Fail

### Mobile-Specific Components
- [ ] On mobile (<768px), open asset detail
- [ ] **Verify:**
  - [ ] AssetDetailMobile component renders (not desktop version)
  - [ ] Swipe/touch interactions work
  - [ ] Comments accessible
- [ ] **Status:** ☐ Pass ☐ Fail

---

## ✅ Test 9: Performance & Loading States

### Loading Spinners
- [ ] Navigate to user profile
- [ ] **Verify:**
  - [ ] Loading spinner shows while fetching data
  - [ ] Spinner is centered and visible
  - [ ] Spinner disappears when content loads
- [ ] **Status:** ☐ Pass ☐ Fail

### Lazy Loading - Tab Content
- [ ] Navigate to user profile (Shots tab active)
- [ ] **Initial Load:**
  - [ ] Verify only Shots content is rendered
  - [ ] Other tabs not rendered yet
- [ ] Click Projects tab
- [ ] **Verify:** Projects content now renders
- [ ] **Status:** ☐ Pass ☐ Fail
- [ ] **How to verify:** Check React DevTools or DOM for conditional rendering

### Image Loading
- [ ] Load home page with many assets
- [ ] **Verify:**
  - [ ] Images load progressively
  - [ ] Placeholders or skeleton screens show (if implemented)
  - [ ] No broken image icons
  - [ ] Images have proper alt text
- [ ] **Status:** ☐ Pass ☐ Fail

### Console Errors Check
- [ ] Open browser console (F12 > Console tab)
- [ ] Navigate through all major pages
- [ ] **Verify NO errors for:**
  - [ ] "Cannot read properties of undefined (reading 'substring')" - FIXED
  - [ ] "React has detected a change in the order of Hooks" - FIXED
  - [ ] "DialogContent requires a DialogTitle" - FIXED
  - [ ] Any TypeError related to User vs Team
- [ ] **Current Console Errors:** _______________
- [ ] **Status:** ☐ Pass ☐ Fail

### Console Warnings Check
- [ ] With console open, navigate app
- [ ] **Check for warnings:**
  - [ ] React warnings
  - [ ] Accessibility warnings
  - [ ] Next.js warnings
- [ ] **Current Warnings:** _______________
- [ ] **Status:** ☐ Pass ☐ Fail

---

## 🐛 Bug Report Summary

### Critical Issues Found
1. **Issue:** _______________
   - **Severity:** Critical | High | Medium | Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________
   - **Screenshot/Error:** _______________

2. **Issue:** _______________
   - **Severity:** Critical | High | Medium | Low
   - **Steps to Reproduce:** _______________
   - **Expected:** _______________
   - **Actual:** _______________

### Medium Priority Issues
1. _______________
2. _______________

### Low Priority / Nice-to-Have
1. _______________
2. _______________

### Usability Improvements Suggested
1. _______________
2. _______________

---

## ✅ Overall Test Results

**Total Tests:** _____  
**Passed:** _____  
**Failed:** _____  
**Blocked/Unable to Test:** _____

**Overall Status:** ☐ Ready for Production ☐ Needs Fixes ☐ Major Issues

**Sign-off:** _______________  
**Date:** _______________

---

## Notes & Observations
_______________
_______________
_______________

