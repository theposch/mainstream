# 🌊 Streams Feature - Complete Documentation

**Version**: 1.0.0  
**Date**: November 26, 2025  
**Status**: ✅ Implemented & Functional

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Why Streams Replace Projects](#why-streams-replace-projects)
3. [Data Model](#data-model)
4. [Key Features](#key-features)
5. [Implementation Details](#implementation-details)
6. [Usage Examples](#usage-examples)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Migration Guide](#migration-guide)
10. [Known Limitations](#known-limitations)
11. [Future Enhancements](#future-enhancements)

---

## Overview

**Streams** are the primary organizational unit in Cosmos, replacing the previous "Projects" concept. They provide a more flexible, tag-like system for organizing creative work while maintaining the benefits of project-based organization.

### Core Concept

A **Stream** is a hybrid between a "Project" and a "Tag":
- Like a project: Has metadata (description, privacy, owner, resources)
- Like a tag: Supports many-to-many relationships with assets
- **Key difference**: An asset can belong to multiple streams simultaneously

### Philosophy

Streams acknowledge that creative work rarely fits into neat, singular categories. A design might belong to:
- `#ios-app` (the product)
- `#onboarding-flow` (the feature)
- `#design-system` (the system)
- `#q4-2024` (the timeline)

---

## Why Streams Replace Projects

### Problems with Traditional Projects

1. **Single Assignment Limitation**: Assets could only belong to one project
2. **Rigid Hierarchy**: No cross-cutting concerns or multiple perspectives
3. **Naming Conflicts**: Generic IDs in URLs (`/project/abc123`)
4. **Inflexible Grouping**: Hard to organize by initiative, timeline, or theme

### Streams Solution

1. **Many-to-Many Relationships**: Assets can belong to multiple streams
2. **Flexible Organization**: Group by product, feature, system, timeline, etc.
3. **Semantic URLs**: Human-readable slugs (`/stream/ux-design`)
4. **Hashtag Creation**: Quick stream creation with `#stream-name`
5. **Cross-Product Collaboration**: Same asset can appear in multiple contexts

---

## Data Model

### Stream Interface

```typescript
interface Stream {
  id: string;                    // UUID
  name: string;                  // Slug format (e.g., "ux-design")
  description?: string;           // Optional description
  ownerType: 'user' | 'team';    // Owner entity type
  ownerId: string;               // UUID of owner
  isPrivate: boolean;            // Visibility setting
  status: 'active' | 'archived'; // Stream status
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Asset-Stream Relationship

```typescript
interface AssetStream {
  assetId: string;   // Foreign key to assets
  streamId: string;  // Foreign key to streams
  addedAt: string;   // ISO timestamp
  addedBy: string;   // User ID who added relationship
}
```

### Asset Interface (Updated)

```typescript
interface Asset {
  id: string;
  title: string;
  streamIds: string[];  // Array of stream IDs (many-to-many)
  // ... other fields
}
```

---

## Key Features

### 1. Semantic URLs ✅

**Before (Projects)**:
```
/project/abc-123-def-456
```

**After (Streams)**:
```
/stream/ux-design
/stream/ios-app
/stream/growth-team
```

**Benefits**:
- Human-readable URLs
- SEO-friendly
- Shareable links make sense
- Bookmarkable by name

### 2. Hashtag Mentions ✅

Type `#stream-name` anywhere to:
- Tag existing streams
- Auto-create new streams
- Link content across streams

**Example Flow**:
1. User uploads image
2. Types in description: "New design for #ios-app and #design-system"
3. System recognizes hashtags
4. Auto-tags asset with both streams
5. Creates streams if they don't exist

### 3. Many-to-Many Relationships ✅

An asset can belong to multiple streams simultaneously:

```typescript
const asset = {
  id: "asset-1",
  title: "Login Screen",
  streamIds: ["ios-app", "onboarding-flow", "design-system"]
};
```

**Display**:
- Asset cards show multiple stream badges
- Stream pages show all related assets
- Cross-linking enables discovery

### 4. localStorage Persistence ✅

Streams are persisted client-side for demo/development:

```typescript
// Automatic storage
addStream(newStream);      // Saves to localStorage
const streams = getStreams(); // Retrieves mock + localStorage
updateStream(stream);      // Updates existing
deleteStream(streamId);    // Removes from storage
```

**Cross-Component Sync**:
- Custom events notify all components
- Real-time updates without page refresh
- Works across browser tabs

### 5. Rich Text Input ✅

ContentEditable-based input with:
- Cursor position tracking
- Text replacement
- Hashtag detection
- Autocomplete dropdown

### 6. Autocomplete Dropdown ✅

As you type `#`:
- Shows matching streams
- Displays "Create new" option
- Keyboard navigation (Arrow keys, Enter, Escape)
- Positioned near cursor using React Portal

### 7. Multi-Stream Picker ✅

Checkbox-based picker for asset uploads:
- Select multiple streams
- Search/filter streams
- Create new streams inline
- Shows selection as pills

### 8. Stream Badges ✅

Visual pills throughout the UI:
- `#` icon for public streams
- Lock icon for private streams
- Clickable to navigate to stream
- Truncated names with tooltips

---

## Implementation Details

### File Structure

```
lib/
├── mock-data/
│   └── streams.ts              # Mock stream data + helpers
├── utils/
│   ├── stream-storage.ts       # localStorage persistence
│   └── slug.ts                 # Slug validation/sanitization
└── hooks/
    └── use-stream-mentions.ts  # Hashtag parsing logic

components/
├── streams/
│   ├── stream-badge.tsx        # Stream pill component
│   ├── stream-picker.tsx       # Multi-select picker
│   ├── stream-card.tsx         # Stream card display
│   ├── stream-grid.tsx         # Grid layout
│   ├── stream-header.tsx       # Stream page header
│   └── stream-mention-dropdown.tsx  # Autocomplete UI
└── ui/
    └── rich-text-area.tsx      # ContentEditable component

app/
├── stream/
│   └── [slug]/
│       └── page.tsx            # Individual stream page
├── streams/
│   └── page.tsx                # All streams listing
└── api/
    └── streams/
        ├── route.ts            # List/create streams
        └── [id]/
            ├── route.ts        # Get/update/delete stream
            └── assets/
                └── route.ts    # Manage asset relationships
```

### Slug Format

**Rules**:
- Lowercase only
- Alphanumeric + hyphens
- No leading/trailing hyphens
- No double hyphens
- 2-50 characters
- Globally unique

**Examples**:
```
✅ Valid:
- "ux-design"
- "ios-app"
- "q4-2024"
- "growth-team"

❌ Invalid:
- "UX Design" (uppercase, spaces)
- "-ios-app" (leading hyphen)
- "ios--app" (double hyphen)
- "123" (too short)
```

**Conversion**:
```typescript
sanitizeToSlug("UX Design")     → "ux-design"
sanitizeToSlug("iOS App")       → "ios-app"
sanitizeToSlug("Q4 2024")       → "q4-2024"
sanitizeToSlug("Growth_Team")   → "growth-team"
```

### Storage Layer

**localStorage Functions**:

```typescript
// Read
getStreams(): Stream[]              // Merged mock + localStorage
getStreamBySlug(slug): Stream       // Find by slug
getStreamById(id): Stream           // Find by ID

// Write
addStream(stream: Stream): void     // Create new
updateStream(stream: Stream): void  // Update existing
deleteStream(id: string): void      // Remove

// Validation
isStreamNameAvailable(name): boolean  // Check uniqueness
```

**Event System**:
```typescript
// Dispatch update
dispatchStreamStorageUpdate();

// Listen for updates
useEffect(() => {
  const handleUpdate = () => fetchStreams();
  window.addEventListener('streamStorageUpdate', handleUpdate);
  return () => window.removeEventListener('streamStorageUpdate', handleUpdate);
}, []);
```

---

## Usage Examples

### Creating a Stream (Dialog)

```typescript
import { CreateStreamDialog } from '@/components/layout/create-stream-dialog';

// User flow:
// 1. Opens dialog
// 2. Types stream name (e.g., "ux-design")
// 3. Adds optional description
// 4. Selects owner (user/team)
// 5. Sets privacy (public/private)
// 6. Submits
// 7. Stream created and saved to localStorage
// 8. Redirects to /stream/ux-design
```

### Creating a Stream (Hashtag)

```typescript
// In upload dialog description:
"New onboarding flow for #ios-app"

// System automatically:
// 1. Detects #ios-app hashtag
// 2. Checks if stream exists
// 3. If not, creates stream via API
// 4. Tags asset with stream
// 5. Shows stream pill below description
```

### Displaying Stream Badges

```typescript
import { StreamBadge } from '@/components/streams/stream-badge';

// On asset card:
{asset.streamIds.map(streamId => {
  const stream = getStreamById(streamId);
  return stream ? (
    <StreamBadge 
      key={stream.id} 
      stream={stream}
      clickable={true}  // Links to stream page
    />
  ) : null;
})}
```

### Multi-Stream Picker

```typescript
import { StreamPicker } from '@/components/streams/stream-picker';

// In upload dialog:
const [selectedStreamIds, setSelectedStreamIds] = useState<string[]>([]);

<StreamPicker
  selectedStreamIds={selectedStreamIds}
  onStreamIdsChange={setSelectedStreamIds}
  variant="compact"  // Popover variant
/>
```

---

## API Reference

### GET /api/streams

List all accessible streams for current user.

**Response**:
```json
{
  "streams": [
    {
      "id": "stream-1",
      "name": "ux-design",
      "description": "UX design explorations",
      "ownerType": "team",
      "ownerId": "team-1",
      "isPrivate": false,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/streams

Create a new stream.

**Request**:
```json
{
  "name": "ios-app",
  "description": "iOS application work",
  "ownerType": "team",
  "ownerId": "team-1",
  "isPrivate": false
}
```

**Response**:
```json
{
  "stream": { /* Stream object */ }
}
```

### GET /api/streams/:slug

Get stream by slug (or ID for backward compatibility).

**Response**:
```json
{
  "stream": { /* Stream object */ }
}
```

### PUT /api/streams/:id

Update stream details.

**Request**:
```json
{
  "name": "ios-app-v2",
  "description": "Updated description",
  "isPrivate": true
}
```

### PATCH /api/streams/:id

Archive or unarchive stream.

**Request**:
```json
{
  "status": "archived"
}
```

### DELETE /api/streams/:id

Delete stream (must have no assets).

### GET /api/streams/:id/assets

List all assets in a stream.

### POST /api/streams/:id/assets

Add asset to stream.

**Request**:
```json
{
  "assetId": "asset-123"
}
```

### DELETE /api/streams/:id/assets/:assetId

Remove asset from stream.

---

## Database Schema

### PostgreSQL Schema

```sql
-- Streams table
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- Slug format
  description TEXT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'team')),
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Slug validation constraint
  CONSTRAINT valid_stream_name 
    CHECK (name ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT stream_name_length 
    CHECK (char_length(name) BETWEEN 2 AND 50)
);

-- Indexes
CREATE UNIQUE INDEX idx_streams_name ON streams(name);
CREATE INDEX idx_streams_owner ON streams(owner_type, owner_id) WHERE status = 'active';

-- Asset-Stream relationship (many-to-many)
CREATE TABLE asset_streams (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (asset_id, stream_id)
);

-- Indexes
CREATE INDEX idx_asset_streams_asset ON asset_streams(asset_id);
CREATE INDEX idx_asset_streams_stream ON asset_streams(stream_id);

-- Stream members (for collaboration)
CREATE TABLE stream_members (
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'contributor', 'admin')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);

-- Stream resources (pinned links)
CREATE TABLE stream_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('figma', 'jira', 'notion', 'prd', 'other')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## Migration Guide

### From Projects to Streams

**Data Migration**:

```typescript
// For each asset with projectId
const asset = {
  id: "asset-1",
  projectId: "project-1",  // Old
  // ...
};

// Convert to
const updatedAsset = {
  id: "asset-1",
  streamIds: ["project-1"],  // New - array
  // ...
};

// Create asset_streams relationship
await db.insert(asset_streams).values({
  assetId: "asset-1",
  streamId: "project-1",
  addedBy: asset.uploaderId,
  addedAt: asset.createdAt
});
```

**Code Migration**:

```typescript
// Before (Projects)
import { projects } from '@/lib/mock-data/projects';
const project = projects.find(p => p.id === projectId);

// After (Streams)
import { getStreams } from '@/lib/utils/stream-storage';
const stream = getStreamBySlug(slug);  // or getStreamById(id)
```

**URL Migration**:

```typescript
// Before
/project/abc-123-def-456

// After
/stream/project-name-slug
```

---

## Known Limitations

### 1. localStorage with SSR

**Issue**: Newly created streams show 404 on first SSR load.

**Why**: Server-side rendering can't access browser's localStorage.

**Workaround**: 
- Navigate back and use client-side routing
- Stream works after first client-side navigation

**Production Fix**: Replace localStorage with database queries.

### 2. No Stream Merging Yet

**Issue**: Can't merge two streams into one.

**Status**: Planned for future release.

**Workaround**: Manually move assets and delete old stream.

### 3. No Bulk Operations

**Issue**: Can't add/remove multiple assets at once.

**Status**: API supports it, UI pending.

**Workaround**: One at a time for now.

---

## Future Enhancements

### Planned Features

1. **Stream Templates**
   - Pre-configured streams for common use cases
   - One-click creation with default settings

2. **Stream Hierarchies**
   - Parent/child stream relationships
   - Breadcrumb navigation

3. **Stream Merging**
   - Combine two streams
   - Preserve all relationships
   - Redirect old URLs

4. **Bulk Asset Management**
   - Add/remove multiple assets at once
   - Move assets between streams
   - Copy assets to multiple streams

5. **Stream Analytics**
   - View counts
   - Contributor stats
   - Growth over time

6. **Stream Subscriptions**
   - Follow streams for updates
   - Email notifications
   - Activity feed

7. **Stream Export**
   - Download all assets in stream
   - Generate PDF presentation
   - Export to Figma/Notion

8. **Smart Suggestions**
   - Auto-suggest streams for uploads
   - Based on image content (ML)
   - Based on user patterns

---

## Performance Considerations

### Optimizations Implemented

1. **React.memo**: All stream components memoized
2. **useCallback**: Event handlers wrapped
3. **useMemo**: Computed values cached
4. **Debouncing**: Hashtag sync debounced (300ms)
5. **Event Batching**: Storage updates batched

### Best Practices

```typescript
// ✅ Good - memoize stream lookups
const stream = useMemo(() => 
  getStreamBySlug(slug), 
  [slug]
);

// ✅ Good - batch updates
const updateStreams = useCallback((ids: string[]) => {
  // Update all at once
}, []);

// ❌ Bad - lookup on every render
const stream = getStreamBySlug(slug);

// ❌ Bad - create new function each render
const onClick = () => handleClick(stream.id);
```

---

## Testing

### Manual Test Checklist

See `docs/streams-feature-specification.plan.md` for comprehensive test scenarios.

**Quick Smoke Test**:
1. ✅ Create stream via dialog
2. ✅ Create stream via hashtag
3. ✅ Upload asset with multiple streams
4. ✅ Navigate to stream page
5. ✅ Edit stream details
6. ✅ Archive stream
7. ✅ Search for streams

---

## Troubleshooting

### Common Issues

**Q: Stream not found after creation**
A: Use browser back/forward or client-side navigation. Server can't see localStorage.

**Q: Hashtag not creating stream**
A: Check slug format (lowercase, hyphens only). Must be valid slug.

**Q: Stream picker not updating**
A: Component should listen for `streamStorageUpdate` events. Check event listener setup.

**Q: Duplicate streams created**
A: Slug validation should prevent this. Check `isStreamNameAvailable()` logic.

---

## Credits

**Feature Design**: Product team  
**Implementation**: AI Agent + Human Review  
**Documentation**: This document  

**Key Design Decisions**:
- Slug-based naming for semantic URLs
- Many-to-many relationships for flexibility
- Hashtag creation for quick workflows
- localStorage for demo purposes (database planned)

---

**Last Updated**: November 26, 2025  
**Next Review**: When migrating to database

