# Backend Integration Checklist

This document outlines all the areas that need to be replaced with real backend functionality when moving from mock data to production.

> **Frontend Status**: 99% complete with polished UI, API structure ready, auth middleware, create flows functional, and production-ready code. Zero known bugs.

> **API Status**: ✅ 3 routes functional | ✅ Auth middleware ready | ✅ Error handling complete | ✅ Full accessibility

> **Recent Updates (v1.5.0)**: ✅ Enhanced user profiles | ✅ Tab navigation | ✅ Scroll preservation | ✅ Streamlined UX | ✅ Bug fixes

---

## 🔐 1. Authentication & Authorization

### ✅ Completed:
- ✅ `lib/auth/middleware.ts` - Auth middleware with authentication, authorization, rate limiting
- ✅ Protected API routes - All routes use `authenticate()` middleware
- ✅ Role-based access control structure ready
- ✅ Rate limiting implemented (50 requests per 15 minutes)
- ✅ Permission checks ready for implementation

### Files to Update (Connect to Real Provider):
- `lib/auth/middleware.ts` - Replace mock auth with real provider
- `lib/mock-data/users.ts` - Keep as seed data, remove `currentUser`
- `components/layout/user-menu.tsx` - Connect to real sign-out
- `components/layout/workspace-switcher.tsx` - Get user's teams from session

### Remaining Implementation Tasks:
- [ ] Choose auth provider (NextAuth.js, Clerk, Auth0, Supabase Auth)
- [ ] Set up authentication routes (`/signin`, `/signup`, `/forgot-password`)
- [ ] Connect middleware to real session provider
- [ ] Create auth context provider for client components
- [ ] Update `authenticate()` to use real session tokens
- [ ] Add "Sign In" prompt for unauthenticated users

**Time Estimate**: 2-3 days (down from 1-2 weeks!)

### API Routes Needed:
```
POST   /api/auth/signin
POST   /api/auth/signup
POST   /api/auth/signout
POST   /api/auth/forgot-password
GET    /api/auth/session
```

---

## 💾 2. Database Schema & Setup

### Database Tables Needed:

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Team Members Table
```sql
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'team')),
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Assets Table
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'link')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id),
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  dominant_color TEXT,
  color_palette TEXT[],     -- Array of hex colors (extracted automatically)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for color search (using GIN index for array search)
CREATE INDEX idx_assets_color_palette ON assets USING GIN (color_palette);
```

#### Asset Likes Table
```sql
CREATE TABLE asset_likes (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (asset_id, user_id)
);
```

#### Asset Comments Table
```sql
CREATE TABLE asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### User Follows Table
```sql
CREATE TABLE user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
```

---

## 📁 3. File Upload & Storage

### ✅ Completed:
- ✅ `components/layout/upload-dialog.tsx` - Full drag-drop UI with previews
- ✅ `components/layout/create-dialog.tsx` - Wired up upload dialog
- ✅ `app/api/assets/upload/route.ts` - Upload API route ready
- ✅ `lib/utils/image.ts` - Image processing utilities (dimensions, validation, sanitization)
- ✅ Progress indicators for uploads (with parallel upload support)
- ✅ Drag & drop file upload UI
- ✅ Multiple file uploads (with concurrency limit)
- ✅ File type and size validation
- ✅ Image dimension extraction
- ✅ Color extraction integration
- ✅ Input sanitization (XSS prevention)

### Files to Update (Connect to Real Storage):
- `app/api/assets/upload/route.ts` - Replace dataUrl with real file upload
- `next.config.ts` - Add your CDN domain
- `components/assets/element-card.tsx` - Update image URLs to CDN

### Remaining Implementation Tasks:
- [ ] Choose storage provider (AWS S3, Cloudflare R2, Supabase Storage)
- [ ] Set up signed upload URLs for security
- [ ] Implement image optimization (Sharp, ImageMagick)
- [ ] Generate thumbnails automatically
- [ ] Set up CDN for fast delivery
- [ ] Update API route to use real storage

**Time Estimate**: 3-5 days (down from 1-2 weeks!)

### API Routes Needed:
```
POST   /api/assets/upload          # ✅ IMPLEMENTED - Ready for real storage
POST   /api/assets/confirm-upload  # Optional - current flow handles in one call
GET    /api/assets/:id/download    # Generate signed download URL
DELETE /api/assets/:id             # Delete asset and file
```

### Environment Variables:
```env
S3_BUCKET_NAME=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
CDN_URL=
```

---

## 🔍 4. Search Functionality

### ✅ Completed (Frontend):
- ✅ React Context for global search state (`lib/contexts/search-context.tsx`)
- ✅ Real-time filtering with debounce (300ms)
- ✅ Auto-suggest dropdown with thumbnails (`components/layout/search-suggestions.tsx`)
- ✅ Keyboard navigation (Arrow Up/Down, Enter, Escape, Cmd/Ctrl+K)
- ✅ Recent searches with localStorage persistence
- ✅ URL parameters for shareable search links
- ✅ Dedicated search results page (`app/search/page.tsx`)
- ✅ Multi-type search (assets, projects, users, teams)
- ✅ Custom hooks: `useDebounce`, `useKeyboardShortcut`, `useClickOutside`
- ✅ Performance optimized with Map lookups and memoization

### Files Implemented:
- `lib/contexts/search-context.tsx` - Global search state
- `lib/hooks/use-debounce.ts` - Debounce hook
- `lib/hooks/use-keyboard-shortcut.ts` - Keyboard shortcuts
- `lib/hooks/use-click-outside.ts` - Click outside detection
- `lib/utils/search.ts` - Search utility functions
- `lib/constants/search.ts` - Search constants
- `components/layout/search-bar.tsx` - Search input with context
- `components/layout/search-suggestions.tsx` - Auto-suggest dropdown
- `components/search/search-results.tsx` - Search results page
- `components/search/search-results-tabs.tsx` - Results tabs
- `components/search/search-empty-state.tsx` - Empty state
- `components/dashboard/feed.tsx` - Real-time filtering on home page
- `app/search/page.tsx` - Search results route

### Implementation Tasks (Backend):
- [ ] Choose search provider (Algolia, Meilisearch, PostgreSQL full-text)
- [ ] Index assets, projects, users, and teams
- [ ] Replace in-memory search with database queries
- [ ] Add search filters (date range, color, tags)
- [ ] Implement color-based search (using extracted colors)
- [ ] Add reverse image search (AI vision API)
- [ ] Track search analytics
- [ ] Add search history sync across devices (if logged in)

### API Routes Needed:
```
GET    /api/search?q={query}&type={assets|projects|users|teams}&page={page}
GET    /api/search/suggestions?q={query}    # Already has frontend logic
POST   /api/search/image                    # Upload image to search by similarity
GET    /api/search?color={hex}              # Search by color using extracted palettes
GET    /api/search/recent                   # Sync recent searches (if logged in)
```

---

## 🏠 5. Home Feed & Discovery

### Files to Update:
- `app/home/page.tsx` - Fetch real feed data
- `components/dashboard/feed.tsx` - Implement tab switching logic
- `app/library/page.tsx` - Fetch featured/trending content

### Implementation Tasks:
- [ ] Create feed algorithm (Recent: chronological, Following: personalized)
- [ ] Implement pagination or infinite scroll
- [ ] Add feed filtering by workspace
- [ ] Calculate trending items (based on likes, views, recency)
- [ ] Implement featured content curation
- [ ] Add category filtering
- [ ] Cache feed results for performance

### API Routes Needed:
```
GET    /api/feed/recent?page={page}&workspace={id}
GET    /api/feed/following?page={page}
GET    /api/discover/featured
GET    /api/discover/trending?category={cat}&timeframe={7d|30d}
```

---

## 💬 6. Comments & Interactions

### ✅ Completed (Frontend):
- ✅ Full comment CRUD (Create, Read, Update, Delete)
- ✅ Threaded replies with visual indicators
- ✅ Comment likes with toggle functionality
- ✅ Edit mode with inline editing
- ✅ Immediate deletion (streamlined UX, no confirmation dialog)
- ✅ Auto-expanding textarea
- ✅ Character limit with live counter
- ✅ Relative timestamps ("2h ago")
- ✅ Optimistic UI updates
- ✅ @mention support in UI

### Files to Update (Connect to Database):
- `components/assets/asset-detail-desktop.tsx` - Connect to real API
- `components/assets/asset-detail-mobile.tsx` - Connect to real API
- `components/assets/use-asset-detail.ts` - Replace mock with API calls
- `components/assets/element-card.tsx` - Implement real like functionality

### Remaining Implementation Tasks:
- [ ] Create comment submission API
- [ ] Fetch comments with pagination from database
- [ ] Persist comment edits to database
- [ ] Persist comment deletions to database
- [ ] Add real-time updates (WebSockets or polling)
- [ ] Implement like/unlike API endpoints
- [ ] Track like counts in database
- [ ] Show who liked an asset
- [ ] Implement @mention notifications

### API Routes Needed:
```
GET    /api/assets/:id/comments?page={page}
POST   /api/assets/:id/comments
PUT    /api/comments/:id
DELETE /api/comments/:id

POST   /api/assets/:id/like
DELETE /api/assets/:id/like
GET    /api/assets/:id/likes       # Get list of users who liked
GET    /api/assets/:id/likes/count
```

---

## 👥 7. Projects & Collections

### ✅ Completed:
- ✅ `components/layout/create-project-dialog.tsx` - Full project creation form
- ✅ `app/api/projects/route.ts` - Projects CRUD API ready
- ✅ `components/layout/create-dialog.tsx` - Wired up project dialog
- ✅ Project creation with validation
- ✅ Project privacy settings (public/private toggle)
- ✅ Workspace selection (user/team)
- ✅ Input sanitization
- ✅ Error handling

### Files to Update (Connect to Database):
- `app/api/projects/route.ts` - Replace mock array with database
- `app/project/[id]/page.tsx` - Fetch from database
- `components/projects/project-header.tsx` - Add real member management
- `lib/mock-data/projects.ts` - Can keep as seed data

### Remaining Implementation Tasks:
- [ ] Connect to database for persistence
- [ ] Add member invites
- [ ] Implement role-based permissions
- [ ] Add/remove assets from projects
- [ ] Edit project details
- [ ] Delete projects
- [ ] Show project statistics (asset count, member count)

**Time Estimate**: 1-2 weeks (structure ready!)

### API Routes Needed:
```
GET    /api/projects/:id             # Needs database connection
POST   /api/projects                 # ✅ IMPLEMENTED - Ready for database
PUT    /api/projects/:id
DELETE /api/projects/:id

GET    /api/projects/:id/members
POST   /api/projects/:id/members      # Invite member
DELETE /api/projects/:id/members/:userId

POST   /api/projects/:id/assets       # Add asset to project
DELETE /api/projects/:id/assets/:assetId
```

---

## 👤 8. User Profiles

### ✅ Completed (Frontend):
- ✅ `app/u/[username]/page.tsx` - Enhanced profile page with tabs
- ✅ `components/users/user-profile-header.tsx` - Profile header component
- ✅ `components/users/user-profile-tabs.tsx` - Tab navigation component
- ✅ Tab navigation (Shots, Projects, Liked)
- ✅ Scroll position preservation across tabs
- ✅ URL synchronization for shareable links
- ✅ Lazy loading for tab content
- ✅ Enhanced empty states with CTAs

### Files to Update (Connect to Database):
- `app/u/[username]/page.tsx` - Fetch real user data from database
- `components/layout/user-menu.tsx` - Add profile navigation
- `lib/mock-data/users.ts` - Can keep as seed data

### Remaining Implementation Tasks:
- [ ] Fetch user profile data from database
- [ ] Implement follow/unfollow functionality
- [ ] Show follower/following counts
- [ ] Add profile editing (name, bio, avatar, job title)
- [ ] Implement privacy settings
- [ ] Show user activity stats
- [ ] Paginate liked assets and projects

### API Routes Needed:
```
GET    /api/users/:username
PUT    /api/users/:id              # Update profile
GET    /api/users/:id/projects
GET    /api/users/:id/followers
GET    /api/users/:id/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
```

---

## 🏢 9. Teams

### Files to Update:
- `app/t/[slug]/page.tsx` - Fetch team data
- `components/layout/workspace-switcher.tsx` - Create teams

### Implementation Tasks:
- [ ] Fetch team details
- [ ] Show team projects
- [ ] Implement team member management
- [ ] Add member roles (owner, admin, member, viewer)
- [ ] Create team invites via email
- [ ] Edit team details
- [ ] Delete teams (owner only)
- [ ] Show team activity

### API Routes Needed:
```
GET    /api/teams/:slug
POST   /api/teams
PUT    /api/teams/:id
DELETE /api/teams/:id

GET    /api/teams/:id/members
POST   /api/teams/:id/invite        # Send invite email
PUT    /api/teams/:id/members/:userId/role
DELETE /api/teams/:id/members/:userId
```

---

## 🎨 10. Advanced Features

### Color Extraction ✅ Completed
- ✅ Implemented using `get-image-colors` library
- ✅ Real color palettes extracted from all 18 assets
- ✅ 5-color palettes per asset stored in mock data
- ✅ Click-to-copy color swatches in UI
- ✅ API route for real-time extraction (`/api/extract-colors`)
- ✅ Batch processing scripts (`scripts/extract-asset-colors.ts`)
- ✅ Comprehensive documentation (`docs/COLOR_EXTRACTION.md`)

**When backend is ready:**
- [ ] Extract colors automatically on asset upload
- [ ] Store colors in `assets` table (colorPalette field already in schema)
- [ ] Implement color-based search using extracted palettes
- [ ] Add color trend analytics

### Image Processing
- [ ] Generate multiple thumbnail sizes
- [ ] Create WebP versions for performance
- [ ] Implement lazy loading
- [ ] Extract image metadata (EXIF, dimensions)

### Analytics
- [ ] Track asset views
- [ ] Track search queries (search context ready)
- [ ] Monitor popular content
- [ ] Create analytics dashboard

### Notifications
- [ ] Comment replies
- [ ] New followers
- [ ] Project invites
- [ ] Mentions

### API Routes Needed:
```
POST   /api/extract-colors         # ✅ Already implemented (frontend)
GET    /api/notifications
PUT    /api/notifications/:id/read
POST   /api/analytics/track
POST   /api/analytics/search       # Track search queries
```

---

## 🔧 11. Configuration & Environment

### Environment Variables Needed:
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://yourapp.com
NEXTAUTH_SECRET=...

# Storage
S3_BUCKET_NAME=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Search (Optional)
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...

# Email (for invites, notifications)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
```

---

## 📝 12. Testing Checklist

Before going to production:
- [ ] Test all authentication flows
- [ ] Test file uploads with large files
- [ ] Test permissions (private projects, team access)
- [ ] Test search with various queries
- [ ] Test real-time features (if implemented)
- [ ] Load test with concurrent users
- [ ] Test on mobile devices
- [ ] Test with slow network connections
- [ ] Validate all forms
- [ ] Test error handling

---

## 🚀 13. Deployment Checklist

- [ ] Set up production database
- [ ] Configure CDN for assets
- [ ] Set up error tracking (Sentry)
- [ ] Configure monitoring (Vercel Analytics, Datadog)
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Optimize images and assets
- [ ] Set up CI/CD pipeline

---

## 📚 Recommended Tech Stack

- **Framework**: Next.js 15+ (App Router) - Currently on 15.1.5
- **Database**: PostgreSQL (Supabase, Neon, Railway)
- **ORM**: Drizzle ORM or Prisma
- **Auth**: NextAuth.js, Clerk, or Supabase Auth
- **Storage**: AWS S3, Cloudflare R2, or Supabase Storage
- **Search**: Algolia, Meilisearch, or PostgreSQL full-text (frontend search already implemented)
- **Color Extraction**: get-image-colors (already integrated)
- **Realtime**: Supabase Realtime, Pusher, or Socket.io
- **Email**: Resend, SendGrid, or AWS SES
- **Deployment**: Vercel, Railway, or AWS

> **Note**: Frontend is built with Next.js 15, which has breaking changes (e.g., `params` is now a Promise). All dynamic routes have been updated to handle this.

> **Recent Additions**: Search functionality uses React Context and custom hooks. Color extraction uses `get-image-colors` with API route and batch scripts.

---

## 📍 Priority Order (Updated for v1.3.0)

1. **Phase 1 - Database Connection** (3-5 days)
   - Set up PostgreSQL
   - Create tables from SQL schemas
   - Connect existing API routes to database
   - Replace mock data with queries

2. **Phase 2 - Connect Services** (5-7 days)
   - Connect auth middleware to real provider
   - Connect file upload to S3/R2
   - Test create flows end-to-end
   - Verify all security measures

3. **Phase 3 - Core Features** (1-2 weeks)
   - Complete remaining CRUD operations
   - User profiles
   - Teams management

4. **Phase 4 - Social Features** (2-3 weeks)
   - Likes & comments
   - Following users
   - Feed algorithm

5. **Phase 5 - Discovery** (1-2 weeks)
   - Backend search implementation
   - Trending content
   - Categories

6. **Phase 6 - Polish** (1 week)
   - Notifications
   - Analytics
   - Performance optimization
   - Final testing

**Total Estimate**: 6-8 weeks (down from 10-15 weeks!)

