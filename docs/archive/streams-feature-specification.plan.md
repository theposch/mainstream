<!-- 0ccb9b57-e0f1-4e8a-ba5b-349d19ac80ce cf287714-311b-4b04-b660-737242df2c6a -->
# Streams Feature: Complete Specification & Implementation Plan

## Plan Review & Validation ✅

**Architecture Assessment**: The plan is sound and production-ready:
- ✅ Many-to-many relationship via junction table follows best practices
- ✅ Backward compatibility strategy ensures zero data loss
- ✅ Mock-first with database migration path aligns with current codebase patterns
- ✅ Stream resources and members provide complete feature set
- ✅ Clear separation of concerns (data, API, UI)

**Completeness**: All requirements addressed:
- ✅ Complete terminology refactor from Projects → Streams
- ✅ Many-to-many relationships (asset can belong to multiple streams)
- ✅ Stream properties: name, description, resources, privacy, members, status
- ✅ CRUD operations specified
- ✅ Auto-migration of existing projectId → streamIds

---

## Comprehensive File Inventory

### 📦 Data Layer (Priority 1 - Core Foundation)

**NEW FILES TO CREATE:**

1. **`lib/mock-data/streams.ts`** [NEW FILE]
   - Create Stream interface (id, name, description, ownerType, ownerId, isPrivate, status, createdAt, updatedAt)
   - Create StreamMember interface
   - Create StreamResource interface  
   - Create AssetStream interface (junction table)
   - Convert existing 5 projects → 5 streams mock data
   - Add 2-3 additional streams for multi-tagging examples
   - Mock stream members (followers)
   - Mock pinned resources

2. **`lib/mock-data/migration-helpers.ts`** [NEW FILE]
   - Create `migrateAssetToStreams()` utility
   - Create `getStreamsForAsset()` helper
   - Create `getAssetsForStream()` helper

**FILES TO UPDATE:**

3. **`lib/mock-data/assets.ts`**
   - Add `streamIds?: string[]` to Asset interface
   - Mark `projectId?: string` as deprecated with comment
   - Update all 18 mock assets with streamIds array
   - Auto-populate streamIds from projectId
   - Add 5-6 assets to multiple streams (30% for demo)

4. **`lib/mock-data/projects.ts`**
   - Add deprecation notice at top of file
   - Keep for backward compatibility during migration
   - Add TODO comment: "DEPRECATED: Use streams.ts instead"

---

### 🔌 API Layer (Priority 2 - Backend Routes)

**NEW FILES TO CREATE:**

5. **`app/api/streams/route.ts`** [NEW FILE]
   - GET: List all accessible streams
   - POST: Create new stream
   - Follow same pattern as `app/api/projects/route.ts`
   - Use mutable streams array (mock strategy)

6. **`app/api/streams/[id]/route.ts`** [NEW FILE]
   - GET: Get stream details + resources + members
   - PUT: Update stream
   - DELETE: Delete stream
   - PATCH: Archive/unarchive

7. **`app/api/streams/[id]/assets/route.ts`** [NEW FILE]
   - GET: Get assets in stream (paginated)
   - POST: Add asset to stream (tagging)
   - DELETE: Remove asset from stream

8. **`app/api/streams/[id]/resources/route.ts`** [NEW FILE]
   - CRUD for pinned resources

9. **`app/api/streams/[id]/members/route.ts`** [NEW FILE]
   - GET: Get members
   - POST: Follow stream
   - DELETE: Unfollow stream

**FILES TO UPDATE:**

10. **`app/api/projects/route.ts`**
    - Add deprecation notice
    - Consider proxying to streams API
    - Or keep for backward compatibility

11. **`app/api/assets/upload/route.ts`**
    - Update to accept `streamIds` array instead of single `projectId`
    - Maintain backward compatibility temporarily

---

### 📄 Pages (Priority 3 - Routes & Layouts)

**FILES TO RENAME:**

12. **`app/projects/page.tsx` → `app/streams/page.tsx`**
    - Import from `lib/mock-data/streams` instead of projects
    - Update all "Project" text → "Stream"
    - Update page header: "Projects" → "Streams"
    - Update description text
    - Change route references

13. **`app/project/[id]/page.tsx` → `app/stream/[id]/page.tsx`**
    - Import streams instead of projects
    - Update all variable names: project → stream
    - Update data fetching logic
    - Filter assets by streamId (many-to-many)
    - Update ProjectHeader → StreamHeader component

**FILES TO UPDATE:**

14. **`app/library/page.tsx`**
    - Line 17-24: Change "featuredProjects" → "featuredStreams"
    - Line 32-55: Update TODO comments
    - Line 58: "Featured Projects" → "Featured Streams"  
    - Line 61: ProjectGrid → StreamGrid

15. **`app/search/page.tsx`**
    - Line 7: Update searchParams type
    - Line 16-18: Update TODO comments

16. **`app/u/[username]/page.tsx`**
    - Line 8: Import streams instead of projects
    - Line 14: ProjectGrid → StreamGrid  
    - Line 27-38: Update TODO comments (projects → streams)
    - Line 54: "projects" → "streams" in tab type
    - Lines 120-167: Update projects tab content
    - Line 204: Update variable names
    - Line 237: streamCount instead of projectCount

17. **`app/t/[slug]/page.tsx`**
    - Lines importing projects
    - Team projects → Team streams
    - ProjectGrid → StreamGrid
    - Update all variable names

18. **`app/teams/page.tsx`**
    - Similar updates as team page

19. **`app/e/[id]/page.tsx`**
    - Line references to project (if any)

---

### 🎨 Components - Core Stream Components (Priority 4)

**FILES TO RENAME:**

20. **`components/projects/projects-grid.tsx` → `components/streams/streams-grid.tsx`**
    - Rename Project types → Stream types
    - Update all prop names
    - Update empty state text
    - Import from streams mock data

21. **`components/projects/project-card.tsx` → `components/streams/stream-card.tsx`**
    - Rename interface ProjectCardProps → StreamCardProps
    - Update all variable names
    - Update link: `/project/` → `/stream/`
    - Add # prefix to stream name display

22. **`components/projects/project-grid.tsx` → `components/streams/stream-grid.tsx`**
    - Same pattern as projects-grid
    - Update imports and types

23. **`components/projects/project-header.tsx` → `components/streams/stream-header.tsx`**
    - Rename interface
    - Add resources section (NEW)
    - Add follow button (NEW)
    - Add members count (NEW)
    - Update all text

**NEW COMPONENTS TO CREATE:**

24. **`components/streams/stream-picker.tsx`** [NEW FILE]
    - Multi-select checkbox list
    - Search/filter streams
    - "Create new stream" inline option
    - Prevent selecting archived streams
    - Max 5-10 selections

25. **`components/streams/stream-badge.tsx`** [NEW FILE]
    - Small pill/badge display
    - Shows # + stream name
    - Color-coded by owner
    - Clickable → navigate to stream

26. **`components/streams/stream-resources-list.tsx`** [NEW FILE]
    - Display pinned links
    - Icon per resource type (Figma, Jira, etc)
    - Edit mode for owners

27. **`components/streams/stream-members-list.tsx`** [NEW FILE]
    - Avatar grid of followers
    - Member count
    - Follow/unfollow button

28. **`components/streams/stream-archive-dialog.tsx`** [NEW FILE]
    - Confirmation modal
    - Warning about consequences
    - "Dam the stream" messaging

---

### 🎨 Components - Layout & Shared (Priority 5)

**FILES TO RENAME:**

29. **`components/layout/create-project-dialog.tsx` → `components/layout/create-stream-dialog.tsx`**
    - Update all text "Project" → "Stream"
    - Update API endpoint call
    - Update form labels
    - Keep same structure/validation

**FILES TO UPDATE:**

30. **`components/layout/create-dialog.tsx`**
    - Line 7: Import CreateStreamDialog
    - Line 12: projectDialogOpen → streamDialogOpen
    - Line 15-18: handleNewProject → handleNewStream
    - Line 38-47: Update button text and description
    - Line 45: "New Project" → "New Stream"
    - Line 46: "Create a collection" → "Create a stream for your work"
    - Line 80: CreateProjectDialog → CreateStreamDialog

31. **`components/layout/upload-dialog.tsx`**
    - **MAJOR UPDATE**: Add stream picker UI
    - Add multi-select for streams
    - Remove single project selector (if exists)
    - Update form submission to send streamIds array
    - Add validation (at least 1 stream required)

32. **`components/layout/navbar-content.tsx`**
    - Line 29: href="/projects" → href="/streams"
    - Line 32: "Projects" → "Streams"
    - Line 48: aria-label update

33. **`components/layout/search-suggestions.tsx`**
    - Line 10: Import Stream type instead of Project
    - Line 44: type: "project" → type: "stream"  
    - Line 51: data?: ... | Stream
    - Lines 83-93: Project suggestions → Stream suggestions
    - Line 86: type: "project" → type: "stream"
    - Line 88-89: href: `/project/` → `/stream/`
    - Line 92: subtitle handling

**FILES TO UPDATE:**

34. **`components/layout/workspace-switcher.tsx`**
    - Update references to projects if any
    - Projects list → Streams list (if displayed)

---

### 🎨 Components - Assets (Priority 6)

**FILES TO UPDATE:**

35. **`components/assets/element-card.tsx`**
    - **MAJOR UPDATE**: Display multiple stream badges instead of single project
    - Remove single project link
    - Add streamIds mapping
    - Render 1-3 stream badges (show "+" if more)
    - Update hover state

36. **`components/assets/asset-detail-desktop.tsx`**
    - Update stream references
    - Show all streams asset belongs to
    - Add ability to add/remove streams

37. **`components/assets/asset-detail-mobile.tsx`**
    - Similar to desktop updates

---

### 🔍 Search & Utility Components (Priority 7)

**FILES TO UPDATE:**

38. **`components/search/search-results.tsx`**
    - Line 9: ProjectGrid → StreamGrid
    - Line 13: Import streams instead of projects
    - Line 46-64: Update results to use streams
    - Lines 108-120: Render streams tab instead of projects

39. **`components/search/search-results-tabs.tsx`**
    - Line 4: SearchTab type: "projects" → "streams"
    - Line 12: projects: number → streams: number
    - Line 26: { id: "projects" } → { id: "streams" }
    - Line 26: label: "Projects" → label: "Streams"

40. **`components/search/search-empty-state.tsx`**
    - Update text mentioning projects

41. **`components/dashboard/feed.tsx`**
    - Update any project references
    - Import streams

---

### 🧩 User/Team Components (Priority 8)

**FILES TO UPDATE:**

42. **`components/users/user-profile-tabs.tsx`**
    - Line 7: UserProfileTab type: "projects" → "streams"
    - Line 16: projectsCount → streamsCount
    - Line 34: projectsCount → streamsCount
    - Line 46: "projects" → "streams", label: "Projects" → "Streams"

43. **`components/teams/team-tabs.tsx`**
    - Line 7: TeamTab type: "projects" → "streams"
    - Line 13: projectsCount → streamsCount
    - Lines 38-52: Update button text and variables

44. **`components/teams/team-header.tsx`**
    - Update any project references

45. **`components/teams/team-card.tsx`**
    - Update project mentions

---

### 🛠️ Utilities & Lib (Priority 9)

**FILES TO UPDATE:**

46. **`lib/utils/search.ts`**
    - Line 2: Import Stream instead of Project
    - Line 7-8: Function comment update
    - Line 10: searchAssets signature (projects → streams)
    - Line 17: projectMap → streamMap  
    - Line 28-30: Search by stream name
    - Line 36-48: searchProjects → searchStreams
    - Line 88: projects: Project[] → streams: Stream[]
    - Line 97-117: Update searchAll function

47. **`lib/constants/search.ts`**
    - Line 9: MAX_PROJECT_SUGGESTIONS → MAX_STREAM_SUGGESTIONS
    - Update comments

48. **`lib/contexts/search-context.tsx`**
    - No direct changes needed (uses generic query system)
    - Verify color search still works

---

### 📚 Documentation Files (Priority 10)

**FILES TO UPDATE:**

49. **`docs/TODO_FILES_REFERENCE.md`**
    - Update all project references → stream
    - Update file paths
    - Add new files to reference

50. **`docs/BACKEND_INTEGRATION.md`**
    - Section 7: Projects → Streams
    - Update API endpoints
    - Update schema references
    - Add stream-specific features

51. **`docs/AI_AGENT_GUIDE.md`**
    - Update mental model diagram
    - Project examples → Stream examples
    - Update file paths
    - Update terminology throughout

52. **`docs/IMAGE_UPLOAD.md`**
    - Update projectId references
    - Document streamIds array

53. **`README.md`**
    - Update project description
    - Update terminology
    - Update screenshots (if any)

54. **`ONBOARDING.md`**
    - Update architecture section
    - Update terminology
    - Update code examples

55. **`PROJECT_STATUS.md`**
    - Update completed features
    - Update terminology

---

## Implementation Phase Todos

### Phase 1: Foundation (Week 1)
- Create streams.ts mock data with 8 streams
- Update assets.ts with streamIds array
- Create migration-helpers.ts utilities
- Test data integrity

### Phase 2: API Routes (Week 1-2)
- Build /api/streams CRUD endpoints
- Build /api/streams/[id] endpoints
- Build asset-stream relationship endpoints
- Test API with mock data

### Phase 3: Core Components (Week 2)
- Rename project components → stream components
- Create stream-picker multi-select
- Create stream-badge component
- Update element-card with multi-stream display

### Phase 4: Pages & Layout (Week 2-3)
- Rename project pages → stream pages
- Update create-stream-dialog
- Update upload-dialog with stream picker
- Update navigation

### Phase 5: Search & Utilities (Week 3)
- Update search system for streams
- Update search results display
- Update suggestions
- Update utility functions

### Phase 6: Polish & Testing (Week 3-4)
- Global find/replace for terminology
- Update all documentation
- Test all flows end-to-end
- Verify backward compatibility
- Fix any edge cases

---

## Validation Checklist

### Data Integrity
- [ ] All 18 assets have valid streamIds
- [ ] streamIds arrays properly populated
- [ ] No broken references
- [ ] Backward compatibility maintained

### UI

### To-dos

- [ ] Create Stream interfaces and mock data structure
- [ ] Update Asset interface with streamIds array
- [ ] Build API routes for streams CRUD operations
- [ ] Create multi-select stream picker component
- [ ] Rename project components to stream components
- [ ] Rename project pages to stream pages
- [ ] Add stream picker to upload dialog
- [ ] Global find/replace: Project → Stream in UI text
- [ ] Build pinned resources UI components
- [ ] Test backward compatibility with existing mock data