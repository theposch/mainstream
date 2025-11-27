"use client";

import React from "react";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  likes: number;
  hasLiked: boolean;
  commentCount: number;
  onLike: () => void;
  onCommentsTap: () => void;
  onMoreTap?: () => void;
}

export const MobileActionBar = React.memo(function MobileActionBar({
  likes,
  hasLiked,
  commentCount,
  onLike,
  onCommentsTap,
  onMoreTap
}: MobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4">
      {/* Like Button */}
      <button 
        onClick={onLike}
        className="flex flex-col items-center gap-1 p-2 text-zinc-400 active:scale-95 transition-transform"
      >
        <Heart 
          className={cn(
            "h-6 w-6 transition-colors", 
            hasLiked ? "fill-red-500 text-red-500" : "text-white"
          )} 
        />
        <span className={cn("text-xs font-medium", hasLiked ? "text-red-500" : "text-zinc-400")}>
          {likes}
        </span>
      </button>

      {/* Comments Button (Primary Action) */}
      <button 
        onClick={onCommentsTap}
        className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-full flex items-center px-4 gap-2 transition-colors"
      >
        <MessageCircle className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-300">
          {commentCount === 0 ? "Add a comment..." : `${commentCount} comments`}
        </span>
      </button>

      {/* More Button */}
      {onMoreTap && (
        <button 
          onClick={onMoreTap}
          className="flex flex-col items-center gap-1 p-2 text-zinc-400 active:scale-95 transition-transform"
        >
          <MoreHorizontal className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
});

