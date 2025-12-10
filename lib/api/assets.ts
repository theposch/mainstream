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

// UUID v4 regex pattern (standard format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO 8601 timestamp regex (accepts formats like 2025-01-01T00:00:00.000Z)
const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Validate that a string is a valid UUID v4.
 * Prevents SQL injection via malicious cursor IDs.
 * 
 * @param value - String to validate
 * @returns true if valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate that a string is a valid ISO 8601 timestamp.
 * Prevents SQL injection via malicious cursor timestamps.
 * 
 * @param value - String to validate
 * @returns true if valid ISO timestamp
 */
export function isValidISOTimestamp(value: string): boolean {
  if (!ISO_TIMESTAMP_REGEX.test(value)) {
    return false;
  }
  // Also verify it parses to a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Parse and validate a composite cursor from user input.
 * Returns null for invalid cursors to prevent SQL injection.
 * 
 * Security: All cursor values are validated before use in queries.
 * 
 * @param cursor - Raw cursor parameter from URL
 * @returns Validated cursor components or null if invalid
 */
export function parseAndValidateCursor(cursor: string | null): { 
  timestamp: string; 
  id: string | null;
} | null {
  if (!cursor) {
    return null;
  }

  // Try double-colon separator first (new format)
  const separatorIndex = cursor.lastIndexOf('::');
  
  if (separatorIndex > 0) {
    const timestamp = cursor.substring(0, separatorIndex);
    const id = cursor.substring(separatorIndex + 2);
    
    // Validate both components
    if (!isValidISOTimestamp(timestamp)) {
      console.warn('[parseAndValidateCursor] Invalid timestamp in cursor:', timestamp);
      return null;
    }
    if (!isValidUUID(id)) {
      console.warn('[parseAndValidateCursor] Invalid UUID in cursor:', id);
      return null;
    }
    
    return { timestamp, id };
  }
  
  // Fallback: try single colon (legacy format, be careful with ISO timestamps)
  const lastColonIndex = cursor.lastIndexOf(':');
  if (lastColonIndex > 10) { // ISO timestamps have colons at position 13 and 16
    const timestamp = cursor.substring(0, lastColonIndex);
    const id = cursor.substring(lastColonIndex + 1);
    
    // Validate both components
    if (!isValidISOTimestamp(timestamp)) {
      console.warn('[parseAndValidateCursor] Invalid legacy timestamp in cursor:', timestamp);
      return null;
    }
    if (!isValidUUID(id)) {
      console.warn('[parseAndValidateCursor] Invalid legacy UUID in cursor:', id);
      return null;
    }
    
    return { timestamp, id };
  }
  
  // Fallback: treat entire cursor as timestamp only
  if (isValidISOTimestamp(cursor)) {
    return { timestamp: cursor, id: null };
  }
  
  console.warn('[parseAndValidateCursor] Invalid cursor format:', cursor);
  return null;
}

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

