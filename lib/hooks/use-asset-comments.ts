/**
 * Asset Comments Hook
 * 
 * Manages comments for an asset with real-time updates via Supabase Realtime.
 * 
 * Usage:
 * ```tsx
 * const { comments, addComment, updateComment, deleteComment, loading } = useAssetComments(assetId);
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  asset_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url?: string;
    job_title?: string;
  };
}

interface UseAssetCommentsReturn {
  comments: Comment[];
  addComment: (content: string, parentId?: string) => Promise<Comment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useAssetComments(assetId: string): UseAssetCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}/comments`);
        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }
        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error("[useAssetComments] Error fetching comments:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    fetchComments();
  }, [assetId]);

  // Subscribe to real-time comment updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`asset_comments:${assetId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "asset_comments",
          filter: `asset_id=eq.${assetId}`,
        },
        async (payload) => {
          // Fetch the full comment with user data
          const { data } = await supabase
            .from("asset_comments")
            .select(`
              *,
              user:users!user_id(*)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setComments((prev) => [...prev, data]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "asset_comments",
          filter: `asset_id=eq.${assetId}`,
        },
        async (payload) => {
          // Fetch the updated comment with user data
          const { data } = await supabase
            .from("asset_comments")
            .select(`
              *,
              user:users!user_id(*)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setComments((prev) =>
              prev.map((c) => (c.id === data.id ? data : c))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "asset_comments",
          filter: `asset_id=eq.${assetId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [assetId]);

  const addComment = useCallback(
    async (content: string, parentId?: string): Promise<Comment | null> => {
      if (loading) return null;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/assets/${assetId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            parent_id: parentId || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add comment");
        }

        const data = await response.json();
        // Real-time subscription will update the list
        return data.comment;
      } catch (err) {
        console.error("[useAssetComments] Error adding comment:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [assetId, loading]
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      if (loading) return false;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/comments/${commentId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update comment");
        }

        // Real-time subscription will update the list
        return true;
      } catch (err) {
        console.error("[useAssetComments] Error updating comment:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (loading) return false;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/comments/${commentId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete comment");
        }

        // Real-time subscription will update the list
        return true;
      } catch (err) {
        console.error("[useAssetComments] Error deleting comment:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  return {
    comments,
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
  };
}



