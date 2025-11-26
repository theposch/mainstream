# 🤖 AI Agent Quick Start Guide

**Purpose**: Rapidly onboard an AI agent to this codebase  
**Time to read**: 5 minutes  
**Target**: LLMs like Claude, GPT-4, etc.

---

## ⚡ 30-Second Summary

**What**: Near-complete Cosmos.so clone (Pinterest-style design collaboration tool)  
**Status**: Frontend 99% + API structure ready, Database pending  
**Tech**: Next.js 15, TypeScript, Tailwind, shadcn/ui, Framer Motion, Embla Carousel, react-colorful  
**Data**: Mock data with SQL schemas + localStorage persistence (mutable for API testing)  
**APIs**: 5+ routes functional, auth middleware ready, error handling complete  
**TODOs**: 80+ inline comments (40+ completed!)  
**Docs**: 40,000+ words across documentation files  

**Your task**: Connect database OR enhance existing features

**Recent (v1.8.0)**: ✅ Streams feature (replaces Projects) | ✅ Many-to-many relationships | ✅ Semantic URLs | ✅ Hashtag mentions | ✅ localStorage persistence | ✅ Rich text input

**Previous (v1.7.0)**: ✅ Settings modal with tabs | ✅ Account/Notifications/Privacy/Connected accounts | ✅ Full form validation | ✅ Responsive design

---

## 📂 Critical Files (Read These First)

### 1. Mock Data (Understand the schema)
```
lib/mock-data/users.ts          - 4 users with job titles, SQL schema
lib/mock-data/teams.ts          - 3 teams, includes SQL schema  
lib/mock-data/streams.ts        - 8 streams (replaces projects), SQL schema
lib/mock-data/assets.ts         - 18 assets, includes SQL schema
lib/mock-data/comments.ts       - Comment system with likes, SQL schema
lib/mock-data/notifications.ts  - Activity feed, SQL schema
lib/mock-data/likes.ts          - Like tracking with helper functions
```
Each file has complete `CREATE TABLE` statements in comments.

**⚠️ IMPORTANT**: "Projects" have been replaced with "Streams" - a more flexible organizational unit that supports many-to-many relationships with assets.

### 2. Main Pages (Understand routing)
```
app/home/page.tsx          - Main feed, masonry grid
app/e/[id]/page.tsx        - Asset detail modal
app/stream/[slug]/page.tsx - Stream page (uses semantic URLs)
app/streams/page.tsx       - All streams listing
app/u/[username]/page.tsx  - User profile with tabs (Shots/Streams/Liked)
app/t/[slug]/page.tsx      - Team page
app/library/page.tsx       - Discover/browse
```

### 3. Key Components (Understand UI patterns)
```
components/assets/element-card.tsx           - Image card with hover
components/assets/masonry-grid.tsx           - Pinterest layout
components/assets/asset-detail.tsx           - Viewport detection wrapper
components/assets/asset-detail-desktop.tsx   - Desktop modal with keyboard nav
components/assets/asset-detail-mobile.tsx    - Mobile carousel with swipe
components/assets/comment-input.tsx          - Auto-expanding textarea with @mentions
components/assets/comment-item.tsx           - Individual comment with likes, edit/delete
components/assets/comment-list.tsx           - Threaded comments display
components/assets/use-asset-detail.ts        - Shared hook for asset logic
components/users/user-profile-header.tsx     - User profile header with avatar and details
components/users/user-profile-tabs.tsx       - Tab navigation for user profile
components/layout/navbar.tsx                 - Top navigation
components/layout/notifications-popover.tsx  - Activity feed popover
components/layout/search-bar.tsx             - Global search with real-time filtering
components/layout/color-search-dialog.tsx    - Color picker popover for color search
components/layout/workspace-switcher.tsx     - Team switcher
components/layout/settings-dialog.tsx        - Settings modal with tabbed interface
components/layout/user-menu.tsx              - User dropdown with settings integration
components/ui/bottom-sheet.tsx               - Mobile bottom sheet
components/error-boundary.tsx                - Error handling wrapper
lib/constants.ts                             - Centralized constants
lib/contexts/search-context.tsx              - Global search state management (includes color search)
lib/utils/time.ts                            - Relative time formatting
lib/utils/color.ts                           - Color matching, distance calculation, search utilities
lib/mock-data/likes.ts                       - Like data with helper functions
```

---

## 🎯 Data Model (Mental Map)

```
User (4 mock users)
  ├─ username, displayName, email, avatarUrl
  ├─ Personal Streams (owned by user)
  └─ Team Memberships
       └─ Team
            ├─ name, slug, memberIds[]
            └─ Team Streams (owned by team)
                 └─ Assets (many-to-many relationship)
                      ├─ title, url, width, height
                      ├─ uploaderId → User
                      └─ streamIds[] → Streams

Stream (NEW - replaces Projects)
  ├─ name: slug format (e.g., "ux-design", "ios-app")
  ├─ ownerType: 'user' | 'team'
  ├─ ownerId: userId or teamId
  ├─ isPrivate: boolean
  ├─ status: 'active' | 'archived'
  └─ Many-to-many with Assets via asset_streams table

Asset
  ├─ Dimensions: width, height (varied for masonry)
  ├─ streamIds: string[] (can belong to multiple streams)
  └─ Mock source: Unsplash URLs
```

**Key Insights**: 
- Everything is owned by either a User or Team
- **Streams replace Projects** - more flexible organizational unit
- **Assets can belong to multiple Streams** (many-to-many)
- **Stream names are slugs** - used directly in URLs (e.g., `/stream/ux-design`)

---

## 🔍 Finding Your Way Around

### Pattern: Pages Import → Components Render
```typescript
// Page fetches/imports data
import { assets } from "@/lib/mock-data/assets";

// Page renders components with data
<MasonryGrid assets={assets} />

// Component displays data
export function MasonryGrid({ assets }: Props) {
  return assets.map(asset => <ElementCard asset={asset} />);
}
```

### Pattern: TODO Comments Mark Integration Points
```typescript
// TODO: Replace with real API call
//   - Endpoint: GET /api/users/:userId
//   - Auth: Check session
//   - Returns: User object
const user = users.find(u => u.id === userId);
```

**Every file that needs backend has TODO comments like this.**

---

## 🎨 UI Patterns to Know

### 1. Masonry Grid (Pinterest Layout)
- Uses `react-masonry-css`
- Responsive columns: 1-5 based on viewport
- Cards have varied heights (aspect ratio preserved)
- Located: `components/assets/masonry-grid.tsx`

### 2. Hover Overlays
- Gradient overlay: `from-black/60 to-black/80`
- Appears on hover with `opacity-0 → opacity-100`
- Contains user info, buttons (like, save)
- Pattern used on asset cards

### 3. Modal System with Keyboard Navigation
- Full-screen: `fixed inset-0 z-[100]`
- Two-column layout: Image (flex-1) + Sidebar (400-480px)
- **Keyboard shortcuts**: ESC (close), Arrow Left/Right (navigate)
- Smooth crossfade transitions between images
- Image preloading for performance
- Located: `components/assets/asset-detail.tsx`

### 4. Design System
- **Custom button variants**: `cosmos`, `cosmos-secondary`, `cosmos-ghost`
- **Semantic tokens**: Uses shadcn theme variables (`bg-background`, `text-foreground`, etc.)
- **No hardcoded colors**: All zinc-* replaced with semantic tokens
- **Centralized constants**: `lib/constants.ts` for magic strings/numbers

### 5. Workspace Switching
- Dropdown with Command palette
- Personal + Team list
- Updates context (ready for global state)
- Located: `components/layout/workspace-switcher.tsx`

---

## 🔧 Tech Stack Quick Reference

| Category | Tech | Why |
|----------|------|-----|
| Framework | Next.js 15 | App Router, RSC |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first |
| Components | shadcn/ui | Radix primitives |
| Layout | react-masonry-css | Pinterest grid |
| Animations | Framer Motion | Smooth transitions |
| Icons | Lucide React | Consistent icons |

**Key Rule**: Never modify `components/ui/*` (shadcn base components)

---

## 📝 TODO System Explained

### Every TODO includes:
1. **What** to replace
2. **Which** API endpoint
3. **What** data structure
4. **What** to consider (auth, errors, edge cases)

### Example:
```typescript
// TODO: Implement like functionality
//   - Check authentication: if (!session) return showLogin()
//   - API: POST /api/assets/:assetId/like
//   - Optimistic update: setIsLiked(true) immediately
//   - Roll back on error: setIsLiked(false)
//   - Update count: setLikeCount(prev => prev + 1)
```

### Finding TODOs:
- Search codebase: `grep -r "TODO:" .`
- Or read: `TODO_FILES_REFERENCE.md`

---

## 🚀 Common Tasks for You

### Task 1: Connect Authentication (EASIEST - Structure Ready!)
```typescript
// Auth middleware is already implemented in lib/auth/middleware.ts
// Just need to connect to real provider:

// Steps:
1. Choose: NextAuth.js, Clerk, or Supabase Auth
2. Set up: signin/signup pages
3. Replace: Mock auth in middleware with real provider
4. Update: API routes to use real session
5. Test: Protected routes work correctly

// Time estimate: 2-3 days (down from 1-2 weeks!)
```

### Task 2: Set Up Database
```typescript
// Files to reference:
// - lib/mock-data/*.ts (SQL schemas in comments)

// Steps:
1. Set up: PostgreSQL (Supabase/Neon/Railway)
2. Create: 6 tables (users, teams, team_members, projects, assets, asset_likes)
3. Use: Drizzle ORM or Prisma
4. Replace: mock data imports with db queries
5. Convert: pages to async server components
```

### Task 3: Connect File Storage (EASY - Upload Flow Ready!)
```typescript
// Upload flow is fully implemented in:
// - components/layout/upload-dialog.tsx (drag-drop UI complete)
// - app/api/assets/upload/route.ts (API route ready)
// - lib/utils/image.ts (image processing ready)

// Steps:
1. Choose: S3, R2, or Supabase Storage
2. Replace: dataUrl storage with actual file upload
3. Update: API route to use signed URLs
4. Connect: to your CDN domain in next.config.ts
5. Test: Upload flow end-to-end

// Time estimate: 3-5 days (down from 1-2 weeks!)
```

### Task 4: Search System ✅ COMPLETED
```typescript
// ✅ Already implemented with:
// - React Context for global state (text + color search)
// - Real-time filtering with debounce
// - Auto-suggest dropdown with previews
// - Keyboard navigation
// - Recent searches (localStorage)
// - Dedicated search results page
// - URL parameters for sharing
// - ✅ Color search with visual picker (v1.6.0)
// - ✅ Hex code input for precise color matching
// - ✅ Euclidean distance algorithm (threshold: 60)
// - ✅ Results sorted by closest color match

// Still needed:
// - Backend search API (when database is ready)
// - Full-text search indexing (Algolia/Meilisearch)
```

---

## 🎓 Code Quality Standards

### We Follow:
- ✅ TypeScript everywhere (no `any`)
- ✅ Tailwind only (no custom CSS)
- ✅ Functional components only
- ✅ Props fully typed
- ✅ "use client" only when needed (interactivity)
- ✅ File naming: kebab-case
- ✅ Component naming: PascalCase
- ✅ Zero linter errors
- ✅ **Semantic tokens** for colors (not hardcoded hex/zinc)
- ✅ **Constants** for magic strings/numbers (`lib/constants.ts`)
- ✅ **Error boundaries** for robust error handling
- ✅ **Loading states** for better UX
- ✅ **React.memo** for performance-critical components
- ✅ **Null safety** and defensive programming

### We Avoid:
- ❌ Modifying `components/ui/*` directly (extend with variants)
- ❌ Class components
- ❌ Inline styles (use Tailwind)
- ❌ console.log (use proper logging)
- ❌ Magic numbers/strings (use constants)
- ❌ Hardcoded colors (use semantic tokens)

---

## 🧭 Navigation Cheat Sheet

### "I want to understand..."
- **The whole project** → Read `ONBOARDING.md` (8,000 words)
- **Current status** → Read `PROJECT_STATUS.md`
- **Backend plan** → Read `BACKEND_INTEGRATION.md`
- **Where TODOs are** → Read `TODO_FILES_REFERENCE.md`
- **Quick overview** → This file (AI_AGENT_GUIDE.md)

### "I want to modify..."
- **Home feed** → `app/home/page.tsx` + `components/dashboard/feed.tsx`
- **Asset cards** → `components/assets/element-card.tsx`
- **Navigation** → `components/layout/navbar.tsx`
- **Search** → `components/layout/search-bar.tsx`
- **Workspace switcher** → `components/layout/workspace-switcher.tsx`
- **Asset detail** → `components/assets/asset-detail.tsx`
- **Settings modal** → `components/layout/settings-dialog.tsx`
- **User menu** → `components/layout/user-menu.tsx`

### "I want to add..."
- **New page** → Create `app/new-route/page.tsx`
- **New component** → Create `components/category/component.tsx`
- **New mock data** → Create `lib/mock-data/entity.ts` with SQL schema
- **New API route** → Create `app/api/route/route.ts`

---

## 💡 Key Insights for AI Agents

### 1. Nearly Everything is Ready
- UI is complete and polished with design system
- API structure is production-ready
- Auth middleware implemented
- Create flows functional
- Data structures are defined
- SQL schemas are written
- Error handling and loading states in place
- Just needs database connection

### 2. Follow the Patterns
- Every page follows same structure
- Every component follows shadcn patterns
- Every TODO follows same format
- Consistency is key

### 3. Don't Reinvent
- shadcn/ui handles accessibility
- Tailwind handles responsive
- Next.js handles routing
- Framer Motion handles animations
- Auth middleware handles security
- Error utilities handle network issues
- Just connect the database

### 4. Start Small
- Don't try to do everything at once
- Pick one feature (e.g., auth)
- Implement fully
- Test thoroughly
- Move to next feature

### 5. Reference the Docs
- If unsure, check ONBOARDING.md
- SQL schemas in mock data files
- API endpoints in TODO comments
- Code examples everywhere

---

## 🎨 Recent Improvements (Latest - v1.8.0)

### Streams Feature - Complete Refactor (v1.8.0) 🚀
- ✅ **Streams Replace Projects** - More flexible organizational model
- ✅ **Many-to-Many Relationships** - Assets can belong to multiple streams
- ✅ **Semantic URLs** - `/stream/ux-design` instead of `/project/abc123`
- ✅ **Slug-Based Naming** - Stream names are lowercase, hyphenated slugs
- ✅ **Hashtag Mentions** - Type `#stream-name` to tag/create streams
- ✅ **Rich Text Input** - ContentEditable for advanced text editing
- ✅ **Auto-Complete Dropdown** - Stream suggestions while typing hashtags
- ✅ **localStorage Persistence** - Client-side storage for created streams
- ✅ **Cross-Component Sync** - Real-time updates via custom events
- ✅ **Multi-Stream Picker** - Select multiple streams for uploads
- ✅ **Stream Badges** - Visual pills with # icon for stream tags
- ✅ **Archive Support** - Streams can be active or archived
- ✅ **Privacy Settings** - Public/private streams
- ✅ **Global Unique Slugs** - Stream names are unique across platform
- ✅ **Migration Helpers** - Utilities for converting old projects data
- ✅ **Comprehensive API** - Full CRUD for streams and relationships

**Files Created**: 
- `lib/mock-data/streams.ts` - Stream data model
- `lib/utils/stream-storage.ts` - localStorage persistence layer
- `lib/utils/slug.ts` - Slug validation and sanitization
- `lib/hooks/use-stream-mentions.ts` - Hashtag parsing logic
- `components/ui/rich-text-area.tsx` - ContentEditable component
- `components/streams/stream-mention-dropdown.tsx` - Autocomplete UI
- `components/streams/stream-picker.tsx` - Multi-select picker
- `components/streams/stream-badge.tsx` - Stream tag display
- `app/api/streams/` - Stream CRUD APIs

**Files Updated**: 30+ components and pages refactored from "project" to "stream"

---

## 🎨 Previous Improvements

### Settings Modal Implementation (v1.7.0)

### Settings Modal Implementation (NEW!) 🆕
- ✅ **Comprehensive Settings Dialog** - Full-featured modal with tabbed interface
- ✅ **Account Settings** - Profile photo, display name, username, email, bio, location, website
- ✅ **Notification Preferences** - Email, push, and activity notification toggles
- ✅ **Privacy Controls** - Profile visibility, email visibility, likes visibility, search indexing
- ✅ **Connected Accounts** - GitHub, Twitter, Google, Figma integration UI
- ✅ **Tab Navigation** - Smooth animated transitions between settings sections
- ✅ **Form Validation** - Character limits, username sanitization, real-time feedback
- ✅ **Responsive Design** - Mobile-friendly with icon-only tabs on small screens
- ✅ **Accessibility** - Full ARIA support, keyboard navigation, screen reader friendly
- ✅ **Success Feedback** - Loading states and success messages
- ✅ **Integrated with User Menu** - Opens from dropdown settings button

### User Profile Enhancements & UX Refinements (v1.5.0) 🎉
- ✅ **User Profile Tabs** - Shots, Projects, and Liked tabs with dynamic content
- ✅ **Scroll Position Preservation** - Maintains scroll when switching between tabs
- ✅ **Streamlined Comment Deletion** - Immediate deletion without confirmation dialog
- ✅ **Enhanced Profile Header** - Consistent layout with avatar, display name, username, job title, and team badge
- ✅ **Lazy Loading** - Tab content loads only on first visit for better performance
- ✅ **URL Synchronization** - Active tab reflected in URL for shareable links
- ✅ **React Hooks Fixes** - Resolved Rules of Hooks violations for stable renders
- ✅ **Accessibility Improvements** - Fixed Radix UI DialogTitle requirements
- ✅ **Better Dropdown Visibility** - Enhanced contrast, borders, and shadows for menus
- ✅ **Improved Empty States** - Contextual messages with clear call-to-action buttons
- ✅ **Error Boundaries** - Added error handling for user profile routes

### Mobile-First & Comment System (v1.4.0) 🎉
- ✅ **Mobile Carousel** - Instagram-style swipe navigation with Embla Carousel
- ✅ **Bottom Sheet** - Drag-to-dismiss comments panel with safe area insets
- ✅ **Comment System** - Full CRUD with threading, likes, @mentions
- ✅ **Activity Feed** - In-app notifications with unread badges
- ✅ **Performance** - React.memo, useCallback, useMemo throughout
- ✅ **Desktop/Mobile Views** - Adaptive UI with viewport detection
- ✅ **Auto-expanding Textarea** - Smooth typing with hidden scrollbars
- ✅ **Relative Timestamps** - "2h ago" formatting
- ✅ **Image Preloading** - Adjacent assets load for instant navigation

### Create Flows Complete (v1.3.0)
- ✅ **Create Project** - Full form with validation, API integration
- ✅ **Upload Files** - Drag-drop, parallel uploads, progress tracking
- ✅ **Auth Middleware** - Authentication, authorization, rate limiting
- ✅ **Network Error Handling** - Retry logic, offline detection, user-friendly errors
- ✅ **Request Deduplication** - Prevents duplicate submissions
- ✅ **Full Accessibility** - WCAG 2.1 AA compliant with comprehensive ARIA
- ✅ **Input Sanitization** - XSS prevention on all user inputs
- ✅ **Image Processing** - Dimension extraction, validation, memory leak fixes
- ✅ **3 API Routes** - `/api/projects`, `/api/assets/upload`, `/api/extract-colors`

## 🎨 Previous Improvements

### Search Functionality (Completed) ✨
- ✅ **React Context** for global search state management
- ✅ **Real-time filtering** as you type (debounced)
- ✅ **Auto-suggest dropdown** with thumbnails and avatars
- ✅ **Keyboard navigation** (Arrow Up/Down, Enter, Escape, Cmd/Ctrl+K)
- ✅ **Recent searches** (localStorage persistence)
- ✅ **URL parameters** for shareable search links
- ✅ **Dedicated search results page** (`/search`)
- ✅ **Multi-type search** (assets, projects, users, teams)
- ✅ **Performance optimized** with Map lookups and memoization

### Color Extraction System (Completed) 🎨
- ✅ **Automatic color extraction** using `get-image-colors` library
- ✅ **Real colors** from actual images (not manually coded)
- ✅ **5-color palettes** per asset
- ✅ **Click-to-copy** color swatches in UI
- ✅ **API route** for real-time extraction (`/api/extract-colors`)
- ✅ **Batch processing scripts** for all assets
- ✅ **Comprehensive documentation** (`docs/COLOR_EXTRACTION.md`)
- ✅ **18/18 assets** updated with real color palettes

### UI Design System (Completed)
- ✅ Added custom button variants: `cosmos`, `cosmos-secondary`, `cosmos-ghost`
- ✅ Replaced all hardcoded colors with semantic tokens
- ✅ Refactored 14 components for consistency
- ✅ Created `lib/constants.ts` and `lib/constants/search.ts`
- ✅ Follows shadcn/ui best practices (extend, don't modify)

### Bug Fixes & Code Quality
- ✅ Fixed null pointer crashes in ElementCard and WorkspaceSwitcher
- ✅ Fixed division by zero in aspect ratio calculation
- ✅ Fixed React.memo optimization issues
- ✅ Added empty state handling for grids
- ✅ Fixed Next.js 15 `params` prop (now Promise)
- ✅ Removed unused hooks and state
- ✅ Fixed missing callback dependencies
- ✅ Added comprehensive ARIA attributes
- ✅ Extracted all magic numbers to constants

### Enhanced Features
- ✅ **Keyboard navigation** in asset detail (ESC, Arrow Left/Right)
- ✅ **Keyboard shortcuts** for search (Cmd/Ctrl+K to focus)
- ✅ **Smooth crossfade** transitions between images
- ✅ **Image preloading** for better performance
- ✅ **Error boundaries** to catch UI errors gracefully
- ✅ **Loading states** with spinners and skeletons
- ✅ **Accessibility** improvements (ARIA labels, focus management, screen reader support)

### Performance & Code Quality
- ✅ React.memo on performance-critical components
- ✅ Defensive programming with null checks
- ✅ Constants extraction for maintainability
- ✅ Custom hooks: `useDebounce`, `useKeyboardShortcut`, `useClickOutside`
- ✅ Comprehensive code review completed
- ✅ Zero known bugs in frontend

---

## 🚦 Decision Tree

```
START HERE
│
├─ Adding new feature?
│  └─ Check if it's in TODO comments → Follow the guide
│     └─ Not in TODOs? → Add similar pattern
│
├─ Modifying existing feature?
│  └─ Find the component/page → Read TODO comments → Implement
│
├─ Backend work?
│  └─ Read BACKEND_INTEGRATION.md → Follow priority order
│     └─ Auth → Database → APIs → Features
│
├─ Confused about architecture?
│  └─ Read ONBOARDING.md sections 3-4
│
├─ Need to understand data model?
│  └─ Read lib/mock-data/*.ts files
│
└─ Want to see what's implemented?
   └─ Read PROJECT_STATUS.md
```

---

## ✅ Pre-flight Checklist

Before you start coding:

- [ ] I've read this AI_AGENT_GUIDE.md
- [ ] I understand the data model (User, Team, Project, Asset)
- [ ] I know where mock data is (`lib/mock-data/*.ts`)
- [ ] I know pages are in `app/*` directory
- [ ] I know components are in `components/*` directory
- [ ] I understand TODO comments mark integration points
- [ ] I've run `npm run dev` and explored the UI
- [ ] I know there are 5 documentation files to reference
- [ ] I understand we use TypeScript, Tailwind, shadcn/ui
- [ ] I'm ready to code! 🚀

---

## 🎯 Your First Task Suggestion

**Connect Database** (Easiest now, API structure ready!)

```typescript
// 1. Set up PostgreSQL (Supabase/Neon/Railway)
npm install drizzle-orm postgres

// 2. Create tables using SQL schemas in lib/mock-data/*.ts
// 3. Connect API routes to database
// 4. Replace mock data imports with database queries
// 5. Test existing API routes with real data

// Files to update:
- app/api/projects/route.ts (replace projects array)
- app/api/assets/upload/route.ts (replace assets array)
- lib/mock-data/*.ts (can keep as seed data)

// Time estimate: 3-5 days (structure is ready!)
```

---

## 📚 Quick Access

| Need | File | Lines |
|------|------|-------|
| User structure | `lib/mock-data/users.ts` | 20-30 |
| Asset structure | `lib/mock-data/assets.ts` | 30-50 |
| Main feed logic | `app/home/page.tsx` | Full file |
| Masonry grid | `components/assets/masonry-grid.tsx` | Full file |
| Asset card | `components/assets/element-card.tsx` | Full file |
| Navbar | `components/layout/navbar.tsx` | Full file |

---

## 🎉 You're Ready!

You now have:
- ✅ Understanding of project structure
- ✅ Knowledge of data models
- ✅ Location of all critical files
- ✅ Understanding of TODO system
- ✅ Next steps clearly defined

**Go build something amazing! If you get stuck, reference the detailed docs.** 🚀

---

*Optimized for: Claude Sonnet, GPT-4, and other LLMs*  
*Context: This is a handoff document for AI agents*  
*Goal: Minimize context needed to be productive*

