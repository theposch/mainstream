"use client";

/**
 * Typing Indicator Hook
 * 
 * Uses Supabase Realtime Presence to show "X is typing..." indicators.
 * 
 * Usage:
 * ```tsx
 * const { typingUsers, setTyping } = useTypingIndicator(assetId);
 * 
 * // When user types
 * <textarea onChange={(e) => { setTyping(true); ... }} />
 * 
 * // Display indicator
 * {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  id: string;
  username: string;
  display_name: string;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  setTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator(assetId: string): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentUser, setCurrentUser] = useState<TypingUser | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    // Early return if no assetId
    if (!assetId) return;
    
    const supabase = createClient();
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("id, username, display_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
      }
    };

    fetchUser();
  }, []);

  // Set up presence channel
  useEffect(() => {
    // Early return if no assetId or user
    if (!assetId || !currentUser) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing:${assetId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];

        Object.entries(state).forEach(([userId, presences]) => {
          // Skip current user
          if (userId === currentUser.id) return;
          
          const presence = presences[0] as any;
          if (presence?.isTyping) {
            users.push({
              id: userId,
              username: presence.username,
              display_name: presence.display_name,
            });
          }
        });

        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track initial presence (not typing)
          await channel.track({
            isTyping: false,
            username: currentUser.username,
            display_name: currentUser.display_name,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [assetId, currentUser]);

  const setTyping = useCallback((isTyping: boolean) => {
    // Early return if no channel or user
    if (!assetId || !channelRef.current || !currentUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Update presence
    channelRef.current.track({
      isTyping,
      username: currentUser.username,
      display_name: currentUser.display_name,
    });

    // Auto-clear typing after 3 seconds of no activity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          isTyping: false,
          username: currentUser.username,
          display_name: currentUser.display_name,
        });
      }, 3000);
    }
  }, [assetId, currentUser]);

  return {
    typingUsers,
    setTyping,
  };
}

