"use client";

/**
 * Infinite Scroll Hook for Assets
 * 
 * Provides infinite scrolling functionality with cursor-based pagination
 * using Supabase's `lt()` (less than) method for efficient queries.
 * 
 * Usage:
 * ```tsx
 * const { assets, loadMore, hasMore, loading } = useAssetsInfinite(initialAssets);
 * ```
 */

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Asset } from "@/lib/types/database";

interface UseAssetsInfiniteReturn {
  assets: Asset[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function useAssetsInfinite(
  initialAssets: Asset[]
): UseAssetsInfiniteReturn {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialAssets.length >= PAGE_SIZE);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);

    try {
      const lastAsset = assets[assets.length - 1];
      if (!lastAsset) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      
      // Get current user for like status check
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("assets")
        .select(`
          *,
          uploader:users!uploader_id(*),
          asset_streams(
            streams(*)
          ),
          asset_likes(count)
        `)
        .order("created_at", { ascending: false })
        .lt("created_at", lastAsset.created_at)
        .limit(PAGE_SIZE);

      if (error) {
        console.error("[useAssetsInfinite] Error loading more assets:", error);
        setLoading(false);
        return;
      }

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Batch fetch which assets the user has liked
      let userLikedAssetIds: Set<string> = new Set();
      if (user && data && data.length > 0) {
        const assetIds = data.map((a: any) => a.id);
        const { data: userLikes } = await supabase
          .from('asset_likes')
          .select('asset_id')
          .eq('user_id', user.id)
          .in('asset_id', assetIds);
        
        if (userLikes) {
          userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
        }
      }

      // Transform nested data to flat structure with like status
      const assetsWithData = (data || []).map((asset: any) => ({
        ...asset,
        streams: asset.asset_streams?.map((rel: any) => rel.streams).filter(Boolean) || [],
        asset_streams: undefined,
        likeCount: asset.asset_likes?.[0]?.count || 0,
        asset_likes: undefined,
        isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
      }));

      setAssets((prev) => [...prev, ...assetsWithData]);
    } catch (error) {
      console.error("[useAssetsInfinite] Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }, [assets, loading, hasMore]);

  return { assets, loadMore, hasMore, loading };
}
