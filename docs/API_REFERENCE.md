# Mainstream API Reference

**Version:** 2.0  
**Last Updated:** January 2026  
**Base URL:** `http://localhost:3000` (development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Assets API](#assets-api)
6. [Streams API](#streams-api)
7. [Users API](#users-api)
8. [Drops API](#drops-api)
9. [Schedules API](#schedules-api)
10. [Comments API](#comments-api)
11. [Notifications API](#notifications-api)
12. [Search API](#search-api)
13. [Admin API](#admin-api)
14. [Cron API](#cron-api)
15. [Appendices](#appendices)

---

## Overview

The Mainstream API is a RESTful API built on Next.js 15 App Router. All endpoints return JSON and require standard HTTP methods (GET, POST, PATCH, DELETE).

### Quick Reference

| Resource | Base Endpoint | Description |
|----------|--------------|-------------|
| Assets | `/api/assets` | Designs, images, videos, embeds |
| Streams | `/api/streams` | Organizational units |
| Users | `/api/users` | User profiles and settings |
| Drops | `/api/drops` | AI-powered newsletters |
| Schedules | `/api/schedules` | Recurring drop automation |
| Comments | `/api/comments` | Asset comments and replies |
| Notifications | `/api/notifications` | Activity feed |
| Search | `/api/search` | Global search |
| Admin | `/api/admin` | Admin operations |
| Cron | `/api/cron` | Background jobs |

### API Characteristics

- **RESTful** - Standard HTTP methods and status codes
- **JSON** - All request/response bodies are JSON
- **JWT Auth** - Session-based authentication
- **Real-time** - WebSocket subscriptions available
- **Pagination** - Cursor-based for large datasets
- **Optimistic** - Designed for optimistic UI patterns

---

## Authentication

### Session-Based Authentication

Mainstream uses JWT tokens stored in httpOnly cookies. No manual token management required in API calls.

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Sets Cookie:**
```
Set-Cookie: sb-access-token=...; HttpOnly; Secure; SameSite=Strict
```

#### Logout

```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true
}
```

### Protected Endpoints

Most endpoints require authentication. Unauthenticated requests return 401:

```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

### Getting Current User

```typescript
// Server-side
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

// Client-side
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

---

## Common Patterns

### Pagination

**Offset-based pagination:**

```http
GET /api/assets?limit=20&offset=0
```

**Parameters:**
- `limit` - Items per page (default: 20, max: 100)
- `offset` - Number of items to skip (default: 0)

**Response includes pagination metadata:**

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Filtering

**Query parameters for filtering:**

```http
GET /api/assets?type=image&visibility=public&uploader_id=uuid
```

Common filters:
- `type` - Asset type filter
- `visibility` - public/unlisted
- `stream_id` - Filter by stream
- `uploader_id` - Filter by user

### Sorting

```http
GET /api/assets?sort=created_at&order=desc
```

Parameters:
- `sort` - Field to sort by
- `order` - `asc` or `desc` (default: desc)

### Including Related Data

```http
GET /api/assets/{id}?include=uploader,streams,likes
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Design",
    "uploader": {
      "id": "uuid",
      "username": "johndoe"
    },
    "streams": [
      { "id": "uuid", "name": "mobile-app" }
    ],
    "likeCount": 15,
    "isLikedByCurrentUser": true
  }
}
```

### Optimistic Updates

API designed for optimistic UI patterns:

1. Update UI immediately
2. Send request to API
3. On success: no action (already updated)
4. On error: rollback UI

Example (client-side):

```typescript
// 1. Optimistic update
setLiked(true);
setLikeCount(prev => prev + 1);

try {
  // 2. API request
  await fetch(`/api/assets/${id}/like`, { method: 'POST' });
  // 3. Success - UI already updated
} catch (error) {
  // 4. Rollback
  setLiked(false);
  setLikeCount(prev => prev - 1);
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable | Invalid data format |
| 500 | Server Error | Internal error |

### Error Response Format

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "title",
    "message": "Title is required"
  }
}
```

**Fields:**
- `error` - Human-readable message
- `code` - Machine-readable error code
- `details` - Additional context (optional)

### Common Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | User not authenticated |
| `FORBIDDEN` | User not authorized for action |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `DUPLICATE` | Resource already exists |
| `RATE_LIMIT` | Too many requests |

---

## Assets API

Manage design assets (images, videos, embeds).

### List Assets

```http
GET /api/assets
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset (default: 0)
- `type` - Filter by asset type (`image`, `video`, `embed`)
- `visibility` - Filter by visibility (`public`, `unlisted`)
- `stream_id` - Filter by stream
- `uploader_id` - Filter by uploader
- `sort` - Sort field (default: `created_at`)
- `order` - Sort order (`asc`, `desc`)

**Example Request:**

```bash
curl "http://localhost:3000/api/assets?limit=10&type=image&sort=created_at&order=desc"
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Mobile App Dashboard",
      "description": "New dashboard design for iOS app",
      "type": "image",
      "url": "https://storage.supabase.co/...",
      "thumbnail_url": "https://storage.supabase.co/.../thumb.jpg",
      "width": 1920,
      "height": 1080,
      "uploader_id": "123e4567-e89b-12d3-a456-426614174000",
      "asset_type": "image",
      "visibility": "public",
      "view_count": 42,
      "created_at": "2026-01-20T10:00:00Z",
      "uploader": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://..."
      },
      "streams": [
        {
          "id": "stream-uuid",
          "name": "mobile-app",
          "description": "Mobile app designs"
        }
      ],
      "likeCount": 15,
      "isLikedByCurrentUser": true,
      "commentCount": 3
    }
  ],
  "meta": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Get Single Asset

```http
GET /api/assets/{id}
```

**Path Parameters:**
- `id` - Asset UUID

**Query Parameters:**
- `include` - Related data to include (comma-separated: `uploader,streams,likes,comments`)

**Example Request:**

```bash
curl "http://localhost:3000/api/assets/550e8400-e29b-41d4-a716-446655440000?include=uploader,streams"
```

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Mobile App Dashboard",
    "description": "New dashboard design",
    "type": "image",
    "url": "https://storage.supabase.co/...",
    "thumbnail_url": "https://storage.supabase.co/.../thumb.jpg",
    "width": 1920,
    "height": 1080,
    "uploader_id": "123e4567-e89b-12d3-a456-426614174000",
    "visibility": "public",
    "view_count": 42,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z",
    "uploader": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "johndoe",
      "display_name": "John Doe",
      "avatar_url": "https://..."
    },
    "streams": [
      {
        "id": "stream-uuid",
        "name": "mobile-app"
      }
    ],
    "likeCount": 15,
    "isLikedByCurrentUser": true,
    "commentCount": 3
  }
}
```

---

### Upload Asset

```http
POST /api/assets/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - File to upload (required)
- `title` - Asset title (required)
- `description` - Asset description (optional)
- `streams` - JSON array of stream IDs (optional)
- `visibility` - `public` or `unlisted` (default: `public`)

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -H "Cookie: sb-access-token=..." \
  -F "file=@design.png" \
  -F "title=Mobile Dashboard" \
  -F "description=New dashboard design" \
  -F "streams=[\"stream-uuid-1\",\"stream-uuid-2\"]" \
  -F "visibility=public"
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-asset-uuid",
    "title": "Mobile Dashboard",
    "description": "New dashboard design",
    "type": "image",
    "url": "https://storage.supabase.co/...",
    "thumbnail_url": "https://storage.supabase.co/.../thumb.jpg",
    "width": 1920,
    "height": 1080,
    "file_size": 524288,
    "mime_type": "image/png",
    "uploader_id": "current-user-uuid",
    "visibility": "public",
    "created_at": "2026-01-20T10:30:00Z"
  }
}
```

**Supported File Types:**
- **Images:** JPG, PNG, WebP, GIF
- **Videos:** WebM (up to 50MB)
- **Max Size:** 50MB

---

### Create Embed Asset

```http
POST /api/assets/embed
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://www.figma.com/file/abc123/Design",
  "title": "Figma Design",
  "description": "Product redesign",
  "streams": ["stream-uuid-1"],
  "visibility": "public"
}
```

**Fields:**
- `url` - Embed URL (Figma or Loom) (required)
- `title` - Asset title (required)
- `description` - Description (optional)
- `streams` - Array of stream IDs (optional)
- `visibility` - `public` or `unlisted` (default: `public`)

**Response (201 Created):**

```json
{
  "data": {
    "id": "embed-asset-uuid",
    "title": "Figma Design",
    "type": "embed",
    "asset_type": "embed",
    "embed_url": "https://www.figma.com/file/abc123/Design",
    "embed_provider": "figma",
    "url": "https://storage.supabase.co/.../thumbnail.png",
    "thumbnail_url": "https://storage.supabase.co/.../thumbnail.png",
    "width": 1200,
    "height": 800,
    "uploader_id": "current-user-uuid",
    "visibility": "public",
    "created_at": "2026-01-20T10:45:00Z"
  }
}
```

**Supported Providers:**
- Figma (file, design, prototype, frame URLs)
- Loom (video URLs)

---

### Update Asset

```http
PATCH /api/assets/{id}
Content-Type: application/json
```

**Path Parameters:**
- `id` - Asset UUID

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "visibility": "unlisted"
}
```

**Updatable Fields:**
- `title` - Asset title
- `description` - Description
- `visibility` - `public` or `unlisted`

**Response:**

```json
{
  "data": {
    "id": "asset-uuid",
    "title": "Updated Title",
    "description": "Updated description",
    "visibility": "unlisted",
    "updated_at": "2026-01-20T11:00:00Z"
  }
}
```

**Authorization:** Only owner can update.

---

### Delete Asset

```http
DELETE /api/assets/{id}
```

**Path Parameters:**
- `id` - Asset UUID

**Response:**

```json
{
  "success": true
}
```

**Authorization:** Only owner can delete.

**Note:** This also deletes:
- All comments on the asset
- All likes
- All views
- Storage files (image/video)

---

### Like Asset

```http
POST /api/assets/{id}/like
```

**Path Parameters:**
- `id` - Asset UUID

**Response:**

```json
{
  "data": {
    "liked": true,
    "likeCount": 16
  }
}
```

**Behavior:**
- If not liked: Creates like
- If already liked: Removes like (toggle)

**Side Effects:**
- Creates notification for asset owner (if not self-like)
- Real-time update to all subscribed clients

---

### Unlike Asset

```http
DELETE /api/assets/{id}/like
```

**Path Parameters:**
- `id` - Asset UUID

**Response:**

```json
{
  "data": {
    "liked": false,
    "likeCount": 15
  }
}
```

---

### Record View

```http
POST /api/assets/{id}/view
```

**Path Parameters:**
- `id` - Asset UUID

**Response:**

```json
{
  "data": {
    "viewCount": 43
  }
}
```

**Behavior:**
- Records view after 2-second threshold (client-side)
- One view per user per asset (idempotent)
- Owner views not counted
- Updates denormalized `view_count`

---

### Get Viewers

```http
GET /api/assets/{id}/viewers
```

**Path Parameters:**
- `id` - Asset UUID

**Query Parameters:**
- `limit` - Max viewers to return (default: 10)

**Response:**

```json
{
  "data": {
    "viewers": [
      {
        "id": "user-uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://...",
        "viewed_at": "2026-01-20T09:00:00Z"
      }
    ],
    "total": 42,
    "hasMore": true
  }
}
```

**Usage:** Powers "Seen by X people" tooltip.

---

### Get Comments

```http
GET /api/assets/{id}/comments
```

**Path Parameters:**
- `id` - Asset UUID

**Query Parameters:**
- `limit` - Comments per page (default: 50)
- `offset` - Pagination offset

**Response:**

```json
{
  "data": [
    {
      "id": "comment-uuid",
      "asset_id": "asset-uuid",
      "user_id": "user-uuid",
      "content": "Great design!",
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-20T10:00:00Z",
      "author": {
        "id": "user-uuid",
        "username": "janedoe",
        "display_name": "Jane Doe",
        "avatar_url": "https://..."
      },
      "likeCount": 3,
      "isLikedByCurrentUser": false
    }
  ],
  "meta": {
    "total": 5,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Add Comment

```http
POST /api/assets/{id}/comments
Content-Type: application/json
```

**Path Parameters:**
- `id` - Asset UUID

**Request Body:**
```json
{
  "content": "Great design! Love the colors.",
  "mentions": ["@johndoe", "@janedoe"]
}
```

**Fields:**
- `content` - Comment text (required, max 2000 chars)
- `mentions` - Array of @username mentions (optional)

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-comment-uuid",
    "asset_id": "asset-uuid",
    "user_id": "current-user-uuid",
    "content": "Great design! Love the colors.",
    "created_at": "2026-01-20T11:00:00Z",
    "author": {
      "id": "current-user-uuid",
      "username": "alice",
      "display_name": "Alice",
      "avatar_url": "https://..."
    },
    "likeCount": 0,
    "isLikedByCurrentUser": false
  }
}
```

**Side Effects:**
- Creates notification for asset owner
- Creates notifications for mentioned users
- Real-time update to all subscribed clients
- Increments `comment_count` on asset

---

### Following Feed

```http
GET /api/assets/following
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset

**Response:**

```json
{
  "data": [
    {
      "id": "asset-uuid",
      "title": "Design",
      "uploader": { ... },
      "streams": [ ... ],
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Authorization:** Requires authentication.

**Logic:** Returns assets from:
- Users you follow
- Streams you follow

---

## Streams API

Manage organizational streams (tags + collections).

### List Streams

```http
GET /api/streams
```

**Query Parameters:**
- `limit` - Items per page (default: 50)
- `offset` - Pagination offset
- `visibility` - Filter: `public`, `private`, `all` (default: `public`)
- `sort` - Sort field (default: `created_at`)
- `order` - Sort order (`asc`, `desc`)

**Example Request:**

```bash
curl "http://localhost:3000/api/streams?limit=20&visibility=all&sort=name&order=asc"
```

**Response:**

```json
{
  "data": [
    {
      "id": "stream-uuid",
      "name": "mobile-app",
      "description": "Mobile app designs and prototypes",
      "owner_type": "user",
      "owner_id": "user-uuid",
      "is_private": false,
      "status": "active",
      "cover_image_url": "https://...",
      "created_at": "2026-01-15T00:00:00Z",
      "updated_at": "2026-01-20T10:00:00Z",
      "assetCount": 45,
      "followerCount": 12
    }
  ],
  "meta": {
    "total": 30,
    "limit": 20,
    "offset": 0
  }
}
```

**Notes:**
- Private streams only visible to owner and members
- Unauthenticated users only see public streams

---

### Get Single Stream

```http
GET /api/streams/{id}
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "data": {
    "id": "stream-uuid",
    "name": "mobile-app",
    "description": "Mobile app designs",
    "owner_type": "user",
    "owner_id": "user-uuid",
    "is_private": false,
    "status": "active",
    "created_at": "2026-01-15T00:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z",
    "assetCount": 45,
    "followerCount": 12,
    "isFollowing": true,
    "contributors": [
      {
        "id": "user-uuid",
        "username": "johndoe",
        "avatar_url": "https://..."
      }
    ]
  }
}
```

---

### Create Stream

```http
POST /api/streams
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "design-system",
  "description": "Design system components",
  "is_private": false
}
```

**Fields:**
- `name` - Stream name (required, unique, lowercase, hyphens)
- `description` - Description (optional)
- `is_private` - Private stream (default: false)

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-stream-uuid",
    "name": "design-system",
    "description": "Design system components",
    "owner_type": "user",
    "owner_id": "current-user-uuid",
    "is_private": false,
    "status": "active",
    "created_at": "2026-01-20T12:00:00Z"
  }
}
```

**Note:** Stream names are idempotent. If stream exists, returns existing.

---

### Update Stream

```http
PUT /api/streams/{id}
Content-Type: application/json
```

**Path Parameters:**
- `id` - Stream UUID

**Request Body:**
```json
{
  "name": "design-system-v2",
  "description": "Updated description",
  "is_private": true
}
```

**Updatable Fields:**
- `name` - Stream name
- `description` - Description
- `is_private` - Privacy setting

**Response:**

```json
{
  "data": {
    "id": "stream-uuid",
    "name": "design-system-v2",
    "description": "Updated description",
    "is_private": true,
    "updated_at": "2026-01-20T12:30:00Z"
  }
}
```

**Authorization:** Only owner can update.

**Note:** Changing name auto-redirects on frontend.

---

### Delete Stream

```http
DELETE /api/streams/{id}
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "success": true
}
```

**Authorization:** Only owner can delete.

**Note:** This removes stream from all assets (via `asset_streams`).

---

### Follow Stream

```http
POST /api/streams/{id}/follow
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "data": {
    "following": true,
    "followerCount": 13
  }
}
```

**Side Effects:**
- Adds to following feed
- Real-time follower count update

---

### Unfollow Stream

```http
DELETE /api/streams/{id}/follow
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "data": {
    "following": false,
    "followerCount": 12
  }
}
```

---

### Get Follow Status

```http
GET /api/streams/{id}/follow
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "data": {
    "isFollowing": true,
    "followerCount": 12,
    "assetCount": 45,
    "contributors": [
      {
        "id": "user-uuid",
        "username": "johndoe",
        "avatar_url": "https://..."
      }
    ]
  }
}
```

---

### Stream Bookmarks

#### List Bookmarks

```http
GET /api/streams/{id}/bookmarks
```

**Path Parameters:**
- `id` - Stream UUID

**Response:**

```json
{
  "data": [
    {
      "id": "bookmark-uuid",
      "stream_id": "stream-uuid",
      "url": "https://www.figma.com/file/abc123",
      "title": "Design File",
      "favicon_url": "https://www.figma.com/favicon.ico",
      "created_by": "user-uuid",
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

#### Add Bookmark

```http
POST /api/streams/{id}/bookmarks
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://jira.company.com/project/ABC",
  "title": "JIRA Board"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-bookmark-uuid",
    "stream_id": "stream-uuid",
    "url": "https://jira.company.com/project/ABC",
    "title": "JIRA Board",
    "favicon_url": "https://jira.company.com/favicon.ico",
    "created_by": "current-user-uuid",
    "created_at": "2026-01-20T13:00:00Z"
  }
}
```

**Authorization:** Stream members/owner only.

#### Delete Bookmark

```http
DELETE /api/streams/{id}/bookmarks/{bookmarkId}
```

**Authorization:** Creator or stream owner.

---

### Stream Members (Private Streams)

#### List Members

```http
GET /api/streams/{id}/members
```

**Path Parameters:**
- `id` - Stream UUID (must be private)

**Response:**

```json
{
  "data": [
    {
      "id": "member-uuid",
      "stream_id": "stream-uuid",
      "user_id": "user-uuid",
      "role": "owner",
      "added_at": "2026-01-15T00:00:00Z",
      "user": {
        "id": "user-uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

**Roles:**
- `owner` - Full control (can't be removed)
- `admin` - Can add/remove regular members
- `member` - Can view and contribute

#### Add Member

```http
POST /api/streams/{id}/members
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "role": "member"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-member-uuid",
    "stream_id": "stream-uuid",
    "user_id": "user-uuid",
    "role": "member",
    "added_at": "2026-01-20T13:30:00Z"
  }
}
```

**Authorization:** Owner or admin only.

#### Remove Member

```http
DELETE /api/streams/{id}/members?user_id={userId}
```

**Query Parameters:**
- `user_id` - User UUID to remove

**Authorization:** Owner or admin (admins can't remove other admins/owner).

---

### Stream Assets

#### List Stream Assets

```http
GET /api/streams/{id}/assets
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset

**Response:** Same as [List Assets](#list-assets).

#### Add Asset to Stream

```http
POST /api/streams/{id}/assets
Content-Type: application/json
```

**Request Body:**
```json
{
  "asset_id": "asset-uuid"
}
```

**Response (201 Created):**

```json
{
  "success": true
}
```

#### Remove Asset from Stream

```http
DELETE /api/streams/{id}/assets?asset_id={assetId}
```

**Query Parameters:**
- `asset_id` - Asset UUID

---

## Users API

Manage user profiles and settings.

### List Users

```http
GET /api/users
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset
- `filter` - `following` to show only followed users
- `sort` - Sort field (default: `username`)
- `order` - Sort order (`asc`, `desc`)

**Response:**

```json
{
  "data": [
    {
      "id": "user-uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "bio": "Product designer",
      "job_title": "Senior Designer",
      "location": "San Francisco, CA",
      "created_at": "2025-12-01T00:00:00Z",
      "followerCount": 24,
      "isFollowing": false,
      "recentAssets": [
        {
          "id": "asset-uuid",
          "title": "Design",
          "thumbnail_url": "https://..."
        }
      ]
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Get User Profile

```http
GET /api/users/{username}
```

**Path Parameters:**
- `username` - Username (not UUID)

**Response:**

```json
{
  "data": {
    "id": "user-uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Product designer based in SF",
    "job_title": "Senior Designer",
    "location": "San Francisco, CA",
    "created_at": "2025-12-01T00:00:00Z",
    "followerCount": 24,
    "followingCount": 18,
    "assetCount": 65,
    "isFollowing": true,
    "recentAssets": [ ... ],
    "streams": [ ... ]
  }
}
```

---

### Follow User

```http
POST /api/users/{username}/follow
```

**Path Parameters:**
- `username` - Username

**Response:**

```json
{
  "data": {
    "following": true,
    "followerCount": 25
  }
}
```

**Side Effects:**
- Creates notification for followed user (if enabled)
- Adds to following feed

---

### Unfollow User

```http
DELETE /api/users/{username}/follow
```

**Response:**

```json
{
  "data": {
    "following": false,
    "followerCount": 24
  }
}
```

---

### Update Profile

```http
PUT /api/users/me
Content-Type: application/json
```

**Request Body:**
```json
{
  "display_name": "John Doe",
  "bio": "Product designer based in SF",
  "job_title": "Senior Designer",
  "location": "San Francisco, CA"
}
```

**Updatable Fields:**
- `display_name` - Display name
- `bio` - Bio text (max 500 chars)
- `job_title` - Job title
- `location` - Location

**Response:**

```json
{
  "data": {
    "id": "current-user-uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": "Product designer based in SF",
    "job_title": "Senior Designer",
    "location": "San Francisco, CA",
    "updated_at": "2026-01-20T14:00:00Z"
  }
}
```

**Note:** Cannot update username or email via this endpoint.

---

### Upload Avatar

```http
POST /api/users/me/avatar
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - Image file (JPG, PNG, WebP)

**Response:**

```json
{
  "data": {
    "avatar_url": "https://storage.supabase.co/.../avatar.jpg"
  }
}
```

**Constraints:**
- Max size: 5MB
- Automatically resized to 400x400

---

### Remove Avatar

```http
DELETE /api/users/me/avatar
```

**Response:**

```json
{
  "data": {
    "avatar_url": null
  }
}
```

**Behavior:** Resets to default avatar.

---

### Notification Settings

#### Get Settings

```http
GET /api/users/me/notification-settings
```

**Response:**

```json
{
  "data": {
    "notifications_enabled": true,
    "likes_enabled": true,
    "comments_enabled": true,
    "follows_enabled": true,
    "mentions_enabled": true
  }
}
```

#### Update Settings

```http
PUT /api/users/me/notification-settings
Content-Type: application/json
```

**Request Body:**
```json
{
  "notifications_enabled": true,
  "likes_enabled": false,
  "comments_enabled": true,
  "follows_enabled": true,
  "mentions_enabled": true
}
```

**Response:** Returns updated settings.

---

### Integrations

#### Get Integration Status

```http
GET /api/users/me/integrations
```

**Response:**

```json
{
  "data": {
    "figma": {
      "connected": true,
      "updated_at": "2026-01-18T10:00:00Z"
    }
  }
}
```

#### Connect Figma

```http
POST /api/users/me/integrations
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "figma",
  "token": "figd_xxx..."
}
```

**Response:**

```json
{
  "data": {
    "provider": "figma",
    "connected": true,
    "updated_at": "2026-01-20T14:30:00Z"
  }
}
```

**Token Storage:** Encrypted with AES-256-GCM.

#### Disconnect Figma

```http
DELETE /api/users/me/integrations?provider=figma
```

---

## Drops API

AI-powered newsletters.

### List Drops

```http
GET /api/drops
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset
- `status` - Filter: `draft`, `published`, `all`
- `creator_id` - Filter by creator
- `schedule_id` - Filter by schedule

**Response:**

```json
{
  "data": [
    {
      "id": "drop-uuid",
      "title": "Weekly Drop · Jan 20, 2026",
      "description": "This week's highlights...",
      "creator_id": "user-uuid",
      "schedule_id": "schedule-uuid",
      "status": "published",
      "published_at": "2026-01-20T10:00:00Z",
      "is_superseded": false,
      "date_range_start": "2026-01-13",
      "date_range_end": "2026-01-19",
      "created_at": "2026-01-20T09:00:00Z",
      "creator": {
        "id": "user-uuid",
        "username": "johndoe",
        "display_name": "John Doe"
      }
    }
  ],
  "meta": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Get Drop

```http
GET /api/drops/{id}
```

**Response:** Includes blocks, posts, and images.

---

### Create Drop

```http
POST /api/drops
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Weekly Drop",
  "description": "This week's work",
  "date_range_start": "2026-01-13",
  "date_range_end": "2026-01-19",
  "filter_stream_ids": ["stream-uuid-1"],
  "filter_user_ids": ["user-uuid-1"]
}
```

**Response (201 Created):** Returns drop with auto-populated posts.

---

### Update Drop

```http
PATCH /api/drops/{id}
Content-Type: application/json
```

**Request Body:** Same updatable fields as create.

---

### Delete Drop

```http
DELETE /api/drops/{id}
```

---

### Publish Drop

```http
POST /api/drops/{id}/publish
```

**Response:**

```json
{
  "data": {
    "id": "drop-uuid",
    "status": "published",
    "published_at": "2026-01-20T15:00:00Z"
  }
}
```

---

### Generate AI Description

```http
POST /api/drops/{id}/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "Summarize this week's mobile app designs"
}
```

**Response:**

```json
{
  "data": {
    "description": "This week saw major progress on the mobile app..."
  }
}
```

---

## Schedules API

Recurring drop automation.

### List Schedules

```http
GET /api/schedules
```

**Response:**

```json
{
  "data": [
    {
      "id": "schedule-uuid",
      "name": "Weekly Mobile Drop",
      "frequency": "weekly",
      "day_of_week": 1,
      "generation_time": "09:00:00",
      "timezone": "America/Los_Angeles",
      "status": "active",
      "next_run_at": "2026-01-27T09:00:00Z",
      "last_run_at": "2026-01-20T09:00:00Z",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### Create Schedule

```http
POST /api/schedules
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Weekly Mobile Drop",
  "frequency": "weekly",
  "day_of_week": 1,
  "generation_time": "09:00",
  "timezone": "America/Los_Angeles",
  "stream_ids": ["stream-uuid"],
  "date_range_mode": "last_n_days",
  "date_range_days": 7,
  "generate_now": false
}
```

**Frequencies:**
- `weekly` - Every week on specified `day_of_week` (0-6)
- `biweekly` - Every 2 weeks
- `monthly` - Monthly on specified `day_of_month` (1-31)
- `custom` - Every N days (`custom_interval_days`)

**Response (201 Created):** Returns created schedule.

---

### Update Schedule

```http
PATCH /api/schedules/{id}
Content-Type: application/json
```

**Request Body:** Same fields as create.

**Note:** Recalculates `next_run_at` based on new frequency.

---

### Delete Schedule

```http
DELETE /api/schedules/{id}
```

---

### Pause Schedule

```http
POST /api/schedules/{id}/pause
```

**Response:**

```json
{
  "data": {
    "id": "schedule-uuid",
    "status": "paused",
    "next_run_at": null
  }
}
```

---

### Resume Schedule

```http
POST /api/schedules/{id}/resume
```

**Response:**

```json
{
  "data": {
    "id": "schedule-uuid",
    "status": "active",
    "next_run_at": "2026-01-27T09:00:00Z"
  }
}
```

---

### Generate Now

```http
POST /api/schedules/{id}/generate
```

**Response (201 Created):**

```json
{
  "data": {
    "drop_id": "new-drop-uuid",
    "title": "Weekly Mobile Drop · Jan 20, 2026"
  }
}
```

**Behavior:** Generates draft immediately without changing schedule.

---

## Comments API

### Update Comment

```http
PUT /api/comments/{id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Updated comment text"
}
```

**Authorization:** Comment author only.

---

### Delete Comment

```http
DELETE /api/comments/{id}
```

**Authorization:** Comment author or asset owner.

---

### Like Comment

```http
POST /api/comments/{id}/like
```

**Response:**

```json
{
  "data": {
    "liked": true,
    "likeCount": 4
  }
}
```

---

### Unlike Comment

```http
DELETE /api/comments/{id}/like
```

---

## Notifications API

### List Notifications

```http
GET /api/notifications
```

**Query Parameters:**
- `limit` - Items per page (default: 50)
- `offset` - Pagination offset
- `unread` - Filter: `true`, `false`, or omit for all

**Response:**

```json
{
  "data": [
    {
      "id": "notif-uuid",
      "user_id": "user-uuid",
      "type": "like",
      "content": "liked your design",
      "asset_id": "asset-uuid",
      "comment_id": null,
      "is_read": false,
      "created_at": "2026-01-20T10:00:00Z",
      "actor": {
        "id": "actor-uuid",
        "username": "janedoe",
        "display_name": "Jane Doe",
        "avatar_url": "https://..."
      },
      "asset": {
        "id": "asset-uuid",
        "title": "Mobile Dashboard",
        "thumbnail_url": "https://..."
      }
    }
  ],
  "meta": {
    "total": 24,
    "unread": 5
  }
}
```

**Notification Types:**
- `like` - Asset liked
- `comment` - Comment on asset
- `comment_like` - Comment liked
- `follow` - New follower
- `mention` - Mentioned in comment

---

### Mark as Read

```http
PUT /api/notifications
Content-Type: application/json
```

**Request Body:**
```json
{
  "ids": ["notif-uuid-1", "notif-uuid-2"]
}
```

**Response:**

```json
{
  "success": true,
  "count": 2
}
```

**To mark all as read:**
```json
{
  "all": true
}
```

---

## Search API

### Global Search

```http
GET /api/search
```

**Query Parameters:**
- `q` - Search query (required)
- `type` - Filter: `assets`, `users`, `streams`, or omit for all
- `limit` - Items per type (default: 10)

**Example:**

```bash
curl "http://localhost:3000/api/search?q=mobile&type=assets&limit=5"
```

**Response:**

```json
{
  "data": {
    "assets": {
      "results": [ ... ],
      "total": 42
    },
    "users": {
      "results": [ ... ],
      "total": 8
    },
    "streams": {
      "results": [ ... ],
      "total": 3
    }
  },
  "query": "mobile"
}
```

**Search Features:**
- Full-text search across titles, descriptions, usernames
- Relevance ranking
- Typo tolerance (future)

---

## Admin API

**Authorization:** Requires `platform_role: 'admin'` or `'owner'`.

### Get Analytics

```http
GET /api/admin/analytics
```

**Response:**

```json
{
  "data": {
    "totalUsers": 1250,
    "totalAssets": 5420,
    "totalStreams": 180,
    "activeUsers": 342,
    "assetsThisWeek": 67,
    "topStreams": [ ... ],
    "topUploaders": [ ... ]
  }
}
```

---

### List All Users (Admin)

```http
GET /api/admin/users
```

**Query Parameters:**
- `limit` - Items per page
- `offset` - Pagination
- `role` - Filter by platform_role

**Response:** Includes admin-only fields (email, created_at, etc.).

---

### Get User Details (Admin)

```http
GET /api/admin/users/{id}/details
```

**Response:** Full user profile including private data.

---

### Update User Role

```http
PATCH /api/admin/users/{id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "platform_role": "admin"
}
```

---

## Cron API

### Process Schedules

```http
POST /api/cron/process-schedules
Content-Type: application/json
```

**Request Body:**
```json
{
  "secret": "your-cron-secret"
}
```

**Authorization:** Requires `CRON_SECRET` match.

**Response:**

```json
{
  "success": true,
  "processed": 3,
  "generated": [
    {
      "schedule_id": "schedule-uuid",
      "drop_id": "new-drop-uuid"
    }
  ]
}
```

**Called by:** Cron service (every 5 minutes) or pg_cron.

---

## Appendices

### A. Rate Limiting

**Current Status:** Not implemented.

**Planned:**
- 100 requests/minute per user
- 10 requests/second per endpoint
- 429 status code when exceeded

---

### B. Webhooks

**Current Status:** Not implemented.

**Planned:**
- Asset created
- Drop published
- Comment added
- Schedule executed

---

### C. API Versioning

**Current:** No versioning (v1 implicit).

**Future:** Version in URL (`/api/v2/...`).

---

### D. Testing

**Postman Collection:** Coming soon.

**Example with curl:**

```bash
# Login and save cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  -c cookies.txt

# Use cookie in subsequent requests
curl http://localhost:3000/api/assets \
  -b cookies.txt
```

---

### E. SDK

**TypeScript Client (Planned):**

```typescript
import { MainstreamClient } from '@mainstream/client';

const client = new MainstreamClient({
  baseUrl: 'http://localhost:3000',
});

await client.auth.login({ email, password });

const assets = await client.assets.list({ limit: 10 });
const asset = await client.assets.get(assetId);
await client.assets.like(assetId);
```

---

## Change Log

### v2.0 (January 2026)
- Complete API documentation
- Added Schedules API
- Added Admin API
- User mentions in comments
- Notification preferences

### v1.0 (December 2025)
- Initial API release
- Assets, Streams, Users, Drops
- Real-time subscriptions
- Authentication

---

**For implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).**

**For setup instructions, see [QUICK_START.md](./QUICK_START.md).**
