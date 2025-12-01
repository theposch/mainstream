/**
 * Asset Like Hook
 * 
 * Manages like/unlike functionality with optimistic updates.
 * 
 * Strategy:
 * - Accept initialLiked and initialCount from server (reliable)
 * - Trust server values on initial render (no flash)
 * - Only make API calls when toggling
 * 
 * Usage:
 * ```tsx
 * const { isLiked, likeCount, toggleLike, loading } = useAssetLike(
 *   assetId,
 *   asset.isLikedByCurrentUser,
 *   asset.likeCount
 * );
 * ```
 */

"use client";

import { useState, useCallback } from "react";

interface UseAssetLikeReturn {
  isLiked: boolean;
  likeCount: number;
  toggleLike: () => Promise<void>;
  loading: boolean;
}

export function useAssetLike(
  assetId: string,
  initialLiked: boolean = false,
  initialCount: number = 0
): UseAssetLikeReturn {
  // Trust server values - no async check needed
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggleLike = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    // Store previous state for potential rollback
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1));

    try {
      const method = previousLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/assets/${assetId}/like`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle like");
      }

      // Handle "Already liked" case - sync state without changing count
      if (data.message === "Already liked" && !previousLiked) {
        setIsLiked(true);
        setLikeCount(previousCount);
      }
    } catch (error) {
      console.error("[useAssetLike] Error toggling like:", error);
      // Rollback optimistic update on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setLoading(false);
    }
  }, [assetId, isLiked, likeCount, loading]);

  return { isLiked, likeCount, toggleLike, loading };
}
