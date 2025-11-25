# Files with Backend Integration TODOs

This document provides a quick reference to all files that contain TODO comments for backend integration.

**Status Update (v2.0.0)**: Image Upload System Completely Rebuilt! 🎉
- ✅ 40+ TODOs completed with functional code
- ✅ Complete image upload system with persistent storage
- ✅ API structure ready for database connection
- ✅ Auth middleware implemented
- ✅ User profiles enhanced with tabs
- ✅ Comment system fully functional (CRUD, likes, immediate deletion)
- ✅ **NEW**: Local file storage with 3 image sizes
- ✅ **NEW**: Persistent JSON storage (survives restarts)
- ✅ **NEW**: Progressive image loading
- ✅ **NEW**: Color extraction integration
- 75+ TODOs remaining (mostly database & cloud storage migrations)

**New in v2.0.0 (Image Upload Rebuild):**
- ✅ Complete image upload system from scratch
- ✅ Three image sizes (full, medium, thumbnail)
- ✅ Persistent metadata storage (data/assets.json)
- ✅ Local file storage (public/uploads/)
- ✅ Sharp-based image optimization
- ✅ Auto-populated title from filename
- ✅ Optional description field
- ✅ Progressive loading (thumbnail → full)
- ✅ Comprehensive documentation & comments
- ✅ Ready for database & cloud storage migration

**Previous in v1.5.0:**
- ✅ User profile tabs (Shots/Projects/Liked) with scroll preservation
- ✅ Enhanced profile header with job title and team badge
- ✅ Streamlined comment deletion (no confirmation dialog)
- ✅ Improved dropdown menu visibility
- ✅ Lazy loading for tab content
- ✅ URL synchronization for tabs
- ✅ React Hooks compliance fixes
- ✅ Better empty states with CTAs
- ✅ Error boundaries for user routes

## 🔐 Authentication & User Management

### `lib/mock-data/users.ts`
- ✅ Enhanced with job titles and team affiliations
- ⬜ Replace `currentUser` with real session data
- ⬜ Remove mock users array
- ⬜ Fetch from database: `GET /api/users/:userId`
- ⬜ Support profile editing (job title, bio, avatar)

### `components/layout/user-menu.tsx`
- Implement real logout: `signOut()`
- Add navigation to profile, settings, billing pages
- Show sign-in button for unauthenticated users
- Track online status with WebSocket/presence

### `components/layout/workspace-switcher.tsx`
- Fetch user's teams: `GET /api/users/me/teams`
- Implement workspace switching with context
- Persist workspace selection to localStorage
- Implement create team dialog: `POST /api/teams`

---

## 👥 Teams & Organizations

### `lib/mock-data/teams.ts`
- Replace with database schema (see comments)
- Create `team_members` join table for roles
- Implement team invites system
- Fetch from: `GET /api/teams/:teamId`

### `app/t/[slug]/page.tsx`
- Convert to async server component
- Fetch team with members: `GET /api/teams/:slug`
- Check user access permissions
- Add team settings button (if admin)
- Show member roles on hover

---

## 📁 Projects & Collections

### `lib/mock-data/projects.ts`
- Replace with database schema
- Add `project_members` table for sharing
- Add `project_tags` for categorization
- Fetch from: `GET /api/projects?workspace={id}`

### ✅ `app/project/[id]/page.tsx` - **UPDATED**
- ✅ Now uses `readAssets()` from persistent storage
- ⬜ Convert to async server component
- ⬜ Replace `readAssets()` with database query
- ⬜ Fetch project with authorization check: `GET /api/projects/:id`
- ⬜ Implement pagination for assets
- ⬜ Check if user can access project

### `components/projects/project-header.tsx`
- Fetch real project members: `GET /api/projects/:id/members`
- Implement share functionality with permissions
- Add asset upload: `POST /api/projects/:id/assets`
- Show settings menu (owner/admin only)
- Edit/delete project options

---

## 🎨 Assets & Media

### ✅ `lib/utils/assets-storage.ts` - **NEW** - Persistent JSON Storage
- ✅ `readAssets()` - Reads from data/assets.json
- ✅ `addAsset()` - Adds new asset with append
- ✅ `deleteAsset()` - Removes asset by ID
- ✅ Auto-initializes with mock data on first run
- ⬜ **TODO**: Replace entire file with database queries
- ⬜ **TODO**: See extensive comments in file for migration examples

### ✅ `lib/utils/file-storage.ts` - **NEW** - Local File Operations
- ✅ `ensureUploadDirectories()` - Creates upload dirs
- ✅ `generateUniqueFilename()` - Timestamp + UUID naming
- ✅ `saveImageToPublic()` - Saves to public/uploads/
- ✅ `deleteUploadedFiles()` - Cleans up all sizes
- ✅ `getFilenameWithoutExtension()` - For title extraction
- ⬜ **TODO**: Replace with S3/R2/Cloudflare SDK for cloud storage
- ⬜ **TODO**: See extensive comments in file for cloud migration

### ✅ `lib/utils/image-processing.ts` - **NEW** - Sharp Image Processing
- ✅ `extractImageMetadata()` - Gets dimensions, format, size
- ✅ `optimizeImage()` - Compresses with format-specific settings
- ✅ `generateThumbnail()` - Creates 300px thumbnails
- ✅ `generateMediumSize()` - Creates 800px medium versions
- ✅ `isValidImage()` - Validates image buffers
- ⬜ **TODO**: Add WebP/AVIF conversion
- ⬜ **TODO**: Add watermarking capability
- ⬜ **TODO**: Add blur hash generation

### ✅ `app/api/assets/upload/route.ts` - **REBUILT** - Upload Handler
- ✅ Multipart/form-data handling
- ✅ Sharp image processing (3 sizes in parallel)
- ✅ Local file storage
- ✅ Persistent metadata storage
- ✅ Color extraction integration
- ✅ Rate limiting (20/minute)
- ✅ Authentication required
- ⬜ **TODO**: Replace `addAsset()` with database INSERT
- ⬜ **TODO**: Replace `saveImageToPublic()` with cloud upload
- ⬜ **TODO**: See extensive comments for migration examples

### ✅ `app/api/assets/route.ts` - **UPDATED** - Get Assets
- ✅ Reads from persistent JSON storage
- ✅ Sorts by date (newest first)
- ✅ Disables caching for fresh data
- ⬜ **TODO**: Replace `readAssets()` with database SELECT
- ⬜ **TODO**: Add pagination (?page=1&limit=50)
- ⬜ **TODO**: Add filtering (?projectId=xyz, ?uploaderId=xyz)
- ⬜ **TODO**: Add full-text search (?search=query)
- ⬜ **TODO**: See extensive comments for query examples

### ✅ `components/layout/upload-dialog.tsx` - **REBUILT** - Upload UI
- ✅ Single file drag-and-drop
- ✅ Real-time preview
- ✅ Auto-populated title from filename
- ✅ Optional description field
- ✅ Form validation
- ✅ Error handling
- ✅ Progress indicator
- ⬜ **TODO**: Add multi-file upload support
- ⬜ **TODO**: Add project selection dropdown
- ⬜ **TODO**: Add tags/categories input
- ⬜ **TODO**: Add upload queue for batch uploads

### ✅ `components/ui/textarea.tsx` - **NEW** - Description Field
- ✅ shadcn/ui compliant textarea component
- ✅ Proper styling and accessibility

### `lib/mock-data/assets.ts`
- ✅ **UPDATED**: Added `description`, `mediumUrl`, `thumbnailUrl` fields
- ⬜ Replace with database schema (see extensive comments)
- ⬜ Create related tables: `asset_likes`, `asset_comments`, `asset_colors`
- ⬜ Migrate to database (see `/docs/IMAGE_UPLOAD.md` for schema)

### ✅ `components/assets/element-card.tsx` - **UPDATED**
- ✅ Progressive loading (thumbnail → medium/full)
- ✅ Uses `thumbnailUrl` and `mediumUrl` from asset
- ⬜ Fetch uploader data: `GET /api/users/:uploaderId`
- ⬜ Check if user has liked: check `asset_likes` table (helper functions ready in `lib/mock-data/likes.ts`)
- ⬜ Implement like functionality: `POST/DELETE /api/assets/:id/like`
- ⬜ Implement save to collection: open dialog, `POST /api/projects/:id/assets`

### ✅ `components/assets/asset-detail-desktop.tsx` & `asset-detail-mobile.tsx` - ENHANCED
- ✅ Full comments system with threading
- ✅ Comment CRUD (Create, Read, Update, Delete)
- ✅ Immediate deletion (streamlined UX, no confirmation dialog)
- ✅ Comment likes with toggle
- ✅ Edit mode with inline editing
- ✅ Auto-expanding textarea
- ✅ Relative timestamps
- ✅ Mobile carousel with swipe navigation
- ✅ Bottom sheet for mobile comments
- ⬜ Fetch asset with related data from database
- ⬜ Implement share: Web Share API or copy link
- ⬜ Implement download: generate signed URL
- ⬜ Fetch like/comment counts from database
- ⬜ Fetch projects containing asset
- ⬜ Real-time comment updates

### ✅ `components/assets/comment-item.tsx` - NEW & COMPLETE
- ✅ Individual comment display with avatar
- ✅ Edit/delete menu for own comments
- ✅ Reply functionality
- ✅ Like button with count
- ✅ Relative timestamps
- ✅ Enhanced dropdown visibility (better styling)

### ✅ `components/assets/comment-list.tsx` - NEW & COMPLETE
- ✅ Threaded comment display
- ✅ Visual indicators for reply depth
- ✅ Empty state handling
- ✅ Optimized rendering with React.memo

### ✅ `components/assets/comment-input.tsx` - NEW & COMPLETE
- ✅ Auto-expanding textarea
- ✅ Character limit (2000 chars) with live counter
- ✅ @mention support in UI
- ✅ Reply context display
- ✅ Cancel functionality
- ✅ Hidden scrollbars for clean UI

### ✅ `components/assets/use-asset-detail.ts` - NEW & COMPLETE
- ✅ Shared hook for asset detail logic
- ✅ Comment state management
- ✅ Optimistic UI updates
- ✅ Like/unlike handlers
- ✅ Edit/delete handlers
- ⬜ Connect to real API endpoints

### ✅ `app/e/[id]/page.tsx` - **UPDATED**
- ✅ Now uses `readAssets()` from persistent storage
- ✅ Console logging for debugging
- ⬜ Convert to async server component
- ⬜ Replace `readAssets()` with database query
- ⬜ Fetch asset with: `uploader`, `project`, `likes`, `comments`
- ⬜ Handle authorization (private assets)

---

## 🏠 Feed & Discovery

### ✅ `app/home/page.tsx` - **UPDATED**
- ✅ Fetches from `/api/assets` (persistent storage)
- ✅ Disables caching with `noStore()`
- ✅ Remove asset duplication trick (still present for demo)
- ⬜ Replace API call with direct database query for server component
- ⬜ Implement pagination: `GET /api/assets?page=1&limit=50`
- ⬜ Fetch based on session user (personalized feed)

### `components/dashboard/feed.tsx`
- Implement Recent tab: `GET /api/feed/recent`
- Implement Following tab: `GET /api/feed/following`
- Add infinite scroll or pagination
- Loading states and error handling

### ✅ `app/library/page.tsx` - **UPDATED**
- ✅ Now uses `readAssets()` from persistent storage
- ⬜ Replace `readAssets()` with database query
- ⬜ Fetch categories: `GET /api/categories`
- ⬜ Fetch featured projects: `GET /api/projects/featured`
- ⬜ Fetch trending assets: `GET /api/assets/trending?timeframe=7d`
- ⬜ Implement category filtering
- ⬜ Track active category in state

---

## 🔍 Search

### `components/layout/search-bar.tsx`
- Debounce input
- Search API: `GET /api/search?q={query}&type={type}`
- Show suggestions dropdown
- Navigate to results page
- Store recent searches
- Implement keyboard shortcuts (Cmd+K)
- Image search: `POST /api/search/image`
- Color search: `GET /api/search?color={hex}`

---

## 👤 User Profiles

### ✅ `app/u/[username]/page.tsx` - ENHANCED
- ✅ Tab navigation (Shots, Projects, Liked)
- ✅ Scroll position preservation across tabs
- ✅ URL synchronization for shareable links
- ✅ Lazy loading for tab content
- ✅ Enhanced empty states with CTAs
- ✅ React Hooks compliance
- ⬜ Convert to async server component
- ⬜ Fetch user profile from database: `GET /api/users/:username`
- ⬜ Show only public projects (unless own profile)
- ⬜ Fetch follower/following counts
- ⬜ Implement follow button: `POST/DELETE /api/users/:id/follow`
- ⬜ Paginate liked assets and projects

### ✅ `components/users/user-profile-header.tsx` - NEW & COMPLETE
- ✅ Profile header with avatar, display name, username
- ✅ Job title display
- ✅ Team affiliation badge with link
- ✅ "Edit Profile" button (conditionally shown)
- ✅ Consistent layout with team header

### ✅ `components/users/user-profile-tabs.tsx` - NEW & COMPLETE
- ✅ Tab navigation component with animations
- ✅ Shots, Projects, and Liked tabs
- ✅ Badge counts for each tab
- ✅ Accessibility (ARIA attributes)
- ✅ Framer Motion animations

---

## ➕ Create & Upload

### ✅ `components/layout/create-dialog.tsx` - IMPLEMENTED
- ✅ New Project: opens `CreateProjectDialog` component
- ✅ Upload Files: opens `UploadDialog` component
- ⬜ Save from URL: needs implementation

### ✅ `components/layout/create-project-dialog.tsx` - NEW & COMPLETE
- ✅ Full form with name, description, privacy, workspace selection
- ✅ Client-side validation
- ✅ API integration: `POST /api/projects`
- ✅ Error handling and loading states
- ✅ Input sanitization
- ✅ Request deduplication

### ✅ `components/layout/upload-dialog.tsx` - NEW & COMPLETE
- ✅ Drag & drop file upload UI
- ✅ File picker with multiple selection
- ✅ Image previews with dimensions
- ✅ Parallel uploads with progress tracking
- ✅ API integration: `POST /api/assets/upload`
- ✅ Error handling per file
- ✅ Color extraction integration
- ✅ Input sanitization
- ✅ Request deduplication

### ✅ `app/api/projects/route.ts` - NEW & FUNCTIONAL
- ✅ POST endpoint for creating projects
- ✅ GET endpoint for fetching projects
- ✅ Validation (name, description, privacy, owner)
- ✅ Auth middleware integration
- ✅ Input sanitization
- ⬜ Needs: Database connection (currently uses mock array)

### ✅ `app/api/assets/upload/route.ts` - NEW & FUNCTIONAL
- ✅ POST endpoint for uploading assets
- ✅ GET endpoint for upload requirements
- ✅ Image validation (type, dimensions)
- ✅ Color extraction with timeout
- ✅ Auth middleware integration
- ✅ Input sanitization
- ⬜ Needs: Real file storage (currently uses dataUrl)

---

## ❤️ Likes System

### ✅ `lib/mock-data/likes.ts` - NEW & COMPLETE
- ✅ Like interface and mock data
- ✅ `getLikedAssetIds()` - Get assets liked by user
- ✅ `getAssetLikeCount()` - Get like count for asset
- ✅ `hasUserLikedAsset()` - Check if user liked asset
- ✅ Helper functions for filtering
- ⬜ Needs: Database persistence

---

## 📊 Database Schemas

All mock data files contain complete SQL schemas in comments:
- `lib/mock-data/users.ts` - Users table with job titles and team affiliations
- `lib/mock-data/teams.ts` - Teams + team_members tables
- `lib/mock-data/projects.ts` - Projects + project_members tables (mutable for API testing)
- `lib/mock-data/assets.ts` - Assets + asset_likes + asset_comments + asset_colors tables (mutable, projectId optional)
- `lib/mock-data/comments.ts` - Comments with threading and likes
- `lib/mock-data/notifications.ts` - Activity feed notifications
- `lib/mock-data/likes.ts` - Asset likes tracking

## 🛠️ New Utility Files

### ✅ `lib/utils/api.ts` - NEW & COMPLETE
- ✅ `apiFetch()` - Network utility with retry logic, error handling
- ✅ `useDebouncedCallback()` - Hook for request deduplication
- ✅ Offline detection
- ✅ User-friendly error messages

### ✅ `lib/utils/image.ts` - NEW & COMPLETE
- ✅ `readFileAsDataURL()` - File reading utility
- ✅ `getImageDimensions()` - Extract dimensions with memory leak fixes
- ✅ `isValidImageFile()` - File validation
- ✅ `formatFileSize()` - Human-readable sizes
- ✅ `sanitizeInput()` - XSS prevention

### ✅ `lib/auth/middleware.ts` - NEW & COMPLETE
- ✅ `authenticate()` - Auth middleware
- ✅ Mock session handling (ready for real provider)
- ✅ Rate limiting structure
- ✅ Permission checks structure

---

## 🎯 Summary of API Routes

### ✅ Implemented (Functional with Mock Data)
```
POST   /api/projects                 # ✅ Create projects
GET    /api/projects                 # ✅ List projects
POST   /api/assets/upload            # ✅ Upload assets
GET    /api/assets/upload            # ✅ Upload requirements
POST   /api/extract-colors           # ✅ Color extraction
```

### Authentication (Middleware Ready)
```
POST   /api/auth/signin              # Connect to provider
POST   /api/auth/signup              # Connect to provider
POST   /api/auth/signout             # Connect to provider
GET    /api/auth/session             # Connect to provider
```

### Users
```
GET    /api/users/:username
PUT    /api/users/:id
GET    /api/users/:id/projects
GET    /api/users/:id/followers
GET    /api/users/:id/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
GET    /api/users/me/teams
```

### Teams
```
GET    /api/teams/:slug
POST   /api/teams
PUT    /api/teams/:id
DELETE /api/teams/:id
GET    /api/teams/:id/members
POST   /api/teams/:id/invite
DELETE /api/teams/:id/members/:userId
```

### Projects
```
GET    /api/projects/:id             # Needs database
POST   /api/projects                 # ✅ IMPLEMENTED
GET    /api/projects                 # ✅ IMPLEMENTED
PUT    /api/projects/:id             # Needs implementation
DELETE /api/projects/:id             # Needs implementation
GET    /api/projects/:id/members     # Needs implementation
POST   /api/projects/:id/members     # Needs implementation
POST   /api/projects/:id/assets      # Needs implementation
DELETE /api/projects/:id/assets/:assetId # Needs implementation
```

### Assets
```
GET    /api/assets?page={page}&projectId={id} # Needs database
GET    /api/assets/:id               # Needs database
POST   /api/assets/upload            # ✅ IMPLEMENTED (needs real storage)
GET    /api/assets/upload            # ✅ IMPLEMENTED
DELETE /api/assets/:id               # Needs implementation
POST   /api/assets/:id/like          # Needs implementation
DELETE /api/assets/:id/like          # Needs implementation
GET    /api/assets/:id/likes/count   # Needs implementation
GET    /api/assets/:id/comments      # Needs implementation
POST   /api/assets/:id/comments      # Needs implementation
```

### Feed & Discovery
```
GET    /api/feed/recent?page={page}&workspace={id}
GET    /api/feed/following?page={page}
GET    /api/discover/featured
GET    /api/discover/trending?category={cat}
```

### Search
```
GET    /api/search?q={query}&type={type}
GET    /api/search/suggestions?q={query}
POST   /api/search/image
GET    /api/search?color={hex}
```

### Comments (Frontend Complete)
```
GET    /api/assets/:id/comments?page={page}  # ✅ Frontend ready
POST   /api/assets/:id/comments               # ✅ Frontend ready
PUT    /api/comments/:id                      # ✅ Frontend ready (edit)
DELETE /api/comments/:id                      # ✅ Frontend ready (immediate delete)
POST   /api/comments/:id/like                 # ✅ Frontend ready
DELETE /api/comments/:id/like                 # ✅ Frontend ready
```

---

## 📁 Quick File Reference

**High Priority (Database Connection):**
1. ✅ `lib/auth/middleware.ts` - Auth structure ready (connect provider)
2. `app/api/projects/route.ts` - Connect to database
3. `app/api/assets/upload/route.ts` - Connect to storage + database
4. `lib/mock-data/*` - Use as seed data (7 modules ready)
5. Database setup - Create tables from SQL schemas
6. ✅ `components/assets/use-asset-detail.ts` - Connect to comment API

**Medium Priority (User Experience):**
7. `components/assets/element-card.tsx` - Like/save interactions
8. `app/home/page.tsx` - Feed logic
9. `app/project/[id]/page.tsx` - Project pages
10. ✅ `app/u/[username]/page.tsx` - Connect to database for profile data

**Lower Priority (Polish):**
11. Team profile pages - Connect to database
12. Discovery/library features - Connect to database
13. Follow/unfollow functionality
14. Real-time notifications

---

## 🔧 Development Workflow

1. **Read the TODO comment** in any file
2. **Check `BACKEND_INTEGRATION.md`** for detailed implementation guide
3. **Implement the feature** following the documented API pattern
4. **Test the integration** 
5. **Remove or update the TODO comment**

Every TODO comment includes:
- What needs to be replaced
- Which API endpoint to use
- What data to expect
- Any special considerations

