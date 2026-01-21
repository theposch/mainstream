# Database Schema Documentation

**Version:** 2.0  
**Last Updated:** January 2026  
**Database:** PostgreSQL 15+

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Diagram](#schema-diagram)
3. [Core Tables](#core-tables)
4. [Relationship Tables](#relationship-tables)
5. [Feature Tables](#feature-tables)
6. [Indexes](#indexes)
7. [Row Level Security](#row-level-security)
8. [Functions & Triggers](#functions--triggers)
9. [Views](#views)
10. [Data Types](#data-types)
11. [Appendices](#appendices)

---

## Overview

The Mainstream database uses PostgreSQL 15+ with the following characteristics:

- **Total Tables:** 25+ tables
- **Extensions:** uuid-ossp, pg_trgm, pg_cron (optional)
- **Security:** Row Level Security (RLS) on all tables
- **Real-time:** Replica identity FULL for subscriptions
- **Performance:** Comprehensive indexing strategy

### Schema Philosophy

1. **Normalized** - Minimal data duplication
2. **Denormalized Counters** - For performance (view_count, like_count)
3. **Soft Deletes** - ON DELETE CASCADE for most relationships
4. **Audit Trails** - created_at, updated_at timestamps
5. **Type Safety** - Enums via CHECK constraints

---

## Schema Diagram

### Entity Relationship Overview

```
┌──────────┐                           ┌──────────┐
│  users   │──────────────────────────▶│  teams   │
└────┬─────┘                           └──────────┘
     │
     │ (creates)
     ▼
┌──────────┐        ┌──────────────┐        ┌──────────┐
│ streams  │◀───────│asset_streams │───────▶│  assets  │
└────┬─────┘        └──────────────┘        └────┬─────┘
     │                                            │
     │                                            │
     ├──────────────┬──────────────┬─────────────┼──────────────┐
     │              │              │             │              │
     ▼              ▼              ▼             ▼              ▼
┌────────────┐ ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
│stream_     │ │stream_     │ │stream_    │ │asset_    │ │asset_    │
│follows     │ │bookmarks   │ │members    │ │likes     │ │views     │
└────────────┘ └────────────┘ └───────────┘ └──────────┘ └──────────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │asset_       │
                                            │comments     │
                                            └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │comment_     │
                                            │likes        │
                                            └─────────────┘

┌──────────┐        ┌────────────┐        ┌────────────┐
│  drops   │───────▶│drop_blocks │───────▶│drop_posts  │
└────┬─────┘        └────────────┘        │drop_image_ │
     │                                     │blocks      │
     │                                     └────────────┘
     ▼
┌──────────────┐
│drop_         │
│schedules     │
└──────────────┘

┌──────────────┐
│notifications │
└──────────────┘

┌──────────────┐
│user_follows  │
└──────────────┘

┌──────────────────────┐
│user_notification_    │
│settings              │
└──────────────────────┘
```

---

## Core Tables

### users

**Purpose:** User profiles and account information

**Schema:**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  job_title TEXT,
  location TEXT,
  platform_role TEXT DEFAULT 'user',  -- 'user', 'admin', 'owner'
  
  -- Integrations (encrypted)
  figma_access_token TEXT,
  figma_token_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);
```

**Indexes:**
- `idx_users_username` ON username (unique lookups)
- `idx_users_email` ON email (auth lookups)

**Relationships:**
- One-to-many with assets (uploader)
- One-to-many with streams (owner)
- One-to-many with drops (creator)
- Many-to-many with users (user_follows)
- Many-to-many with streams (stream_follows)

**RLS Policies:**
- SELECT: Public (all users visible)
- UPDATE: Own profile only
- DELETE: Own profile only (or admin)

---

### teams

**Purpose:** Team/organization information

**Schema:**

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);
```

**Note:** Currently not actively used. Prepared for future team features.

---

### streams

**Purpose:** Organizational units (like tags + collections combined)

**Schema:**

```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_type TEXT NOT NULL,  -- 'user' or 'team'
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',  -- 'active' or 'archived'
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_format CHECK (name ~ '^[a-z0-9-]+$'),
  CONSTRAINT name_length CHECK (char_length(name) BETWEEN 2 AND 50)
);
```

**Indexes:**
- `idx_streams_name` ON name (unique, lookups)
- `idx_streams_owner` ON owner_id (owner's streams)
- `idx_streams_is_private` ON is_private (public stream queries)

**Relationships:**
- Belongs-to user or team (owner)
- Many-to-many with assets (asset_streams)
- One-to-many with stream_follows
- One-to-many with stream_bookmarks
- One-to-many with stream_members (private streams)

**RLS Policies:**
- SELECT: Public streams visible to all, private streams to members only
- INSERT: Authenticated users
- UPDATE: Owner only
- DELETE: Owner only

**Special:** Uses SECURITY DEFINER function `can_access_stream()` to avoid recursive RLS.

---

### assets

**Purpose:** Uploaded designs, images, videos, and embeds

**Schema:**

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- 'image', 'video', 'embed'
  url TEXT NOT NULL,
  medium_url TEXT,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  uploader_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Asset type classification
  asset_type TEXT,  -- 'image', 'video', 'embed'
  
  -- Embed support
  embed_url TEXT,  -- Original URL (e.g., figma.com/file/...)
  embed_provider TEXT,  -- 'figma', 'loom', etc.
  
  -- Visibility
  visibility TEXT DEFAULT 'public',  -- 'public', 'unlisted'
  
  -- Denormalized counters (for performance)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT visibility_values CHECK (visibility IN ('public', 'unlisted'))
);
```

**Indexes:**
- `idx_assets_uploader_created` ON (uploader_id, created_at DESC) - User's assets
- `idx_assets_created` ON created_at DESC - Chronological feed
- `idx_assets_type` ON asset_type - Filter by type
- `idx_assets_visibility` ON visibility - Public assets

**Relationships:**
- Belongs-to user (uploader)
- Many-to-many with streams (asset_streams)
- One-to-many with asset_likes
- One-to-many with asset_views
- One-to-many with asset_comments

**RLS Policies:**
- SELECT: Public assets visible to all, unlisted via direct link
- INSERT: Authenticated users
- UPDATE: Owner only
- DELETE: Owner only

---

## Relationship Tables

### asset_streams

**Purpose:** Many-to-many relationship between assets and streams

**Schema:**

```sql
CREATE TABLE asset_streams (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (asset_id, stream_id)
);
```

**Indexes:**
- `idx_asset_streams_asset` ON asset_id - Asset's streams
- `idx_asset_streams_stream` ON stream_id - Stream's assets
- `idx_asset_streams_added_at` ON added_at DESC - Chronological

**Note:** `is_primary` marks the main stream for display purposes.

---

### user_follows

**Purpose:** User-to-user following relationships

**Schema:**

```sql
CREATE TABLE user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);
```

**Indexes:**
- `idx_user_follows_follower` ON follower_id - Who user follows
- `idx_user_follows_followed` ON followed_id - User's followers

---

### stream_follows

**Purpose:** User-to-stream following relationships

**Schema:**

```sql
CREATE TABLE stream_follows (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, stream_id)
);
```

**Indexes:**
- `idx_stream_follows_user` ON user_id - User's followed streams
- `idx_stream_follows_stream` ON stream_id - Stream's followers

---

### stream_bookmarks

**Purpose:** External links attached to streams

**Schema:**

```sql
CREATE TABLE stream_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  favicon_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_stream_bookmarks_stream` ON stream_id
- `idx_stream_bookmarks_created_by` ON created_by

**RLS Policies:**
- SELECT: Stream members/public
- INSERT: Stream members
- DELETE: Creator or stream owner

---

### stream_members

**Purpose:** Role-based access for private streams

**Schema:**

```sql
CREATE TABLE stream_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,  -- 'owner', 'admin', 'member'
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(stream_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);
```

**Indexes:**
- `idx_stream_members_stream` ON stream_id - Stream's members
- `idx_stream_members_user` ON user_id - User's memberships

**Roles:**
- **owner** - Full control, cannot be removed
- **admin** - Can add/remove regular members
- **member** - Can view and contribute

---

### asset_likes

**Purpose:** Track user likes on assets

**Schema:**

```sql
CREATE TABLE asset_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, asset_id)
);

-- Required for real-time filtering
ALTER TABLE asset_likes REPLICA IDENTITY FULL;
```

**Indexes:**
- `idx_asset_likes_asset` ON asset_id - Asset's likes
- `idx_asset_likes_user` ON user_id - User's likes

**Trigger:** Maintains `assets.like_count` denormalized counter.

---

### asset_views

**Purpose:** Track who viewed each asset

**Schema:**

```sql
CREATE TABLE asset_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(asset_id, user_id)  -- One view per user per asset
);
```

**Indexes:**
- `idx_asset_views_asset_viewed` ON (asset_id, viewed_at DESC) - Viewer list
- `idx_asset_views_user` ON user_id - User's viewed assets

**Behavior:**
- Unique constraint = idempotent
- Owner views not counted
- Triggers increment `assets.view_count`

---

### asset_comments

**Purpose:** Comments on assets

**Schema:**

```sql
CREATE TABLE asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT content_length CHECK (char_length(content) BETWEEN 1 AND 2000)
);

-- Required for real-time
ALTER TABLE asset_comments REPLICA IDENTITY FULL;
```

**Indexes:**
- `idx_asset_comments_asset` ON asset_id - Asset's comments
- `idx_asset_comments_user` ON user_id - User's comments
- `idx_asset_comments_created` ON created_at DESC - Chronological

**Note:** No nested replies (single-level comments only).

---

### comment_likes

**Purpose:** Likes on comments

**Schema:**

```sql
CREATE TABLE comment_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, comment_id)
);

-- Required for real-time
ALTER TABLE comment_likes REPLICA IDENTITY FULL;
```

---

## Feature Tables

### drops

**Purpose:** AI-powered newsletters

**Schema:**

```sql
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES drop_schedules(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',  -- 'draft', 'published'
  published_at TIMESTAMP WITH TIME ZONE,
  is_superseded BOOLEAN DEFAULT FALSE,  -- Replaced by newer scheduled drop
  
  -- Filters used to generate drop
  date_range_start DATE,
  date_range_end DATE,
  filter_stream_ids UUID[],
  filter_user_ids UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published'))
);
```

**Indexes:**
- `idx_drops_creator` ON creator_id
- `idx_drops_schedule` ON schedule_id
- `idx_drops_status` ON status
- `idx_drops_published` ON published_at DESC

**Relationships:**
- Belongs-to user (creator)
- Belongs-to drop_schedule (optional)
- One-to-many with drop_blocks

---

### drop_blocks

**Purpose:** Notion-like blocks in drop editor

**Schema:**

```sql
CREATE TABLE drop_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'text', 'heading', 'post', 'gallery'
  content TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_block_type CHECK (type IN ('text', 'heading', 'post', 'gallery'))
);
```

**Indexes:**
- `idx_drop_blocks_drop_position` ON (drop_id, position) - Ordered blocks

---

### drop_posts

**Purpose:** Asset references in drop blocks

**Schema:**

```sql
CREATE TABLE drop_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES drop_blocks(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  display_mode TEXT DEFAULT 'fit',  -- 'fit', 'cover'
  crop_position_x DECIMAL(3,2) DEFAULT 0.5,  -- 0.0 to 1.0
  crop_position_y DECIMAL(3,2) DEFAULT 0.5,  -- 0.0 to 1.0
  position INTEGER NOT NULL,
  
  CONSTRAINT valid_display_mode CHECK (display_mode IN ('fit', 'cover'))
);
```

---

### drop_image_blocks

**Purpose:** Multi-image gallery blocks

**Schema:**

```sql
CREATE TABLE drop_image_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES drop_blocks(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  display_mode TEXT DEFAULT 'fit',
  crop_position_x DECIMAL(3,2) DEFAULT 0.5,
  crop_position_y DECIMAL(3,2) DEFAULT 0.5,
  position INTEGER NOT NULL
);
```

---

### drop_schedules

**Purpose:** Recurring drop generation automation

**Schema:**

```sql
CREATE TABLE drop_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  
  -- Frequency configuration
  frequency TEXT NOT NULL,  -- 'weekly', 'biweekly', 'monthly', 'custom'
  day_of_week INTEGER,  -- 0-6 (Sunday-Saturday) for weekly
  day_of_month INTEGER,  -- 1-31 for monthly
  custom_interval_days INTEGER,  -- For custom frequency
  generation_time TIME NOT NULL,  -- Time of day to generate
  timezone TEXT NOT NULL,
  
  -- Content filters
  stream_ids UUID[],
  user_ids UUID[],
  date_range_mode TEXT,  -- 'last_n_days', 'since_last'
  date_range_days INTEGER,
  
  -- State
  status TEXT DEFAULT 'active',  -- 'active', 'paused'
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_frequency CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused'))
);
```

**Indexes:**
- `idx_drop_schedules_created_by` ON created_by
- `idx_drop_schedules_next_run` ON next_run_at - Cron queries
- `idx_drop_schedules_status` ON status

---

### notifications

**Purpose:** Activity feed and alerts

**Schema:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'like', 'comment', 'follow', 'mention', 'comment_like'
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (
    type IN ('like', 'comment', 'follow', 'mention', 'comment_like')
  )
);

-- Required for real-time
ALTER TABLE notifications REPLICA IDENTITY FULL;
```

**Indexes:**
- `idx_notifications_user_created` ON (user_id, created_at DESC) - User's feed
- `idx_notifications_user_unread` ON (user_id, is_read) - Unread count
- `idx_notifications_asset` ON asset_id - Asset notifications
- `idx_notifications_comment` ON comment_id - Comment deep linking

---

### user_notification_settings

**Purpose:** Per-user notification preferences

**Schema:**

```sql
CREATE TABLE user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  likes_enabled BOOLEAN DEFAULT TRUE,
  comments_enabled BOOLEAN DEFAULT TRUE,
  follows_enabled BOOLEAN DEFAULT TRUE,
  mentions_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Default:** All notifications enabled for new users.

**Behavior:** Checked before creating notifications.

---

## Indexes

### Index Strategy

**Purpose-Based Indexing:**

1. **Foreign Keys** - Always indexed
2. **WHERE Clauses** - Common filters
3. **ORDER BY** - Sort fields
4. **Composite** - Multiple-column queries
5. **Partial** - Conditional indexes

### Critical Indexes

```sql
-- Assets by user (profile page)
CREATE INDEX idx_assets_uploader_created 
  ON assets(uploader_id, created_at DESC);

-- Assets by stream (stream page)
CREATE INDEX idx_asset_streams_stream_added 
  ON asset_streams(stream_id, added_at DESC);

-- Public assets (feed)
CREATE INDEX idx_assets_public_created 
  ON assets(created_at DESC) 
  WHERE visibility = 'public';

-- Stream followers
CREATE INDEX idx_stream_follows_stream 
  ON stream_follows(stream_id);

-- User follows
CREATE INDEX idx_user_follows_follower 
  ON user_follows(follower_id);

-- Notifications
CREATE INDEX idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Unread notifications count
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = FALSE;

-- Schedule processing (cron)
CREATE INDEX idx_drop_schedules_next_run 
  ON drop_schedules(next_run_at) 
  WHERE status = 'active';
```

---

## Row Level Security

### RLS Philosophy

**Every table has RLS enabled:**

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Policy Types:**

1. **Public Read** - Anyone can SELECT
2. **Authenticated Write** - Logged-in users can INSERT
3. **Owner Only** - User can UPDATE/DELETE own rows
4. **Role-Based** - Admin/owner have special access

### Example Policies

**Assets Table:**

```sql
-- Public read for public assets
CREATE POLICY "Public assets viewable by everyone"
  ON assets FOR SELECT
  USING (visibility = 'public');

-- Authenticated users can insert
CREATE POLICY "Authenticated users can upload"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

-- Owner can update
CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploader_id);

-- Owner can delete
CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  TO authenticated
  USING (auth.uid() = uploader_id);
```

**Private Streams:**

```sql
-- Uses SECURITY DEFINER function to avoid recursive RLS
CREATE FUNCTION can_access_stream(stream_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stream_record streams%ROWTYPE;
BEGIN
  SELECT * INTO stream_record FROM streams WHERE id = stream_id;
  
  -- Public streams
  IF NOT stream_record.is_private THEN
    RETURN TRUE;
  END IF;
  
  -- Owner
  IF stream_record.owner_id = user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Member
  IF EXISTS (
    SELECT 1 FROM stream_members 
    WHERE stream_members.stream_id = stream_id 
    AND stream_members.user_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

CREATE POLICY "Stream members can access"
  ON streams FOR SELECT
  USING (can_access_stream(id, auth.uid()));
```

---

## Functions & Triggers

### Auth User Trigger

**Purpose:** Auto-create user profile when auth user is created

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, email, platform_role)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    -- First user is owner, rest are users
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.users) THEN 'owner'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Like Count Trigger

**Purpose:** Maintain denormalized like_count on assets

```sql
CREATE FUNCTION update_asset_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE assets 
    SET like_count = like_count + 1 
    WHERE id = NEW.asset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE assets 
    SET like_count = like_count - 1 
    WHERE id = OLD.asset_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_like_count_trigger
  AFTER INSERT OR DELETE ON asset_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_like_count();
```

### View Count RPC

**Purpose:** Atomic view recording with idempotency

```sql
CREATE FUNCTION record_asset_view(
  p_asset_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert or update view record
  INSERT INTO asset_views (asset_id, user_id, viewed_at)
  VALUES (p_asset_id, p_user_id, NOW())
  ON CONFLICT (asset_id, user_id) 
  DO UPDATE SET viewed_at = NOW();
  
  -- Increment counter (idempotent)
  UPDATE assets 
  SET view_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM asset_views 
    WHERE asset_id = p_asset_id
  )
  WHERE id = p_asset_id
  RETURNING view_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Views

### Currently No Views

Future candidates for views:

- **Popular assets** - Most liked/viewed in timeframe
- **Trending streams** - Most active streams
- **User stats** - Aggregated user activity

---

## Data Types

### Custom Types

**Enums (via CHECK constraints):**

```sql
-- Asset visibility
CONSTRAINT visibility_values CHECK (visibility IN ('public', 'unlisted'))

-- Drop status
CONSTRAINT valid_status CHECK (status IN ('draft', 'published'))

-- Stream member role
CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))

-- Notification type
CONSTRAINT valid_notification_type CHECK (
  type IN ('like', 'comment', 'follow', 'mention', 'comment_like')
)
```

**Arrays:**

```sql
-- Stream IDs array
filter_stream_ids UUID[]

-- User IDs array
filter_user_ids UUID[]
```

**Timestamps:**

All timestamps use `TIMESTAMP WITH TIME ZONE` for timezone support.

---

## Appendices

### A. Database Statistics

**Current Size Estimates:**

- **Total Tables:** 25 tables
- **Total Indexes:** 50+ indexes
- **RLS Policies:** 80+ policies
- **Functions:** 10+ functions
- **Triggers:** 5+ triggers

**Typical Data Volumes:**

| Table | Rows (estimate) |
|-------|----------------|
| users | 1K-100K |
| assets | 10K-1M |
| streams | 100-10K |
| asset_likes | 100K-10M |
| asset_comments | 10K-1M |
| notifications | 100K-10M |

### B. Migration History

See [MIGRATIONS.md](./MIGRATIONS.md) for complete migration history.

### C. Performance Tuning

**Query Performance:**

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### D. Backup & Restore

**Backup:**

```bash
# Full database
pg_dump $DATABASE_URL > backup.sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema.sql

# Data only
pg_dump --data-only $DATABASE_URL > data.sql
```

**Restore:**

```bash
psql $DATABASE_URL < backup.sql
```

### E. Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Schema Documentation](https://supabase.com/docs/guides/database)
- [Database Design](https://www.postgresql.org/docs/current/ddl.html)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**For migration procedures, see [MIGRATIONS.md](./MIGRATIONS.md)**

**For API usage, see [API_REFERENCE.md](./API_REFERENCE.md)**

**For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md)**
