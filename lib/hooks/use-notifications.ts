/**
 * Notifications Hook
 * 
 * Manages user notifications with real-time updates via Supabase Realtime.
 * 
 * Usage:
 * ```tsx
 * const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: 'like_asset' | 'like_comment' | 'reply_comment' | 'follow' | 'mention';
  recipient_id: string;
  actor_id: string;
  resource_id: string | null;
  resource_type: 'asset' | 'comment' | 'user' | 'stream' | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        console.error('[useNotifications] Error fetching:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Subscribe to real-time notification updates
  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;

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
          async (payload) => {
            // Fetch the full notification with actor data
            const { data } = await supabase
              .from('notifications')
              .select(`
                *,
                actor:users!actor_id(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setNotifications((prev) => [data, ...prev]);
              setUnreadCount((prev) => prev + 1);
            }
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
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              )
            );
            
            // Update unread count if notification was marked as read
            if (payload.old.is_read === false && payload.new.is_read === true) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    // Cleanup function properly returned to React
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: [notificationId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Optimistic update - real-time subscription will also update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useNotifications] Error marking as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mark_all: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Error marking all as read:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
    error,
  };
}

