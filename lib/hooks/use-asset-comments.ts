/**
 * Asset Comments Hook
 * 
 * Manages comments for an asset with React Query caching and real-time updates.
 * Uses React Query for fetching/mutations and Supabase Realtime for live updates.
 * 
 * Usage:
 * ```tsx
 * const { comments, addComment, updateComment, deleteComment, loading } = useAssetComments(assetId);
 * ```
 */

"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { assetKeys, fetchAssetComments, type Comment } from "@/lib/queries/asset-queries";

interface UseAssetCommentsReturn {
  comments: Comment[];
  addComment: (content: string, parentId?: string) => Promise<Comment | null>;
  updateComment: (commentId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useAssetComments(assetId: string): UseAssetCommentsReturn {
  const queryClient = useQueryClient();
  const queryKey = assetKeys.comments(assetId);

  // Fetch comments with React Query
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchAssetComments(assetId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
            // Update cache with new comment
            queryClient.setQueryData<Comment[]>(queryKey, (old = []) => {
              // Avoid duplicates (in case mutation already added it)
              if (old.some(c => c.id === data.id)) return old;
              return [...old, { ...data, likes: 0, has_liked: false }];
            });
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
            // Update cache with updated comment
            queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
              old.map((c) => (c.id === data.id ? { ...c, ...data } : c))
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
          // Remove deleted comment from cache
          queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
            old.filter((c) => c.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [assetId, queryClient, queryKey]);

  // Add comment mutation
  const addMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const response = await fetch(`/api/assets/${assetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: parentId || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add comment");
      }

      const data = await response.json();
      return data.comment as Comment;
    },
    onSuccess: (newComment) => {
      // Optimistically add to cache (real-time will sync)
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) => {
        if (old.some(c => c.id === newComment.id)) return old;
        return [...old, newComment];
      });
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update comment");
      }

      return { commentId, content };
    },
    onMutate: async ({ commentId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
        old.map((c) =>
          c.id === commentId
            ? { ...c, content, is_edited: true, updated_at: new Date().toISOString() }
            : c
        )
      );

      return { previousComments };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(queryKey, context.previousComments);
      }
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete comment");
      }

      return commentId;
    },
    onMutate: async (commentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      // Optimistically remove from cache
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
        old.filter((c) => c.id !== commentId)
      );

      return { previousComments };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(queryKey, context.previousComments);
      }
    },
  });

  // Wrapper functions to match original API
  const addComment = useCallback(
    async (content: string, parentId?: string): Promise<Comment | null> => {
      try {
        return await addMutation.mutateAsync({ content, parentId });
      } catch {
        return null;
      }
    },
    [addMutation]
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ commentId, content });
        return true;
      } catch {
        return false;
      }
    },
    [updateMutation]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(commentId);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const loading = isLoading || addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return {
    comments,
    addComment,
    updateComment,
    deleteComment,
    loading,
    error: error instanceof Error ? error.message : null,
  };
}
