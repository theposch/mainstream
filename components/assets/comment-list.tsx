import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CommentItem } from "./comment-item";
import { useCommentLikesManager } from "@/lib/hooks/use-comment-likes-manager";
import { VIRTUALIZATION } from "@/lib/constants/cache";
import type { Comment, User, CommentUser } from "@/lib/types/database";

interface CommentListProps {
  /** Asset ID for the comment likes subscription */
  assetId: string;
  comments: Comment[];
  currentUser: User | null;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onStartEdit: (commentId: string) => void;
  onDelete: (commentId: string) => Promise<void>;
  editingCommentId: string | null;
  onCancelEdit: () => void;
  /** Comment ID to highlight (e.g., from notification click) */
  highlightedCommentId?: string | null;
}

export const CommentList = React.memo(function CommentList({
  assetId,
  comments,
  currentUser,
  onReply,
  onEdit,
  onStartEdit,
  onDelete,
  editingCommentId,
  onCancelEdit,
  highlightedCommentId
}: CommentListProps) {
  /**
   * Centralized comment likes manager - single subscription for ALL comments
   * instead of one subscription per comment (eliminates N-subscription problem).
   */
  const { getLikeState, toggleLike } = useCommentLikesManager(assetId, comments);

  /**
   * Pre-compute all data structures in a single pass for O(1) lookups.
   * This eliminates O(n*m) operations that were happening on every render:
   * - getReplies() was filtering all comments for each parent
   * - getUser() was doing linear search for each comment
   * - Date objects were being created repeatedly
   */
  const { topLevelComments, repliesMap, userMap } = React.useMemo(() => {
    const userMap = new Map<string, CommentUser>();
    const repliesMap = new Map<string, Comment[]>();
    const topLevel: Comment[] = [];

    // Single pass through comments to build all lookup structures
    for (const comment of comments) {
      // Build user lookup map for O(1) access
      if (comment.user && !userMap.has(comment.user_id)) {
        userMap.set(comment.user_id, comment.user);
      }
      
      // Partition into top-level vs replies
      if (comment.parent_id) {
        const replies = repliesMap.get(comment.parent_id) || [];
        replies.push(comment);
        repliesMap.set(comment.parent_id, replies);
      } else {
        topLevel.push(comment);
      }
    }

    // Sort once, not per-render (top-level: newest first)
    topLevel.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Sort replies (oldest first for conversation flow)
    for (const [, replies] of repliesMap) {
      replies.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return { topLevelComments: topLevel, repliesMap, userMap };
  }, [comments]);

  // Parent ref for virtualized scrolling
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Determine if we should virtualize
  const shouldVirtualize = topLevelComments.length > VIRTUALIZATION.COMMENT_THRESHOLD;

  // Estimate row size based on comment + replies
  const estimateSize = React.useCallback((index: number) => {
    const comment = topLevelComments[index];
    const replies = repliesMap.get(comment.id) || [];
    return VIRTUALIZATION.COMMENT_BASE_HEIGHT + (replies.length * VIRTUALIZATION.REPLY_HEIGHT);
  }, [topLevelComments, repliesMap]);

  // Virtualize only when we have many comments
  const rowVirtualizer = useVirtualizer({
    count: topLevelComments.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: VIRTUALIZATION.OVERSCAN,
    enabled: shouldVirtualize,
  });

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <p className="text-sm">No comments yet.</p>
        <p className="text-xs mt-1">Be the first to share your thoughts!</p>
      </div>
    );
  }

  // Render a single comment thread (parent + replies)
  const renderCommentThread = (comment: Comment, index: number) => {
    const replies = repliesMap.get(comment.id) || [];
    const author = userMap.get(comment.user_id);
    const likeState = getLikeState(comment.id);

    return (
      <div key={comment.id} className="space-y-3">
        {/* Parent Comment */}
        <CommentItem
          comment={comment}
          author={author}
          currentUser={currentUser}
          onReply={onReply}
          onEdit={onEdit}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          likeState={likeState}
          onToggleLike={toggleLike}
          isEditing={editingCommentId === comment.id}
          onCancelEdit={onCancelEdit}
          isHighlighted={highlightedCommentId === comment.id}
        />

        {/* Replies */}
        {replies.length > 0 && (
          <div className="pl-11 space-y-3 relative before:absolute before:left-[22px] before:top-0 before:bottom-4 before:w-px before:bg-border">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                author={userMap.get(reply.user_id)}
                currentUser={currentUser}
                onReply={onReply}
                onEdit={onEdit}
                onStartEdit={onStartEdit}
                onDelete={onDelete}
                likeState={getLikeState(reply.id)}
                onToggleLike={toggleLike}
                isEditing={editingCommentId === reply.id}
                onCancelEdit={onCancelEdit}
                isHighlighted={highlightedCommentId === reply.id}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Non-virtualized rendering for small comment lists
  if (!shouldVirtualize) {
    return (
      <div className="space-y-6">
        {topLevelComments.map((comment, index) => renderCommentThread(comment, index))}
      </div>
    );
  }

  // Virtualized rendering for large comment lists (30+ comments)
  // Uses flex-1 to inherit height from parent container instead of fixed height
  // This maintains natural scroll behavior with the rest of the detail view
  return (
    <div
      ref={parentRef}
      className="flex-1 min-h-0 overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const comment = topLevelComments[virtualRow.index];
          return (
            <div
              key={comment.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderCommentThread(comment, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
});

