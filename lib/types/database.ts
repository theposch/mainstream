/**
 * Database Types
 * 
 * TypeScript interfaces for database entities
 * These match the Supabase database schema
 */

// User type (must be defined before Asset which references it)
export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
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
  // Joined data (pre-fetched to prevent N+1 queries)
  uploader?: User;
  streams?: Stream[];
  // Pre-fetched like data (server provides both count and status)
  likeCount?: number;
  isLikedByCurrentUser?: boolean;
  // Pre-fetched view count (denormalized for performance)
  view_count?: number;
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
