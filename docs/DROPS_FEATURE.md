# Drops Feature Documentation

## Overview

**Drops** is Mainstream's AI-powered newsletter feature that summarizes your team's weekly design work. It replaces lengthy internal newsletters by automatically collecting posts and generating summaries that can be shared with stakeholders via email.

## Core Concepts

### What is a Drop?
A Drop is a curated collection of posts (design assets) organized into a newsletter format. Each drop has:
- **Title**: The newsletter headline
- **Description**: AI-generated or manually written summary (supports AI enhancement)
- **Contributors**: Automatically populated from the posts' uploaders
- **Blocks**: Content organized in a Notion-like block structure

### Drop Statuses
- `draft` - Being edited, only visible to creator
- `published` - Finalized and shareable, can be sent as email

---

## Feature Components

### 1. Drops Listing Page (`/drops`)

**Location**: `app/drops/page.tsx`, `app/drops/drops-page-client.tsx`

Three tabs for filtering drops:

| Tab | Description |
|-----|-------------|
| All Drops | Published drops from everyone |
| Weekly | Auto-generated weekly summaries |
| My Drafts | Your unpublished drops |

**Components**:
- `DropsGrid` - Grid layout for drop cards
- `DropCard` - Individual drop preview card

### 2. Create Drop Dialog

**Location**: `components/drops/create-drop-dialog.tsx`

When creating a new drop, users can configure:
- **Title**: Required name for the drop
- **Date Range**: Filter posts by creation date
- **Stream Filters**: Only include posts from specific streams
- **User Filters**: Only include posts from specific people

### 3. Block-Based Editor

**Location**: `app/drops/[id]/edit/drop-blocks-editor-client.tsx`

A Notion-like editor with draggable blocks. The editor has a fixed structure:

```
+-------------------------------------+
|  Title (editable inline)            |
|  Description (with AI generate btn) |
|  Contributors (auto-populated)      |
|  ----------- divider -----------    |
|                                     |
|  [Block 1]                          |
|  [Block 2]                          |
|  [+ Add Block]                      |
|  ...                                |
+-------------------------------------+
```

**Fixed Elements** (cannot be removed):
- Title input
- Description field with AI generation button
- Contributors section (avatars of post creators)
- Divider line

---

## Block Types

All blocks are defined in `lib/types/database.ts` and rendered by `components/drops/blocks/block-renderer.tsx`.

### Text Block
Plain text content for commentary between posts.

```typescript
{
  type: 'text',
  content: 'Your custom commentary here...'
}
```

### Heading Block
Section headers with three levels (H1, H2, H3).

```typescript
{
  type: 'heading',
  content: 'Section Title',
  heading_level: 1 | 2 | 3
}
```

### Post Block
Standard post display with image, title, description, and uploader info.

```typescript
{
  type: 'post',
  asset_id: 'uuid',
  display_mode: 'auto' | 'fit' | 'cover',
  crop_position_x: 50,  // 0-100
  crop_position_y: 0    // 0-100
}
```

**Display Modes**:
- `auto` - Smart detection based on image dimensions
- `fit` - Show entire image (object-fit: contain)
- `cover` - Crop to fill (object-fit: cover)

**Asset Selection**:
When adding a post or gallery block, users can:
- **Browse Posts**: Select from existing posts in the platform
- **Upload New**: Upload a new image directly (drag & drop supported, 10MB limit)

**Unlisted Assets**:
Images uploaded directly through the drop editor are marked as "unlisted". This means:
- ✅ They can be used in drops and sent in emails
- ✅ They are accessible via direct link
- ❌ They do NOT appear in the main feed
- ❌ They do NOT appear in search results
- ❌ They do NOT appear on the uploader's profile

This is useful for including images in newsletters that shouldn't be shared as regular posts (e.g., charts, diagrams, or supplementary visuals).

### Featured Post Block
Larger display for highlighted posts. Same properties as Post Block.

```typescript
{
  type: 'featured_post',
  asset_id: 'uuid',
  display_mode: 'cover',
  ...
}
```

### Divider Block
Horizontal line separator.

```typescript
{
  type: 'divider'
}
```

### Quote Block
Styled quote/callout block.

```typescript
{
  type: 'quote',
  content: 'Highlighted quote or note...'
}
```

### Image Gallery Block
Group multiple images with two layout options.

```typescript
{
  type: 'image_gallery',
  gallery_layout: 'grid' | 'featured',
  gallery_featured_index: 0,  // Which image is large in 'featured' layout
  gallery_images: [...]       // Array of DropBlockGalleryImage
}
```

**Gallery Layouts**:
- `grid` - 2x2 equal-sized grid
- `featured` - One large image with smaller thumbnails below

**Adding Images**:
- Multi-select from existing posts
- Upload new images directly with drag & drop
- Toggle layout mode on hover (like Fit/Cover controls)

---

## AI Features

### Description Generation
**Location**: `app/api/drops/[id]/generate/route.ts`

The AI analyzes all posts in the drop and generates a cohesive summary. It:
- Describes what designs were shared
- Highlights key themes and projects
- Maintains a professional but friendly tone

**Usage**: Click the sparkle button next to the description field.

### Enhancement Mode
If the description field already has content, AI will **enhance** the existing text rather than replacing it.

---

## Email Delivery

### React Email Components
The drop content is built using React Email components to ensure it renders correctly in both the web app and email clients.

**Key Files**:
- `components/drops/blocks/email-block-renderer.tsx` - Server-side block rendering
- `components/drops/blocks/email-drop-view.tsx` - Full drop email template

### Email Preview
**Location**: `app/api/drops/[id]/email-preview/route.ts`

Generates HTML preview of how the drop will appear in email.

### Publishing and Sending
**Location**: `app/api/drops/[id]/publish/route.ts`

When publishing, drops can be sent via Resend email API (requires `RESEND_API_KEY`).

---

## Database Schema

### Tables

#### drops
```sql
CREATE TABLE drops (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  created_by UUID REFERENCES users(id),
  published_at TIMESTAMP WITH TIME ZONE,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  filter_stream_ids UUID[],
  filter_user_ids UUID[],
  is_weekly BOOLEAN DEFAULT FALSE,
  use_blocks BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### drop_blocks
```sql
CREATE TABLE drop_blocks (
  id UUID PRIMARY KEY,
  drop_id UUID REFERENCES drops(id),
  type TEXT NOT NULL,  -- 'text', 'heading', 'post', etc.
  position INT NOT NULL,
  content TEXT,                    -- For text/heading/quote
  heading_level INT,               -- 1, 2, or 3
  asset_id UUID REFERENCES assets(id),
  display_mode TEXT DEFAULT 'auto',
  crop_position_x REAL DEFAULT 50,
  crop_position_y REAL DEFAULT 0,
  gallery_layout TEXT DEFAULT 'grid',
  gallery_featured_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

#### drop_block_gallery_images
```sql
CREATE TABLE drop_block_gallery_images (
  id UUID PRIMARY KEY,
  block_id UUID REFERENCES drop_blocks(id),
  asset_id UUID REFERENCES assets(id),
  position INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(block_id, asset_id)
);
```

#### drop_posts (Legacy)
Used for classic layout, still supported for backward compatibility.

```sql
CREATE TABLE drop_posts (
  drop_id UUID REFERENCES drops(id),
  asset_id UUID REFERENCES assets(id),
  position INT NOT NULL,
  display_mode TEXT DEFAULT 'auto',
  crop_position_x REAL DEFAULT 50,
  crop_position_y REAL DEFAULT 0,
  PRIMARY KEY (drop_id, asset_id)
);
```

### Migrations
Located in `scripts/migrations/`:
- `018_add_drops.sql` - Base drops and drop_posts tables
- `019_add_drop_post_display_mode.sql` - Display mode column
- `020_add_drop_post_crop_position.sql` - Crop position columns
- `021_add_drop_blocks.sql` - Block-based editor tables
- `022_add_image_gallery_block.sql` - Gallery block support

---

## API Endpoints

### Drops

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drops` | List drops (with filters) |
| POST | `/api/drops` | Create new drop |
| GET | `/api/drops/[id]` | Get single drop |
| PATCH | `/api/drops/[id]` | Update drop |
| DELETE | `/api/drops/[id]` | Delete drop |

### Drop Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/drops/[id]/generate` | Generate AI description |
| POST | `/api/drops/[id]/publish` | Publish drop (+ optional email) |
| GET | `/api/drops/[id]/email-preview` | Get email HTML preview |

### Blocks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/drops/[id]/blocks` | Add new block |
| PUT | `/api/drops/[id]/blocks` | Reorder blocks |
| PATCH | `/api/drops/[id]/blocks/[blockId]` | Update block |
| DELETE | `/api/drops/[id]/blocks/[blockId]` | Delete block |

### Gallery Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/drops/[id]/blocks/[blockId]/gallery` | Add images to gallery |
| DELETE | `/api/drops/[id]/blocks/[blockId]/gallery/[imageId]` | Remove image |

### Posts (Legacy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/drops/[id]/posts` | Add posts to drop |
| DELETE | `/api/drops/[id]/posts/[postId]` | Remove post |
| PATCH | `/api/drops/[id]/posts/[postId]/display-mode` | Update display settings |

---

## UI Components

### Block Editor Components
```
components/drops/blocks/
  block-editor.tsx         # Main interactive editor
  block-renderer.tsx       # Client-side block rendering
  drop-blocks-view.tsx     # Preview/published view
  email-block-renderer.tsx # Server-side email rendering
  email-drop-view.tsx      # Full email template
  index.ts                 # Exports
```

### Drop Components
```
components/drops/
  create-drop-dialog.tsx   # New drop creation form
  drop-card.tsx            # Grid card preview
  drop-publish-dialog.tsx  # Publish confirmation
  drop-view.tsx            # Classic layout view
  drops-grid.tsx           # Grid container
```

---

## Environment Variables

```env
# Required for AI features
LITELLM_BASE_URL=https://your-litellm-instance.com
LITELLM_API_KEY=your-api-key
LITELLM_MODEL=gemini/gemini-2.5-flash-preview-05-20

# Optional for email delivery
RESEND_API_KEY=re_your-resend-key
```

---

## Supported Asset Types

Drops support all asset types:
- **Images**: JPEG, PNG, WebP, GIF (including animated)
- **Videos**: WebM (up to 50MB, autoplays in email as static preview)
- **Embeds**: Figma, Loom (renders as clickable thumbnail in email)

---

## Future Enhancements

Planned features not yet implemented:
- Auto-generate weekly drops every Friday (cron job)
- Link embed blocks (URL preview cards)
- Workspace-specific drops
- Email recipient management
- Drop templates
- Analytics/tracking for sent emails

