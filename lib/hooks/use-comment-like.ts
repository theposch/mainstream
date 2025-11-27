/**
 * Comment Like Hook
 * 
 * Manages like/unlike functionality for comments with optimistic updates
 * and Supabase Realtime subscriptions for live updates.
 * 
 * Usage:
 * ```tsx
 * const { isLiked, likeCount, toggleLike, loading } = useCommentLike(commentId, initialLiked, initialCount);
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseCommentLikeReturn {
  isLiked: boolean;
  likeCount: number;
  toggleLike: () => Promise<void>;
  loading: boolean;
}

export function useCommentLike(
  commentId: string,
  initialLiked: boolean = false,
  initialCount: number = 0
): UseCommentLikeReturn {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  // Subscribe to real-time like count changes
  useEffect(() => {
    const supabase = createClient();

    // Fetch current like count and user's like status
    const fetchLikeData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get total like count
      const { count } = await supabase
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId);

      setLikeCount(count || 0);

      // Check if current user has liked
      if (user) {
        const { data } = await supabase
          .from("comment_likes")
          .select("*")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .single();

        setIsLiked(!!data);
      }
    };

    fetchLikeData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`comment_likes:${commentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_likes",
          filter: `comment_id=eq.${commentId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLikeCount((prev) => prev + 1);
          } else if (payload.eventType === "DELETE") {
            setLikeCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [commentId]);

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
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method,
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }
    } catch (error) {
      console.error("[useCommentLike] Error toggling like:", error);
      // Rollback optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setLoading(false);
    }
  }, [commentId, isLiked, likeCount, loading]);

  return { isLiked, likeCount, toggleLike, loading };
}

