/**
 * Asset Like Hook
 * 
 * Manages like/unlike functionality with optimistic updates.
 * 
 * Strategy:
 * - Accept initialCount from server (reliable for aggregates)
 * - ALWAYS verify like status client-side (server-side auth is unreliable)
 * - Use optimistic updates for responsiveness
 * 
 * Usage:
 * ```tsx
 * const { isLiked, likeCount, toggleLike, loading } = useAssetLike(assetId, initialCount);
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
  initialCount?: number
): UseAssetLikeReturn {
  // Like status is ALWAYS verified client-side (server-side auth is unreliable)
  const [isLiked, setIsLiked] = useState(false);
  // Like count can be trusted from server if provided
  const [likeCount, setLikeCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const isMounted = useRef(true);

  // Always verify like status client-side on mount
  useEffect(() => {
    isMounted.current = true;
    
    const checkLikeStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !isMounted.current) {
        setStatusChecked(true);
        return;
      }

      // Check if current user has liked this asset
      const { data } = await supabase
        .from("asset_likes")
        .select("id")
        .eq("asset_id", assetId)
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle to avoid error when no row exists

      if (isMounted.current) {
        setIsLiked(!!data);
        setStatusChecked(true);
      }

      // If no initial count was provided, also fetch the count
      if (initialCount === undefined && isMounted.current) {
        const { count } = await supabase
          .from("asset_likes")
          .select("*", { count: "exact", head: true })
          .eq("asset_id", assetId);

        if (isMounted.current) {
          setLikeCount(count || 0);
        }
      }
    };

    checkLikeStatus();

    return () => {
      isMounted.current = false;
    };
  }, [assetId, initialCount]);

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

      // Handle "Already liked" case - don't change the count
      if (data.message === "Already liked" && !previousLiked) {
        // User was trying to like but already had liked - sync state
        setIsLiked(true);
        setLikeCount(previousCount); // Keep original count
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
