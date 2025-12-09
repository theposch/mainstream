import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils/time";
import { CommentInput } from "./comment-input";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash2, Edit2, Heart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommentLike } from "@/lib/hooks/use-comment-like";
import { LikeButton } from "@/components/ui/like-button";

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

interface CommentItemProps {
  comment: Comment;
  author?: User;
  currentUser: User | null;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onStartEdit: (commentId: string) => void;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  /** Whether this comment should be highlighted (e.g., from notification click) */
  isHighlighted?: boolean;
}

export const CommentItem = React.memo(function CommentItem({
  comment,
  author,
  currentUser,
  onReply,
  onEdit,
  onStartEdit,
  onDelete,
  onLike,
  isEditing,
  onCancelEdit,
  isHighlighted = false
}: CommentItemProps) {
  const isOwner = currentUser?.id === comment.user_id;
  const [isHovered, setIsHovered] = React.useState(false);
  const [showHighlight, setShowHighlight] = React.useState(isHighlighted);
  const commentRef = React.useRef<HTMLDivElement>(null);

  // Handle highlight animation - auto-clear after animation
  React.useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true);
      // Scroll into view
      commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Clear highlight after animation (2 seconds)
      const timer = setTimeout(() => setShowHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);
  
  // Use comment like hook for real-time like functionality
  const { isLiked, likeCount, toggleLike } = useCommentLike(
    comment.id,
    comment.has_liked || false,
    comment.likes || 0
  );

  if (isEditing) {
    return (
      <div className="py-2 pl-11">
        <CommentInput
          currentUser={currentUser}
          onSubmit={(content) => onEdit(comment.id, content)}
          isSubmitting={false}
          initialValue={comment.content}
          onCancel={onCancelEdit}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div 
      ref={commentRef}
      id={`comment-${comment.id}`}
      className={cn(
        "group flex gap-3 py-3 px-2 -mx-2 rounded-lg transition-colors duration-500",
        showHighlight && "bg-amber-500/20 animate-pulse"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-8 w-8 shrink-0 border border-border mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
        <AvatarImage src={author?.avatar_url} alt={author?.display_name} />
        <AvatarFallback>{author?.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-white hover:underline cursor-pointer">
              {author?.display_name || "Unknown User"}
            </span>
            <span className="text-xs text-zinc-500">
              {formatRelativeTime(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-zinc-600 italic">(edited)</span>
            )}
          </div>
          
          {/* Actions Menu (Mobile/Desktop) */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  className={cn(
                    "h-6 w-6 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-zinc-950 border border-zinc-700 text-zinc-200 shadow-xl z-[100]">
                <DropdownMenuItem onClick={() => onStartEdit(comment.id)} className="cursor-pointer hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white">
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(comment.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/50 focus:text-red-300 focus:bg-red-950/50 cursor-pointer"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed break-words">
          {comment.content}
        </p>

        <div className="flex items-center gap-4 mt-1.5">
          {/* Only show Reply on top-level comments (no nested replies) */}
          {!comment.parent_id && (
            <button 
              onClick={() => onReply(comment.id)}
              className="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              Reply
            </button>
          )}
          
          <LikeButton 
            isLiked={isLiked}
            likeCount={likeCount}
            onLike={toggleLike}
            variant="ghost"
            size="sm"
            className={isLiked ? "text-red-500" : "text-zinc-500 hover:text-white"}
          />
        </div>
      </div>
    </div>
  );
});
