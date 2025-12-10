/**
 * Database Types
 * 
 * TypeScript interfaces for database entities
 * These match the Supabase database schema
 */

// Platform role type for admin functionality
export type PlatformRole = 'user' | 'admin' | 'owner';

// User type (must be defined before Asset which references it)
export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio?: string;
  email?: string;
  job_title?: string;
  location?: string;
  created_at: string;
  updated_at?: string;
  // Platform role for admin functionality
  platform_role?: PlatformRole;
  // Integrations
  figma_access_token?: string;
  figma_token_updated_at?: string;
}

// User with enriched data for People page cards
export interface UserWithDetails extends User {
  followerCount?: number;
  recentAssets?: Array<{
    id: string;
    title: string;
    thumbnail_url?: string;
    url?: string;
  }>;
  streams?: Array<{
    id: string;
    name: string;
    is_private: boolean;
  }>;
  totalStreams?: number;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url: string;
  member_count?: number;
  created_at: string;
  updated_at?: string;
}

// Stream type (must be defined before Asset which references it)
export interface Stream {
  id: string;
  name: string;
  description?: string;
  owner_type: 'user' | 'team';
  owner_id: string;
  is_private: boolean;
  status: 'active' | 'archived';
  cover_image_url?: string;
  created_at: string;
  updated_at?: string;
}

// Asset type with optional pre-fetched relationships
export interface Asset {
  id: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  medium_url?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  file_size?: number;
  mime_type?: string;
  uploader_id: string;
  created_at: string;
  updated_at?: string;
  // Embed support (for URL-based assets like Figma, YouTube, etc.)
  asset_type?: 'image' | 'video' | 'embed';
  embed_url?: string;  // Original URL (e.g., figma.com/file/...)
  embed_provider?: string;  // Provider identifier (e.g., 'figma', 'youtube')
  // Visibility: 'public' = appears in feed, 'unlisted' = only via direct link/drops
  visibility?: 'public' | 'unlisted';
  // Joined data (pre-fetched to prevent N+1 queries)
  uploader?: User;
  streams?: Stream[];
  // Pre-fetched like data (server provides both count and status)
  likeCount?: number;
  isLikedByCurrentUser?: boolean;
  // Pre-fetched view count (denormalized for performance)
  view_count?: number;
}

// Partial user data for comment author (returned from API)
export type CommentUser = Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> & {
  email?: string;
  job_title?: string;
};

// Comment type (single source of truth for all comment-related components)
export interface Comment {
  id: string;
  asset_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  likes: number;
  has_liked: boolean;
  user?: CommentUser;
}

// Notification types
export type NotificationType = 'like_asset' | 'like_comment' | 'reply_comment' | 'follow' | 'mention' | 'comment';
export type ResourceType = 'asset' | 'comment' | 'user' | 'stream';

// Notification type (single source of truth)
export interface Notification {
  id: string;
  type: NotificationType;
  recipient_id: string;
  actor_id: string;
  resource_id: string | null;
  resource_type: ResourceType | null;
  is_read: boolean;
  created_at: string;
  comment_id?: string | null;
  content?: string | null;
  actor?: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  asset?: Pick<Asset, 'id' | 'title'> | null;
}

// Viewer type for tooltip display
export interface AssetViewer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  viewed_at: string;
}

export interface StreamResource {
  id: string;
  streamId: string;
  title: string;
  url: string;
  resourceType: 'figma' | 'jira' | 'notion' | 'prd' | 'other';
  displayOrder: number;
  createdAt: string;
}

export interface SearchResults {
  assets: Asset[];
  streams: Stream[];
  users: User[];
  total?: number;
}

// Stream follow relationship
export interface StreamFollow {
  stream_id: string;
  user_id: string;
  created_at: string;
}

// Stream bookmark (external links like Jira, Figma, etc.)
export interface StreamBookmark {
  id: string;
  stream_id: string;
  url: string;
  title?: string;
  created_by: string;
  created_at: string;
  position: number;
}

// Drop (AI-powered newsletter)
export interface Drop {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  created_by: string;
  published_at: string | null;
  date_range_start: string;
  date_range_end: string;
  filter_stream_ids: string[] | null;
  filter_user_ids: string[] | null;
  is_weekly: boolean;
  use_blocks: boolean; // Whether this drop uses the block-based editor
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: User;
  blocks?: DropBlock[]; // Blocks when use_blocks is true
}

// Drop post junction (many-to-many between drops and assets)
export type DropPostDisplayMode = 'auto' | 'fit' | 'cover';

export interface DropPost {
  drop_id: string;
  asset_id: string;
  position: number;
  display_mode: DropPostDisplayMode;
  crop_position_x: number; // 0-100, default 50 (center)
  crop_position_y: number; // 0-100, default 0 (top)
  created_at: string;
  // Joined data
  asset?: Asset;
}

// Drop with enriched data for display
export interface DropWithDetails extends Drop {
  posts: Array<Asset & { position: number }>;
  contributors: User[];
  post_count: number;
}

// Drop block types for Notion-like editor
export type DropBlockType = 'text' | 'heading' | 'post' | 'featured_post' | 'divider' | 'quote' | 'image_gallery';

// Gallery layout modes
export type GalleryLayout = 'grid' | 'featured';

// Gallery image (many-to-many between blocks and assets)
export interface DropBlockGalleryImage {
  id: string;
  block_id: string;
  asset_id: string;
  position: number;
  created_at: string;
  // Joined data
  asset?: Asset;
}

export interface DropBlock {
  id: string;
  drop_id: string;
  type: DropBlockType;
  position: number;
  
  // Content for text/heading/quote blocks
  content?: string;
  heading_level?: 1 | 2 | 3;
  
  // Asset reference for post/featured_post blocks
  asset_id?: string;
  asset?: Asset; // Joined data
  
  // Display settings for post blocks
  display_mode?: DropPostDisplayMode;
  crop_position_x?: number;
  crop_position_y?: number;
  
  // Gallery settings for image_gallery blocks
  gallery_layout?: GalleryLayout;
  gallery_featured_index?: number;
  gallery_images?: DropBlockGalleryImage[]; // Joined data
  
  created_at: string;
  updated_at: string;
}
