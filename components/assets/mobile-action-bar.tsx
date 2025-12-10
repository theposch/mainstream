"use client";

import React from "react";
import { Heart, MessageCircle, MoreHorizontal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  likes: number;
  hasLiked: boolean;
  commentCount: number;
  viewCount?: number;
  onLike: () => void;
  onCommentsTap: () => void;
  onMoreTap?: () => void;
}

export const MobileActionBar = React.memo(function MobileActionBar({
  likes,
  hasLiked,
  commentCount,
  viewCount,
  onLike,
  onCommentsTap,
  onMoreTap
}: MobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between gap-4">
      {/* Like Button */}
      <button 
        onClick={onLike}
        className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground active:scale-95 transition-transform cursor-pointer"
      >
        <Heart 
          className={cn(
            "h-6 w-6 transition-colors", 
            hasLiked ? "fill-red-500 text-red-500" : "text-foreground"
          )} 
        />
        <span className={cn("text-xs font-medium", hasLiked ? "text-red-500" : "text-muted-foreground")}>
          {likes}
        </span>
        {/* View count below likes */}
        {viewCount !== undefined && (
          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5 mt-0.5">
            <Eye className="h-2.5 w-2.5" />
            {viewCount}
          </span>
        )}
      </button>

      {/* Comments Button (Primary Action) */}
      <button 
        onClick={onCommentsTap}
        className="flex-1 h-10 bg-muted hover:bg-accent active:bg-accent/80 rounded-full flex items-center px-4 gap-2 transition-colors cursor-pointer"
      >
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground/80">
          {commentCount === 0 ? "Add a comment..." : `${commentCount} comments`}
        </span>
      </button>

      {/* More Button */}
      {onMoreTap && (
        <button 
          onClick={onMoreTap}
          className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:scale-95 transition-transform cursor-pointer"
        >
          <MoreHorizontal className="h-6 w-6 text-foreground" />
        </button>
      )}
    </div>
  );
});

