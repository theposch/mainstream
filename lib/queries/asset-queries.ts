/**
 * Asset Queries
 * 
 * Centralized query keys and fetch functions for React Query.
 * This provides a consistent pattern for caching and prefetching asset data.
 */

import type { QueryClient } from "@tanstack/react-query";

// ============================================================================
// Query Key Factory
// ============================================================================

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  comments: (id: string) => [...assetKeys.all, "comments", id] as const,
};

// ============================================================================
// Types
// ============================================================================

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
  user?: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url?: string;
    job_title?: string;
  };
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch comments for an asset
 */
export async function fetchAssetComments(assetId: string): Promise<Comment[]> {
  const response = await fetch(`/api/assets/${assetId}/comments`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  
  const data = await response.json();
  return data.comments || [];
}

// ============================================================================
// Prefetch Helpers
// ============================================================================

/**
 * Prefetch asset comments data
 * Call this on hover to warm the cache before user clicks
 */
export async function prefetchAssetComments(
  queryClient: QueryClient,
  assetId: string
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: assetKeys.comments(assetId),
    queryFn: () => fetchAssetComments(assetId),
    // Don't refetch if data is less than 5 minutes old
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch all data needed for asset detail view
 * Currently just comments, but can be extended
 */
export async function prefetchAssetData(
  queryClient: QueryClient,
  assetId: string
): Promise<void> {
  // Prefetch comments in parallel with any other data
  await Promise.all([
    prefetchAssetComments(queryClient, assetId),
    // Add more prefetch calls here as needed:
    // prefetchAssetRelated(queryClient, assetId),
  ]);
}

