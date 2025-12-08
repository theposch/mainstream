"use client";

/**
 * Stream Members Hook
 * 
 * Manages members of private streams with optimistic updates.
 * Accepts optional initial data from server-side rendering to avoid client-side fetch.
 * 
 * Usage:
 * ```tsx
 * // Without initial data (will fetch on mount)
 * const { members, addMember, removeMember } = useStreamMembers(streamId);
 * 
 * // With server-prefetched data (instant, no fetch)
 * const { members, addMember, removeMember } = useStreamMembers(streamId, initialData);
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { User } from "@/lib/types/database";

export interface StreamMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

export interface StreamOwner {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface InitialMembersData {
  members: StreamMember[];
  memberCount: number;
  currentUserRole: 'owner' | 'admin' | 'member' | null;
  owner: StreamOwner | null;
}

interface UseStreamMembersReturn extends InitialMembersData {
  addMember: (userId: string, role?: 'admin' | 'member') => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStreamMembers(
  streamId: string,
  initialData?: InitialMembersData
): UseStreamMembersReturn {
  // Use initial data if provided, otherwise use defaults
  const [members, setMembers] = useState<StreamMember[]>(initialData?.members ?? []);
  const [memberCount, setMemberCount] = useState(initialData?.memberCount ?? 0);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(
    initialData?.currentUserRole ?? null
  );
  const [owner, setOwner] = useState<StreamOwner | null>(initialData?.owner ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we've initialized to prevent re-fetching when initial data changes
  const hasInitialized = useRef(!!initialData);

  // Fetch members from API
  const fetchMembers = useCallback(async () => {
    if (!streamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/streams/${streamId}/members`);
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setMemberCount(data.memberCount || 0);
        setCurrentUserRole(data.currentUserRole || null);
        setOwner(data.owner || null);
        hasInitialized.current = true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        console.error('[useStreamMembers] API error:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('[useStreamMembers] Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  // Initial fetch if no initial data provided
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    fetchMembers();
  }, [fetchMembers]);

  // Add a member to the stream
  const addMember = useCallback(async (userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> => {
    if (actionLoading || !streamId) return false;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      // Add to local state
      if (data.member) {
        setMembers(prev => {
          // Check if already exists
          if (prev.some(m => m.user_id === data.member.user_id)) {
            return prev;
          }
          return [...prev, data.member];
        });
        setMemberCount(prev => prev + 1);
      }

      return true;
    } catch (err) {
      console.error('[useStreamMembers] Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [streamId, actionLoading]);

  // Remove a member from the stream
  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    if (actionLoading || !streamId) return false;

    // Optimistic update
    const previousMembers = members;
    const previousCount = memberCount;
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    setMemberCount(prev => Math.max(0, prev - 1));
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/members?user_id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      return true;
    } catch (err) {
      console.error('[useStreamMembers] Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      
      // Rollback optimistic update
      setMembers(previousMembers);
      setMemberCount(previousCount);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [streamId, members, memberCount, actionLoading]);

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    members,
    memberCount,
    currentUserRole,
    owner,
    addMember,
    removeMember,
    loading,
    actionLoading,
    error,
    refetch: fetchMembers,
  }), [members, memberCount, currentUserRole, owner, addMember, removeMember, loading, actionLoading, error, fetchMembers]);
}

