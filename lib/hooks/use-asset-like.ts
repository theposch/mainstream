/**
 * Asset Like Hook
 * 
 * Manages like/unlike functionality with optimistic updates.
 * Accepts pre-fetched like data to prevent N+1 queries.
 * 
 * Usage:
 * ```tsx
 * // With pre-fetched data (preferred - no initial fetch)
 * const { isLiked, likeCount, toggleLike, loading } = useAssetLike(assetId, true, 5);
 * 
 * // Without pre-fetched data (will fetch on mount)
 * const { isLiked, likeCount, toggleLike, loading } = useAssetLike(assetId);
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseAssetLikeReturn {
  isLiked: boolean;
  likeCount: number;
  toggleLike: () => Promise<void>;
  loading: boolean;
}

export function useAssetLike(
  assetId: string,
  initialLiked?: boolean,
  initialCount?: number
): UseAssetLikeReturn {
  // Use initial values if provided, otherwise fetch
  const hasInitialData = initialLiked !== undefined && initialCount !== undefined;
  
  const [isLiked, setIsLiked] = useState(initialLiked ?? false);
  const [likeCount, setLikeCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(hasInitialData);

  // Only fetch if no initial data was provided
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchLikeData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get total like count
      const { count } = await supabase
        .from("asset_likes")
        .select("*", { count: "exact", head: true })
        .eq("asset_id", assetId);

      setLikeCount(count || 0);

      // Check if current user has liked
      if (user) {
        const { data } = await supabase
          .from("asset_likes")
          .select("*")
          .eq("asset_id", assetId)
          .eq("user_id", user.id)
          .single();

        setIsLiked(!!data);
      }
    };

    fetchLikeData();
  }, [assetId]);

  const toggleLike = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      const method = isLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/assets/${assetId}/like`, {
        method,
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }
    } catch (error) {
      console.error("[useAssetLike] Error toggling like:", error);
      // Rollback optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setLoading(false);
    }
  }, [assetId, isLiked, likeCount, loading]);

  return { isLiked, likeCount, toggleLike, loading };
}
