"use client";

/**
 * User Follow Hook
 * 
 * Manages following/unfollowing users with optimistic updates.
 * 
 * Usage:
 * ```tsx
 * const { isFollowing, followerCount, toggleFollow, loading } = useUserFollow(username);
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { assetKeys } from "@/lib/queries/asset-queries";

interface UseUserFollowReturn {
  isFollowing: boolean;
  followerCount: number;
  toggleFollow: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useUserFollow(targetUsername: string): UseUserFollowReturn {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // Fetch current user and follow state
  useEffect(() => {
    const fetchFollowState = async () => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        return;
      }
      
      setCurrentUserId(user.id);

      // Get target user by username
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('id')
        .eq('username', targetUsername)
        .single();

      if (targetError || !targetUser) {
        console.error('[useUserFollow] Target user not found:', targetError);
        return;
      }

      setTargetUserId(targetUser.id);

      // Don't check follow state if viewing own profile
      if (user.id === targetUser.id) {
        return;
      }

      try {
        // Check if current user follows target user
        const { data: followData } = await supabase
          .from('user_follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', targetUser.id)
          .single();

        setIsFollowing(!!followData);

        // Get follower count
        const { count } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetUser.id);

        setFollowerCount(count || 0);
      } catch (err) {
        console.error('[useUserFollow] Error fetching follow state:', err);
      }
    };

    fetchFollowState();
  }, [targetUsername]);

  const toggleFollow = useCallback(async () => {
    if (loading || !currentUserId || !targetUserId || currentUserId === targetUserId) return;

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((prev) => wasFollowing ? prev - 1 : prev + 1);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${targetUsername}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle follow');
      }

      // Invalidate the "following" feed cache so it refetches with new follows
      queryClient.invalidateQueries({ queryKey: assetKeys.following() });
    } catch (err) {
      console.error('[useUserFollow] Error toggling follow:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Rollback optimistic update
      setIsFollowing(wasFollowing);
      setFollowerCount((prev) => wasFollowing ? prev + 1 : prev - 1);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, targetUsername, isFollowing, loading]);

  return {
    isFollowing,
    followerCount,
    toggleFollow,
    loading,
    error,
  };
}

