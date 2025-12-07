"use client";

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

import { useState, useCallback, useRef } from "react";

interface UseAssetLikeReturn {
  isLiked: boolean;
  likeCount: number;
  /** Returns true if toggle succeeded, false if it failed and was rolled back */
  toggleLike: () => Promise<boolean>;
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
  
  // Use ref for loading guard to avoid recreating callback on loading state change
  const loadingRef = useRef(false);

  const toggleLike = useCallback(async (): Promise<boolean> => {
    if (loadingRef.current) return false;

    loadingRef.current = true;
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

      // "Already liked" means the like existed - keep optimistic state (isLiked=true)
      // Don't revert count as that causes confusing UI decrements
      
      return true; // Success
    } catch (error) {
      console.error("[useAssetLike] Error toggling like:", error);
      // Rollback optimistic update on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      return false; // Failed
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [assetId, isLiked, likeCount]);

  return { isLiked, likeCount, toggleLike, loading };
}
