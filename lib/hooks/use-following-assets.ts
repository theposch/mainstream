"use client";

/**
 * Following Assets Hook
 * 
 * Provides infinite scrolling functionality for assets from followed users
 * using cursor-based pagination with React Query for caching.
 * 
 * Usage:
 * ```tsx
 * const { assets, loadMore, hasMore, loading, error, removeAsset } = useFollowingAssets();
 * ```
 */

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { Asset } from "@/lib/types/database";

interface FollowingAssetsResponse {
  assets: Asset[];
  hasMore: boolean;
  cursor: string | null;
}

interface UseFollowingAssetsReturn {
  assets: Asset[];
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  /** Remove an asset from the cache (for optimistic updates after deletion) */
  removeAsset: (assetId: string) => void;
}

const fetchFollowingAssets = async ({ pageParam }: { pageParam: string | null }): Promise<FollowingAssetsResponse> => {
  const url = new URL('/api/assets/following', window.location.origin);
  if (pageParam) {
    url.searchParams.set('cursor', pageParam);
  }
  url.searchParams.set('limit', '20');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch following assets');
  }

  return response.json();
};

export function useFollowingAssets(): UseFollowingAssetsReturn {
  const queryClient = useQueryClient();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['assets', 'following'],
    queryFn: fetchFollowingAssets,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.cursor : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes - cached between tab switches
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Flatten all pages into a single array
  const assets = useMemo(() => {
    return data?.pages.flatMap(page => page.assets) || [];
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isFetching && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetching]);

  // Optimistically remove an asset from the cache
  const removeAsset = useCallback((assetId: string) => {
    queryClient.setQueryData<{ pages: FollowingAssetsResponse[]; pageParams: (string | null)[] }>(
      ['assets', 'following'],
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            assets: page.assets.filter((asset) => asset.id !== assetId),
          })),
        };
      }
    );
  }, [queryClient]);

  return {
    assets,
    loadMore,
    hasMore: hasNextPage ?? true,
    loading: isFetching || isFetchingNextPage,
    error: error instanceof Error ? error.message : null,
    removeAsset,
  };
}

