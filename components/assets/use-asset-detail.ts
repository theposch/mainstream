/**
 * Asset Detail Hook (Wrapper)
 * 
 * This hook combines useAssetComments and useAssetLike for convenience.
 * It's kept for backward compatibility with existing components.
 * 
 * For new components, prefer using useAssetComments and useAssetLike directly.
 */

"use client";

import * as React from "react";
import { useAssetComments } from "@/lib/hooks/use-asset-comments";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { createClient } from "@/lib/supabase/client";

export function useAssetDetail(asset: any) {
  // Use real hooks for comments and likes (pass server-fetched like data)
  const { comments, addComment, updateComment, deleteComment, loading: commentsLoading } = useAssetComments(asset.id);
  const { isLiked, likeCount, toggleLike } = useAssetLike(
    asset.id,
    asset.isLikedByCurrentUser ?? false,
    asset.likeCount ?? 0
  );

  // Local UI state
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  // Fetch current user
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchCurrentUser();
  }, []);

  // Reset state when asset changes
  React.useEffect(() => {
    setReplyingToId(null);
    setEditingCommentId(null);
    setIsSubmitting(false);
  }, [asset.id]);

  const handleAddComment = React.useCallback(async (content: string) => {
    setIsSubmitting(true);
    await addComment(content, replyingToId || undefined);
    setReplyingToId(null);
    setIsSubmitting(false);
  }, [addComment, replyingToId]);

  const handleEditComment = React.useCallback(async (commentId: string, newContent: string) => {
    await updateComment(commentId, newContent);
    setEditingCommentId(null);
  }, [updateComment]);

  const handleDeleteComment = React.useCallback(async (commentId: string) => {
    await deleteComment(commentId);
  }, [deleteComment]);

  const handleLikeComment = React.useCallback((commentId: string) => {
    // Comment likes are now handled by useCommentLike hook in CommentItem component
    console.log('Like comment:', commentId);
  }, []);

  const handleAssetLike = React.useCallback(async () => {
    await toggleLike();
  }, [toggleLike]);

  const replyingToUser = React.useMemo(() => {
    if (!replyingToId) return null;
    const comment = comments.find(c => c.id === replyingToId);
    return comment?.user || null;
  }, [replyingToId, comments]);

  return {
    comments,
    replyingToId,
    setReplyingToId,
    editingCommentId,
    setEditingCommentId,
    isSubmitting,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleLikeComment,
    handleAssetLike,
    isLiked,
    likeCount,
    replyingToUser,
    currentUser
  };
}

