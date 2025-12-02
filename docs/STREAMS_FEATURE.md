# Streams Feature

**Status:** ✅ Fully implemented and functional  
**Last Updated:** December 2025

## Overview

**Streams** are the primary organizational unit in Mainstream. They're a hybrid between projects and tags, supporting many-to-many relationships with assets.

### Core Concept

An asset can belong to multiple streams simultaneously:
- `#mobile-app` (the product)
- `#onboarding` (the feature)
- `#design-system` (the system)
- `#q4-2024` (the timeline)

## Why Streams?

### Traditional Projects = Limited

- Assets belong to only one project
- Rigid hierarchy
- Hard to organize by multiple dimensions

### Streams = Flexible

- Assets belong to many streams
- Flexible organization
- Semantic URLs (`/stream/ux-design`)
- Quick creation with hashtags (`#stream-name`)

## Data Model

### Stream

```typescript
interface Stream {
  id: string;
  name: string;              // Slug format (e.g., "ux-design")
  description?: string;
  owner_id: string;          // User who created it
  is_private: boolean;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}
```

### Many-to-Many Relationship

```typescript
interface AssetStream {
  asset_id: string;
  stream_id: string;
  added_at: string;
  added_by: string;
}
```

### Database Schema

```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset_streams (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  PRIMARY KEY (asset_id, stream_id)
);
```

## Features

### 1. Semantic URLs

Human-readable stream names in URLs:
- `/stream/ux-design` ✅
- `/project/abc123` ❌

### 2. Hashtag Creation

Type `#stream-name` during upload → stream created if doesn't exist

**Validation:**
- Lowercase letters, numbers, hyphens only
- 2-50 characters
- No leading/trailing hyphens
- Unique names
- Accepts uppercase input (converts to lowercase)

### 3. Pending Streams

New streams are "pending" until post is submitted:
- Shown with dashed border in UI
- Only created in database when "Post" is clicked
- Prevents orphaned streams if user cancels

### 4. Multiple Stream Assignment

Assets can belong to many streams:

```typescript
// Asset belongs to 3 streams
{
  id: "asset-123",
  title: "Login Screen",
  streams: ["mobile-app", "onboarding", "design-system"]
}
```

### 5. Stream Pages

Visit `/stream/[slug]` to see:
- Stream description
- All assets in stream
- Owner information
- Delete option (owner only)

### 6. Stream Deletion

Owner can delete streams:
- Assets remain (just unlinked from stream)
- Stream removed from database
- Confirmation required

## Implementation

### Creating Streams

**Method 1: Via Hashtag**
```typescript
// In upload dialog, type:
"Mobile app login screen #mobile-app #onboarding"

// Streams created automatically when Post is clicked
```

**Method 2: Via Stream Picker**
```typescript
// Click "Add stream" → search or type new name
// New streams shown as "pending" until Post
```

**Method 3: Via API**
```typescript
POST /api/streams
{
  "name": "mobile-app",
  "description": "iOS app designs",
  "isPrivate": false
}
// Returns existing stream if name conflict (idempotent)
```

### Adding Assets to Streams

```typescript
// During upload
POST /api/assets/upload
FormData {
  file: <blob>,
  title: "Login Screen",
  streamIds: ["mobile-app-id", "onboarding-id"]
}

// Creates asset_streams relationships automatically
```

### Querying Stream Assets

```typescript
// Get all assets in a stream (with like data)
const { data } = await supabase
  .from('asset_streams')
  .select(`
    asset_id,
    assets (
      *,
      uploader:users!uploader_id(*),
      asset_likes(count)
    )
  `)
  .eq('stream_id', streamId);
```

### Querying Asset Streams

```typescript
// Get all streams for an asset
const { data } = await supabase
  .from('streams')
  .select(`
    *,
    asset_streams!inner(asset_id)
  `)
  .eq('asset_streams.asset_id', assetId);
```

## UI Components

### Stream Picker

Used in upload dialog to select streams:

```typescript
// components/streams/stream-picker.tsx
<StreamPicker
  selectedStreamIds={streamIds}
  onStreamIdsChange={setStreamIds}
  pendingStreamNames={pendingNames}
  onPendingStreamsChange={setPendingNames}
/>
```

### Stream Mention Dropdown

Auto-suggest when typing hashtags:

```typescript
// components/streams/stream-mention-dropdown.tsx
<StreamMentionDropdown
  query={mentionQuery}
  onSelect={handleSelect}
  position={position}
/>
```

### Stream Header

Shows stream info on stream pages:

```typescript
// components/streams/stream-header.tsx
<StreamHeader stream={stream} />
```

## API Routes

### List Streams

```
GET /api/streams
Response: { streams: Stream[] }
```

### Create Stream (Idempotent)

```
POST /api/streams
Body: { name, description, isPrivate }
Response: { stream: Stream }
// Returns existing stream if name already exists
```

### Get Stream

```
GET /api/streams/[id]
Response: { stream: Stream }
```

### Update Stream

```
PUT /api/streams/[id]
Body: { description, isPrivate, status }
Response: { stream: Stream }
```

### Delete Stream (Owner Only)

```
DELETE /api/streams/[id]
Response: { success: true }
// Assets remain, just unlinked from stream
```

## Real-World Examples

### Startup Use Case

Map streams to initiatives:

```
#ios-app
#dashboard-redesign
#email-notifications
```

### Agency Use Case

Map streams to clients and projects:

```
#acme-corp-rebrand
#startup-x-website
#mobile-app-v2
```

### Design Team Use Case

Map streams to systems and sprints:

```
#design-system
#q4-2024
#mobile-first
#accessibility
```

### Multi-Dimensional Tagging

A single asset in multiple contexts:

```
Asset: "New button component"
Streams:
  - #design-system (it's a system component)
  - #mobile-app (used in mobile)
  - #accessibility (has a11y features)
  - #q4-2024 (created this quarter)
```

## Performance

### Indexes

```sql
CREATE INDEX idx_asset_streams_asset ON asset_streams(asset_id);
CREATE INDEX idx_asset_streams_stream ON asset_streams(stream_id);
CREATE INDEX idx_streams_name ON streams(name);
CREATE INDEX idx_streams_owner ON streams(owner_id);
```

### Pre-fetched with Assets

Streams are batch-fetched with assets to prevent N+1 queries:

```typescript
const { data } = await supabase
  .from('assets')
  .select(`
    *,
    asset_streams(streams(*))
  `);

// Transform to flat structure
const assets = data.map(asset => ({
  ...asset,
  streams: asset.asset_streams?.map(rel => rel.streams) || []
}));
```

## Testing

### Create Stream

```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"name":"test-stream","description":"Test"}'
```

### Get Stream Assets

```bash
curl http://localhost:3000/api/streams/[stream-id]
```

### Upload with Streams

```bash
# In UI: Upload asset and type #test-stream in description
# Stream created on Post if doesn't exist
```

## Edge Cases

### Duplicate Stream Names

Prevented by:
- Database UNIQUE constraint on `streams.name`
- Idempotent API returns existing stream

### Invalid Stream Names

Validated on client and server:
- Lowercase only (uppercase converted)
- No spaces (use hyphens)
- No special characters except hyphens
- 2-50 characters

### Archived Streams

Assets remain visible, but stream shows as archived on stream page.

### Private Streams

Visible only to owner. Assets in private streams are still publicly visible (privacy is per-stream, not per-asset).

### Removed Pending Streams

If user removes a pending stream pill before posting:
- Stream is not created
- Text in description remains as link/mention

## Troubleshooting

### Stream Not Created

Check hashtag format:
- Must start with `#`
- Lowercase (or will be converted)
- Use hyphens for spaces
- 2-50 characters

### Assets Not Appearing in Stream

Check `asset_streams` table:

```sql
SELECT * FROM asset_streams 
WHERE stream_id = 'your-stream-id';
```

### Stream Page 404

Verify stream exists:

```sql
SELECT * FROM streams WHERE name = 'stream-slug';
```

## Resources

- Database schema: `scripts/migrations/001_initial_schema.sql`
- Stream types: `lib/types/database.ts`
- Stream picker: `components/streams/stream-picker.tsx`
- Stream hooks: `lib/hooks/use-stream-mentions.ts`
- Dropdown options hook: `lib/hooks/use-stream-dropdown-options.ts`
- API routes: `app/api/streams/`

---

**Summary:** Streams provide flexible, multi-dimensional organization for assets. They combine the structure of projects with the flexibility of tags, supporting many-to-many relationships and semantic URLs.
