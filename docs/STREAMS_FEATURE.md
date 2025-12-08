# Streams Feature

**Status:** ✅ Fully implemented and functional  
**Last Updated:** December 2025

## Overview

**Streams** are the primary organizational unit in Mainstream. They're a hybrid between projects and tags, supporting many-to-many relationships with assets.

### Features
- ✅ **Stream Following** - Follow streams to see their posts in your Following feed
- ✅ **Stream Bookmarks** - Add external links (Jira, Figma, Notion) with favicons
- ✅ **Contributor Tooltip** - Hover to see who has posted to the stream
- ✅ **Two-Row Header** - Clean layout with title, metadata, and bookmarks
- ✅ **Multiple Asset Types** - Images, animated GIFs, and Figma embeds all belong to streams
- ✅ **Private Stream Members** - Add/remove users to private streams
- ✅ **Stream Editing** - Edit name, description, and privacy settings

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

CREATE TABLE stream_members (
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);
```

### Stream Member

```typescript
interface StreamMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';  // 'owner' is virtual (from stream.owner_id)
  joined_at: string;
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}
```

## Features

### Stream Following

Users can follow streams to receive updates in their Following feed:

```typescript
// Follow a stream
POST /api/streams/[id]/follow

// Unfollow a stream
DELETE /api/streams/[id]/follow

// Get follow status (includes contributor count, asset count)
GET /api/streams/[id]/follow
// Returns: { isFollowing, followerCount, followers, contributorCount, contributors, assetCount }
```

**Database Table:**
```sql
CREATE TABLE stream_follows (
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);
```

**Following Feed Integration:**
- Assets from followed streams appear in the "Following" tab
- Merges with assets from followed users
- Deduplication prevents showing the same asset twice

### Stream Bookmarks

Streams can have external links (bookmarks) for resources like Jira, Figma, Notion:

```typescript
// Get bookmarks for a stream
GET /api/streams/[id]/bookmarks

// Add a bookmark (any authenticated user)
POST /api/streams/[id]/bookmarks
{ "url": "https://figma.com/...", "title": "Designs" }

// Delete a bookmark (creator or stream owner only)
DELETE /api/streams/[id]/bookmarks/[bookmarkId]
```

**Database Table:**
```sql
CREATE TABLE stream_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**UI Features:**
- Favicons fetched via Google's favicon service
- Responsive display: 1 on mobile, 4 on tablet, 6 on desktop
- Overflow dropdown for additional bookmarks
- Delete button on hover (for authorized users)

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

**Row 1 - Primary:**
- Stream title with `#` prefix
- Description (if set)
- Action buttons: More menu, Create Drop, Follow

**Row 2 - Info Bar:**
- Metadata: visibility, contributor count (with tooltip), post count
- Bookmarks row with favicons
- Divider line

**Features:**
- Follow/unfollow with optimistic updates
- Add bookmarks (any contributor)
- Delete stream (owner only)
- Create Drop button pre-selects this stream

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

Shows stream info, follow button, and bookmarks:

```typescript
// components/streams/stream-header.tsx
<StreamHeader 
  stream={stream}
  initialFollowData={initialFollowData}  // Server-prefetched
  initialBookmarks={initialBookmarks}     // Server-prefetched
  currentUser={currentUser}
/>
```

### Add Bookmark Dialog

Dialog for adding external links:

```typescript
// components/streams/add-bookmark-dialog.tsx
<AddBookmarkDialog
  open={open}
  onOpenChange={setOpen}
  onSubmit={(url, title) => addBookmark(url, title)}
/>
```

### Manage Members Dialog

Dialog for managing private stream members:

```typescript
// components/streams/manage-members-dialog.tsx
<ManageMembersDialog
  open={open}
  onOpenChange={setOpen}
  streamId={stream.id}
  streamOwnerId={stream.owner_id}
/>
```

**Features:**
- Search users to add
- Display current members with roles (Owner/Admin/Member)
- Remove members (with permissions)
- Owner badge and role icons

### Stream Dialog (Create/Edit)

Dual-mode dialog for creating and editing streams:

```typescript
// components/layout/stream-dialog.tsx

// Create mode
<StreamDialog open={open} onOpenChange={setOpen} mode="create" />

// Edit mode
<StreamDialog 
  open={open} 
  onOpenChange={setOpen} 
  mode="edit" 
  stream={stream}
  onSuccess={(stream) => router.refresh()}
/>
```

**Features:**
- Name validation with availability check
- Description with character count
- Privacy toggle (public/private)
- Auto-redirect on name change

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

### Follow Stream

```
POST /api/streams/[id]/follow
Response: { success: true }
```

### Unfollow Stream

```
DELETE /api/streams/[id]/follow
Response: { success: true }
```

### Get Follow Status

```
GET /api/streams/[id]/follow
Response: {
  isFollowing: boolean,
  followerCount: number,
  followers: User[],
  contributorCount: number,
  contributors: User[],
  assetCount: number
}
```

### List Bookmarks

```
GET /api/streams/[id]/bookmarks
Response: { bookmarks: StreamBookmark[] }
```

### Add Bookmark

```
POST /api/streams/[id]/bookmarks
Body: { url: string, title?: string }
Response: { bookmark: StreamBookmark }
```

### Delete Bookmark

```
DELETE /api/streams/[id]/bookmarks/[bookmarkId]
Response: { success: true }
// Only creator or stream owner can delete
```

### List Members (Private Streams)

```
GET /api/streams/[id]/members
Response: {
  members: StreamMember[],
  memberCount: number,
  currentUserRole: 'owner' | 'admin' | 'member' | null,
  owner: { id, username, display_name, avatar_url }
}
// Returns owner info separately (not in members array)
```

### Add Member (Owner/Admin Only)

```
POST /api/streams/[id]/members
Body: { user_id: string, role?: 'admin' | 'member' }
Response: { member: StreamMember }
// Idempotent - returns existing member if already added
```

### Remove Member (Owner/Admin Only)

```
DELETE /api/streams/[id]/members?user_id=xxx
Response: { success: true }
// Users can remove themselves; admins can't remove other admins
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
-- Core stream indexes
CREATE INDEX idx_asset_streams_asset ON asset_streams(asset_id);
CREATE INDEX idx_asset_streams_stream ON asset_streams(stream_id);
CREATE INDEX idx_streams_name ON streams(name);
CREATE INDEX idx_streams_owner ON streams(owner_id);

-- Stream follows indexes
CREATE INDEX idx_stream_follows_stream_id ON stream_follows(stream_id);
CREATE INDEX idx_stream_follows_user_id ON stream_follows(user_id);

-- Stream bookmarks indexes
CREATE INDEX idx_stream_bookmarks_stream_id ON stream_bookmarks(stream_id);
CREATE INDEX idx_stream_bookmarks_created_by ON stream_bookmarks(created_by);
```

### Server-Side Prefetch

Stream pages load instantly by prefetching all data server-side:

```typescript
// app/stream/[slug]/page.tsx
const [streamResult, followResult, bookmarksResult, ...] = await Promise.all([
  supabase.from('streams').select('*').eq('name', slug).single(),
  supabase.from('stream_follows').select('*', { count: 'exact', head: true }),
  supabase.from('stream_bookmarks').select('*'),
  // 9 parallel queries total
]);

// Pass to client component - no client-side fetches needed
<StreamHeader initialFollowData={...} initialBookmarks={...} />
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

Private streams have restricted access with member management:

**Access Control:**
- Owner has full access (view, edit, delete, manage members)
- Members (added via Manage Members) can view and contribute
- Admins can add/remove regular members
- Non-members cannot see the stream exists (404)

**Member Roles:**
- `owner` - Stream creator, cannot be removed
- `admin` - Can add/remove members (except other admins)
- `member` - Can view and contribute to the stream

**Note:** Assets in private streams are still accessible via direct link. Privacy is per-stream membership, not per-asset.

### Stream Editing

Stream owners can edit their streams:
- **Name** - Updates URL (auto-redirects to new slug)
- **Description** - Update stream description
- **Privacy** - Toggle between public and private

Access via stream header dropdown menu → "Edit Stream"

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

### Database
- Schema: `scripts/migrations/001_initial_schema.sql`
- Stream follows: `scripts/migrations/003_stream_follows.sql`
- Stream bookmarks: `scripts/migrations/004_stream_bookmarks.sql`
- Stream members RLS: `scripts/migrations/032_stream_members_rls_policies.sql`
- Streams RLS for members: `scripts/migrations/033_fix_streams_rls_for_members.sql`

### Types
- `lib/types/database.ts` - StreamFollow, StreamBookmark, StreamMember

### Hooks
- `lib/hooks/use-stream-follow.ts` - Follow/unfollow streams
- `lib/hooks/use-stream-bookmarks.ts` - CRUD for bookmarks
- `lib/hooks/use-stream-members.ts` - Member management with optimistic updates
- `lib/hooks/use-stream-mentions.ts` - Parse hashtags
- `lib/hooks/use-stream-dropdown-options.ts` - Shared dropdown logic

### Components
- `components/streams/stream-picker.tsx` - Select streams during upload
- `components/streams/stream-header.tsx` - Stream page header
- `components/streams/add-bookmark-dialog.tsx` - Add external links
- `components/streams/manage-members-dialog.tsx` - Add/remove members
- `components/layout/stream-dialog.tsx` - Create/edit streams (dual-mode)

### API Routes
- `app/api/streams/` - CRUD operations
- `app/api/streams/[id]/follow/` - Follow/unfollow
- `app/api/streams/[id]/bookmarks/` - Bookmark management
- `app/api/streams/[id]/members/` - Member management
- `app/api/streams/[id]/assets/` - Asset access control
- `app/api/streams/[id]/bookmarks/` - Bookmark access control

---

**Summary:** Streams provide flexible, multi-dimensional organization for assets. They combine the structure of projects with the flexibility of tags, supporting many-to-many relationships and semantic URLs. Users can follow streams to see their posts in the Following feed. Private streams support member management with role-based access control (owner/admin/member).
