/**
 * Asset API Utilities
 * 
 * Shared utilities for asset-related API routes.
 * Eliminates code duplication between /api/assets and /api/assets/following routes.
 * 
 * DRY Principle: Define shared SQL selections, transformations, and cursor logic once.
 */

import type { Asset, User, Stream } from "@/lib/types/database";
import { PAGE_SIZES } from "@/lib/constants/cache";

// ============================================================================
// Shared SQL Selections
// ============================================================================

/**
 * Base SELECT for asset queries including all commonly needed relations.
 * Used by both public feed and following feed.
 */
export const ASSET_BASE_SELECT = `
  *,
  uploader:users!uploader_id(
    id,
    username,
    display_name,
    avatar_url,
    email
  ),
  asset_streams(
    streams(*)
  ),
  asset_likes(count)
`;

// ============================================================================
// Types
// ============================================================================

/**
 * Raw asset data from Supabase before transformation
 */
interface RawAssetFromDB {
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
  asset_type?: 'image' | 'video' | 'embed';
  embed_url?: string;
  embed_provider?: string;
  visibility?: 'public' | 'unlisted';
  view_count?: number;
  uploader?: User;
  asset_streams?: Array<{ streams: Stream | null }>;
  asset_likes?: Array<{ count: number }>;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform raw Supabase asset data to our Asset type.
 * 
 * Handles:
 * - Flattening nested relations (asset_streams → streams)
 * - Extracting like count from aggregate
 * - Adding user's like status
 * 
 * @param raw - Raw asset from Supabase query
 * @param userLikedIds - Set of asset IDs the current user has liked
 * @returns Transformed Asset
 */
export function transformAssetResponse(
  raw: RawAssetFromDB,
  userLikedIds: Set<string>
): Asset {
  // Flatten streams relation
  const streams = raw.asset_streams
    ?.map((rel) => rel.streams)
    .filter((s): s is Stream => s !== null) || [];
  
  // Extract like count from aggregate
  const likeCount = raw.asset_likes?.[0]?.count || 0;
  
  // Build clean asset without internal properties
  const { asset_streams, asset_likes, ...rest } = raw;
  
  return {
    ...rest,
    streams,
    likeCount,
    isLikedByCurrentUser: userLikedIds.has(raw.id),
  };
}

// ============================================================================
// Cursor Utilities
// ============================================================================

/**
 * Build a composite cursor from an asset for pagination.
 * 
 * Format: "timestamp::id"
 * Using double colon to avoid conflicts with ISO timestamp colons.
 * 
 * Why composite cursor?
 * - Single timestamp cursor fails when multiple assets have identical created_at
 * - Composite ensures uniqueness even with identical timestamps
 * - Second sort by ID ensures deterministic ordering
 * 
 * @param asset - Asset to build cursor from
 * @returns Composite cursor string
 */
export function buildCompositeCursor(asset: Asset | RawAssetFromDB): string {
  return `${asset.created_at}::${asset.id}`;
}

/**
 * Parse a composite cursor into its components.
 * 
 * @param cursor - Composite cursor string
 * @returns Object with timestamp and id
 */
export function parseCompositeCursor(cursor: string): { timestamp: string; id: string | null } {
  const separatorIndex = cursor.lastIndexOf('::');
  
  if (separatorIndex > 0) {
    return {
      timestamp: cursor.substring(0, separatorIndex),
      id: cursor.substring(separatorIndex + 2),
    };
  }
  
  // Fallback for legacy single-value cursors
  return { timestamp: cursor, id: null };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Parse and validate limit parameter from request.
 * 
 * @param limitParam - Raw limit parameter from URL
 * @returns Validated limit, capped at MAX_LIMIT
 */
export function parseLimit(limitParam: string | null): number {
  const requested = parseInt(limitParam || String(PAGE_SIZES.CLIENT_PAGE), 10);
  return Math.min(Math.max(1, requested), PAGE_SIZES.MAX_LIMIT);
}

// ============================================================================
// Cache Headers
// ============================================================================

/**
 * Standard cache headers for asset API responses.
 * Prevents caching to ensure fresh data.
 */
export const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const;

