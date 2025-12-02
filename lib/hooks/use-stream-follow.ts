/**
 * Stream Follow Hook
 * 
 * Manages following/unfollowing streams with optimistic updates.
 * 
 * Usage:
 * ```tsx
 * const { isFollowing, followerCount, followers, toggleFollow, loading } = useStreamFollow(streamId);
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types/database";

interface UseStreamFollowReturn {
  isFollowing: boolean;
  followerCount: number;
  followers: User[];
  toggleFollow: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useStreamFollow(streamId: string): UseStreamFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch follow state from API
  useEffect(() => {
    const fetchFollowState = async () => {
      if (!streamId) return;
      
      setInitialLoading(true);
      
      try {
        const response = await fetch(`/api/streams/${streamId}/follow`);
        
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing || false);
          setFollowerCount(data.followerCount || 0);
          setFollowers(data.followers || []);
        }
      } catch (err) {
        console.error('[useStreamFollow] Error fetching follow state:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchFollowState();
  }, [streamId]);

  const toggleFollow = useCallback(async () => {
    if (loading || !streamId) return;

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((prev) => wasFollowing ? prev - 1 : prev + 1);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle follow');
      }

      // Optionally refresh followers list after follow
      if (!wasFollowing) {
        // After following, fetch updated followers
        const followersResponse = await fetch(`/api/streams/${streamId}/follow`);
        if (followersResponse.ok) {
          const data = await followersResponse.json();
          setFollowers(data.followers || []);
        }
      }
    } catch (err) {
      console.error('[useStreamFollow] Error toggling follow:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Rollback optimistic update
      setIsFollowing(wasFollowing);
      setFollowerCount((prev) => wasFollowing ? prev + 1 : prev - 1);
    } finally {
      setLoading(false);
    }
  }, [streamId, isFollowing, loading]);

  return {
    isFollowing,
    followerCount,
    followers,
    toggleFollow,
    loading: loading || initialLoading,
    error,
  };
}

