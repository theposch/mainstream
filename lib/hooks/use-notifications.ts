"use client";

/**
 * Notifications Hook
 * 
 * Manages user notifications using React Query for caching with real-time
 * updates via Supabase Realtime.
 * 
 * Architecture:
 * - React Query handles caching, deduplication, and background refetching
 * - Supabase Realtime subscription invalidates query on new notifications
 * - Optimistic updates for mark-as-read operations with rollback on failure
 * 
 * Usage:
 * ```tsx
 * const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
 * ```
 */

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CACHE_TIMES } from "@/lib/constants/cache";
import type { Notification } from "@/lib/types/database";

// Re-export the Notification type for backwards compatibility
export type { Notification };

// ============================================================================
// Query Keys
// ============================================================================

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unread: () => [...notificationKeys.all, "unread"] as const,
};

// ============================================================================
// Types
// ============================================================================

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications');
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  const data = await response.json();
  return {
    notifications: data.notifications || [],
    unreadCount: data.unreadCount || 0,
  };
}

async function markNotificationAsRead(notificationId: string): Promise<void> {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_ids: [notificationId] }),
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mark_all: true }),
  });
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNotifications(): UseNotificationsReturn {
  const queryClient = useQueryClient();

  // Main query for notifications data
  const { data, isLoading, error } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    staleTime: CACHE_TIMES.SHORT_STALE_TIME, // 1 minute - notifications should stay fresh
    gcTime: CACHE_TIMES.GC_TIME,
  });

  // Subscribe to real-time updates and invalidate query
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // Invalidate query to refetch with new notification
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // Invalidate query to get updated read status
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
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
  }, [queryClient]);

  // Mark single notification as read with optimistic update
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      
      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list()
      );
      
      // Optimistically update
      queryClient.setQueryData<NotificationsResponse>(
        notificationKeys.list(),
        (old) => {
          if (!old) return old;
          const wasUnread = old.notifications.find(n => n.id === notificationId)?.is_read === false;
          return {
            notifications: old.notifications.map(n => 
              n.id === notificationId ? { ...n, is_read: true } : n
            ),
            unreadCount: wasUnread ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
          };
        }
      );
      
      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationKeys.list(), context.previousData);
      }
    },
  });

  // Mark all notifications as read with optimistic update
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      
      const previousData = queryClient.getQueryData<NotificationsResponse>(
        notificationKeys.list()
      );
      
      queryClient.setQueryData<NotificationsResponse>(
        notificationKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            notifications: old.notifications.map(n => ({ ...n, is_read: true })),
            unreadCount: 0,
          };
        }
      );
      
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(notificationKeys.list(), context.previousData);
      }
    },
  });

  // Wrap mutations in callbacks for stable references
  const markAsRead = useCallback(async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    markAsRead,
    markAllAsRead,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
