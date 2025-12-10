"use client";

/**
 * Infinite Scroll Hook for Assets
 * 
 * Provides infinite scrolling functionality with cursor-based pagination
 * using React Query for caching and automatic background refetching.
 * 
 * Usage:
 * ```tsx
 * const { assets, loadMore, hasMore, loading, removeAsset } = useAssetsInfinite(initialAssets);
 * ```
 */

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { Asset } from "@/lib/types/database";
import { assetKeys } from "@/lib/queries/asset-queries";

interface AssetsResponse {
  assets: Asset[];
  hasMore: boolean;
  cursor: string | null;
}

interface UseAssetsInfiniteReturn {
  assets: Asset[];
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  /** Remove an asset from the cache (for optimistic updates after deletion) */
  removeAsset: (assetId: string) => void;
}

const fetchRecentAssets = async ({ pageParam }: { pageParam: string | null }): Promise<AssetsResponse> => {
  const url = new URL('/api/assets', window.location.origin);
  if (pageParam) {
    url.searchParams.set('cursor', pageParam);
  }
  url.searchParams.set('limit', '20');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to fetch recent assets');
  }

  return response.json();
};

export function useAssetsInfinite(
  initialAssets: Asset[]
): UseAssetsInfiniteReturn {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: assetKeys.recent(),
    queryFn: fetchRecentAssets,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.cursor : undefined,
    // Hydrate with initial data from SSR
    initialData: initialAssets.length > 0 ? {
      pages: [{
        assets: initialAssets,
        hasMore: initialAssets.length >= 20,
        cursor: initialAssets.length > 0 ? initialAssets[initialAssets.length - 1].created_at : null,
      }],
      pageParams: [null],
    } : undefined,
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
    queryClient.setQueryData<{ pages: AssetsResponse[]; pageParams: (string | null)[] }>(
      assetKeys.recent(),
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
    removeAsset,
  };
}
