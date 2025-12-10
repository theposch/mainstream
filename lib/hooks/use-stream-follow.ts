"use client";

/**
 * Stream Follow Hook
 * 
 * Manages following/unfollowing streams with optimistic updates.
 * Accepts optional initial data from server-side rendering to avoid client-side fetch.
 * 
 * Usage:
 * ```tsx
 * // Without initial data (will fetch on mount)
 * const { isFollowing, followerCount, toggleFollow } = useStreamFollow(streamId);
 * 
 * // With server-prefetched data (instant, no fetch)
 * const { isFollowing, followerCount, toggleFollow } = useStreamFollow(streamId, initialData);
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { assetKeys } from "@/lib/queries/asset-queries";
import type { User } from "@/lib/types/database";

// Export for use in server components
export interface InitialFollowData {
  isFollowing: boolean;
  followerCount: number;
  followers: User[];
  contributorCount: number;
  contributors: User[];
  assetCount: number;
}

interface UseStreamFollowReturn extends InitialFollowData {
  toggleFollow: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useStreamFollow(
  streamId: string, 
  initialData?: InitialFollowData
): UseStreamFollowReturn {
  const queryClient = useQueryClient();
  
  // Use initial data if provided, otherwise use defaults
  const [isFollowing, setIsFollowing] = useState(initialData?.isFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(initialData?.followerCount ?? 0);
  const [followers, setFollowers] = useState<User[]>(initialData?.followers ?? []);
  const [contributorCount, setContributorCount] = useState(initialData?.contributorCount ?? 0);
  const [contributors, setContributors] = useState<User[]>(initialData?.contributors ?? []);
  const [assetCount, setAssetCount] = useState(initialData?.assetCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // If initial data provided, we're not loading; otherwise we need to fetch
  const [initialLoading, setInitialLoading] = useState(!initialData);
  
  // Track if we've initialized to prevent re-fetching when initial data changes
  const hasInitialized = useRef(!!initialData);

  // Fetch follow state from API (only if no initial data provided)
  useEffect(() => {
    // Skip fetch if we have initial data
    if (hasInitialized.current) {
      return;
    }
    
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
          setContributorCount(data.contributorCount || 0);
          setContributors(data.contributors || []);
          setAssetCount(data.assetCount || 0);
          setError(null);
          hasInitialized.current = true;
        } else {
          // Handle non-ok responses (401, 404, 500, etc.)
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Request failed with status ${response.status}`;
          console.error('[useStreamFollow] API error:', errorMessage);
          setError(errorMessage);
        }
      } catch (err) {
        console.error('[useStreamFollow] Error fetching follow state:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch follow state');
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

      // Both POST and DELETE return updated follower data and stream stats
      const data = await response.json();
      if (data.followers) {
        setFollowers(data.followers);
      }
      if (typeof data.followerCount === 'number') {
        setFollowerCount(data.followerCount);
      }
      if (typeof data.isFollowing === 'boolean') {
        setIsFollowing(data.isFollowing);
      }
      // Update stream stats (these don't change on follow/unfollow but are
      // included for API consistency and to handle any data drift)
      if (typeof data.contributorCount === 'number') {
        setContributorCount(data.contributorCount);
      }
      if (data.contributors) {
        setContributors(data.contributors);
      }
      if (typeof data.assetCount === 'number') {
        setAssetCount(data.assetCount);
      }
      
      // Invalidate the "following" feed cache so it refetches with new follows
      queryClient.invalidateQueries({ queryKey: assetKeys.following() });
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

  // Memoize return object to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    isFollowing,
    followerCount,
    followers,
    contributorCount,
    contributors,
    assetCount,
    toggleFollow,
    loading: loading || initialLoading,
    error,
  }), [isFollowing, followerCount, followers, contributorCount, contributors, assetCount, toggleFollow, loading, initialLoading, error]);
}

