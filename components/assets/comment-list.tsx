import React from "react";
import { CommentItem } from "./comment-item";
import { cn } from "@/lib/utils";

// Database types
interface Comment {
  id: string;
  asset_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  likes: number;
  has_liked: boolean;
  user?: User;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
  job_title?: string;
}

interface CommentListProps {
  comments: Comment[];
  currentUser: User | null;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onStartEdit: (commentId: string) => void;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => void;
  editingCommentId: string | null;
  onCancelEdit: () => void;
}

export const CommentList = React.memo(function CommentList({
  comments,
  currentUser,
  onReply,
  onEdit,
  onStartEdit,
  onDelete,
  onLike,
  editingCommentId,
  onCancelEdit
}: CommentListProps) {
  // Group comments by parent_id
  const topLevelComments = React.useMemo(() => 
    comments
      .filter(c => !c.parent_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [comments]
  );

  const getReplies = (parentId: string) => 
    comments
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getUser = (userId: string) => comments.find(c => c.user_id === userId)?.user;

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500">
        <p className="text-sm">No comments yet.</p>
        <p className="text-xs mt-1">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {topLevelComments.map((comment) => {
        const replies = getReplies(comment.id);
        return (
          <div key={comment.id} className="space-y-3">
            {/* Parent Comment */}
            <CommentItem
              comment={comment}
              author={getUser(comment.user_id)}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onLike={onLike}
              isEditing={editingCommentId === comment.id}
              onCancelEdit={onCancelEdit}
            />

            {/* Replies */}
            {replies.length > 0 && (
              <div className="pl-11 space-y-3 relative before:absolute before:left-[22px] before:top-0 before:bottom-4 before:w-px before:bg-zinc-800">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    author={getUser(reply.user_id)}
                    currentUser={currentUser}
                    onReply={onReply} // Replying to a reply targets the reply (or parent?) - typically targets the specific comment
                    onEdit={onEdit}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    onLike={onLike}
                    isEditing={editingCommentId === reply.id}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

