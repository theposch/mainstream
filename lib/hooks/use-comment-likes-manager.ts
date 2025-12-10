"use client";

/**
 * Comment Likes Manager Hook
 * 
 * Provides centralized management for comment likes with a SINGLE Supabase
 * subscription per asset, eliminating the N-subscription problem where each
 * CommentItem had its own channel (50 comments = 50 channels).
 * 
 * Architecture:
 * - Single WebSocket channel per asset for all comment likes
 * - Centralized state Map for O(1) like state lookups
 * - Optimistic updates with rollback on failure
 * - Filters events to only relevant comment IDs
 * 
 * Usage:
 * ```tsx
 * const { getLikeState, toggleLike } = useCommentLikesManager(assetId, comments);
 * 
 * // In CommentItem:
 * const { isLiked, likeCount } = getLikeState(comment.id);
 * const handleLike = () => toggleLike(comment.id);
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types/database";

export interface CommentLikeState {
  isLiked: boolean;
  likeCount: number;
}

interface UseCommentLikesManagerReturn {
  /** Get the like state for a specific comment - O(1) lookup */
  getLikeState: (commentId: string) => CommentLikeState;
  /** Toggle like for a comment with optimistic update */
  toggleLike: (commentId: string) => Promise<void>;
  /** Whether any like operation is in progress */
  isLoading: boolean;
}

// Default state for comments not in the map
const DEFAULT_LIKE_STATE: CommentLikeState = { isLiked: false, likeCount: 0 };

export function useCommentLikesManager(
  assetId: string,
  comments: Comment[]
): UseCommentLikesManagerReturn {
  // Track current user ID for filtering self-events in realtime
  const currentUserIdRef = useRef<string | null>(null);
  
  // Track which comment IDs we're managing
  const commentIdsRef = useRef<Set<string>>(new Set());
  
  // Loading state for optimistic updates
  const [isLoading, setIsLoading] = useState(false);
  
  // Build initial state map from comments
  const [likeStates, setLikeStates] = useState<Map<string, CommentLikeState>>(() => {
    const map = new Map<string, CommentLikeState>();
    for (const comment of comments) {
      map.set(comment.id, {
        isLiked: comment.has_liked || false,
        likeCount: comment.likes || 0,
      });
    }
    return map;
  });

  // Update comment IDs ref when comments change
  useEffect(() => {
    commentIdsRef.current = new Set(comments.map(c => c.id));
    
    // Also update state for any new comments
    setLikeStates(prev => {
      const updated = new Map(prev);
      let hasChanges = false;
      
      for (const comment of comments) {
        if (!updated.has(comment.id)) {
          updated.set(comment.id, {
            isLiked: comment.has_liked || false,
            likeCount: comment.likes || 0,
          });
          hasChanges = true;
        }
      }
      
      return hasChanges ? updated : prev;
    });
  }, [comments]);

  // Single subscription for ALL comment likes on this asset
  useEffect(() => {
    if (!assetId) return;
    
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      // Get current user for filtering self-events
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserIdRef.current = user.id;
      }

      channel = supabase
        .channel(`comment_likes:asset:${assetId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comment_likes',
          },
          (payload) => {
            // Extract comment_id from payload
            const newRecord = payload.new as { comment_id?: string; user_id?: string } | null;
            const oldRecord = payload.old as { comment_id?: string; user_id?: string } | null;
            const commentId = newRecord?.comment_id || oldRecord?.comment_id;
            const eventUserId = newRecord?.user_id || oldRecord?.user_id;
            
            // Ignore if not a comment we're tracking
            if (!commentId || !commentIdsRef.current.has(commentId)) return;
            
            // Ignore our own actions - we handle them optimistically
            if (eventUserId === currentUserIdRef.current) return;

            // Update the specific comment's like state
            setLikeStates(prev => {
              const current = prev.get(commentId) || DEFAULT_LIKE_STATE;
              const updated = new Map(prev);
              
              if (payload.eventType === 'INSERT') {
                updated.set(commentId, {
                  ...current,
                  likeCount: current.likeCount + 1,
                });
              } else if (payload.eventType === 'DELETE') {
                updated.set(commentId, {
                  ...current,
                  likeCount: Math.max(0, current.likeCount - 1),
                });
              }
              
              return updated;
            });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [assetId]);

  // O(1) lookup for like state
  const getLikeState = useCallback((commentId: string): CommentLikeState => {
    return likeStates.get(commentId) || DEFAULT_LIKE_STATE;
  }, [likeStates]);

  // Toggle like with optimistic update
  const toggleLike = useCallback(async (commentId: string): Promise<void> => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Capture current state for rollback
    const currentState = likeStates.get(commentId) || DEFAULT_LIKE_STATE;
    const wasLiked = currentState.isLiked;
    
    // Optimistic update
    setLikeStates(prev => {
      const updated = new Map(prev);
      updated.set(commentId, {
        isLiked: !wasLiked,
        likeCount: wasLiked 
          ? Math.max(0, currentState.likeCount - 1) 
          : currentState.likeCount + 1,
      });
      return updated;
    });

    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method,
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }
    } catch (error) {
      console.error('[useCommentLikesManager] Error toggling like:', error);
      
      // Rollback optimistic update
      setLikeStates(prev => {
        const updated = new Map(prev);
        updated.set(commentId, currentState);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [likeStates, isLoading]);

  // Memoize return to prevent unnecessary re-renders
  return useMemo(() => ({
    getLikeState,
    toggleLike,
    isLoading,
  }), [getLikeState, toggleLike, isLoading]);
}

