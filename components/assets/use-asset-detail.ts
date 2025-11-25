import * as React from "react";
import { Asset } from "@/lib/mock-data/assets";
import { Comment, comments as initialComments } from "@/lib/mock-data/comments";
import { users, currentUser } from "@/lib/mock-data/users";

export function useAssetDetail(asset: Asset) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Asset like state
  // TODO: Initialize with real data from API
  const [isLiked, setIsLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(24);

  // Load comments and reset state when asset changes
  React.useEffect(() => {
    setComments(initialComments.filter(c => c.assetId === asset.id));
    
    // Reset all state when switching assets
    setReplyingToId(null);
    setEditingCommentId(null);
    setIsSubmitting(false);
    
    // Reset like state (TODO: fetch from API)
    setIsLiked(false);
    setLikeCount(24);
  }, [asset.id]);

  const handleAddComment = React.useCallback(async (content: string) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      assetId: asset.id,
      userId: currentUser.id,
      content,
      parentId: replyingToId || undefined,
      createdAt: new Date().toISOString(),
      isEdited: false,
      likes: 0,
      hasLiked: false
    };
    
    setComments(prev => [...prev, newComment]);
    setReplyingToId(null);
    setIsSubmitting(false);
  }, [asset.id, replyingToId]);

  const handleEditComment = React.useCallback(async (commentId: string, newContent: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, content: newContent, isEdited: true, updatedAt: new Date().toISOString() }
        : c
    ));
    setEditingCommentId(null);
  }, []);

  const handleDeleteComment = React.useCallback(async (commentId: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Delete comment and all its replies
    setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
  }, []);

  const handleLikeComment = React.useCallback((commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const hasLiked = !c.hasLiked;
        return {
          ...c,
          hasLiked,
          likes: hasLiked ? c.likes + 1 : Math.max(0, c.likes - 1)
        };
      }
      return c;
    }));
  }, []);

  const handleAssetLike = React.useCallback(() => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    // TODO: API call to toggle like
  }, [isLiked]);

  const replyingToUser = React.useMemo(() => {
    if (!replyingToId) return null;
    const comment = comments.find(c => c.id === replyingToId);
    return comment ? users.find(u => u.id === comment.userId) : null;
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

