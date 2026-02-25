"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MessageCircle, MoreHorizontal, Pencil, Reply, Share2, Download, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LikeButton } from "@/components/ui/like-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StreamBadge } from "@/components/streams/stream-badge";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import { ViewersTooltip } from "./viewers-tooltip";
import { formatRelativeTime } from "@/lib/utils/time";
import type { Asset, User, Stream, Comment, CommentUser } from "@/lib/types/database";

export interface AssetDetailSidebarProps {
  currentAsset: Asset;
  currentUser: User | null;
  assetStreams: Stream[];
  isOwnPost: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  viewCount: number;
  isLiked: boolean;
  likeCount: number;
  comments: Comment[];
  editingCommentId: string | null;
  replyingToId: string | null;
  replyingToUser: CommentUser | null;
  isSubmitting: boolean;
  highlightedCommentId: string | null;
  canEdit: boolean;
  canDelete: boolean;
  commentsSectionRef: React.RefObject<HTMLDivElement>;
  originalAssetId: string;
  onFollow: () => void;
  onAssetLike: () => void;
  onScrollToComments: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onShare: () => void;
  onDownload: () => void;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (id: string, content: string) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
  onReply: (id: string | null) => void;
  onStartEdit: (id: string | null) => void;
  onCancelEdit: () => void;
}

/**
 * Right sidebar panel for the asset detail view.
 * Contains metadata, engagement controls, and the comment thread.
 */
export function AssetDetailSidebar({
  currentAsset,
  currentUser,
  assetStreams,
  isOwnPost,
  isFollowing,
  followLoading,
  viewCount,
  isLiked,
  likeCount,
  comments,
  editingCommentId,
  replyingToId,
  replyingToUser,
  isSubmitting,
  highlightedCommentId,
  canEdit,
  canDelete,
  commentsSectionRef,
  originalAssetId,
  onFollow,
  onAssetLike,
  onScrollToComments,
  onEditClick,
  onDeleteClick,
  onShare,
  onDownload,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReply,
  onStartEdit,
  onCancelEdit,
}: AssetDetailSidebarProps) {
  const uploader = currentAsset.uploader;

  return (
    <div className="w-[400px] lg:w-[480px] bg-background border-l border-border flex flex-col h-full overflow-hidden shrink-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="p-6 space-y-5 pb-20">
          {/* 1. Title + 3-dot Menu Row */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground leading-tight flex-1">
              {currentAsset.title}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[110]">
                {canEdit && (
                  <DropdownMenuItem onClick={onEditClick}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Asset
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 2. Author Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href={`/u/${uploader?.username}`}>
                <Avatar className="h-10 w-10 border border-border hover:opacity-80 transition-opacity">
                  <AvatarImage src={uploader?.avatar_url} />
                  <AvatarFallback>
                    {uploader?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <Link
                  href={`/u/${uploader?.username}`}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {uploader?.display_name || "Unknown User"}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(currentAsset.created_at)}
                </span>
              </div>
            </div>
            {!isOwnPost && (
              <Button
                variant={isFollowing ? "secondary" : "default"}
                size="sm"
                onClick={onFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </Button>
            )}
          </div>

          {/* 3. Description */}
          {currentAsset.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentAsset.description}
            </p>
          )}

          {/* 4. Stream Badges */}
          {assetStreams.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {assetStreams.map((stream) => (
                <StreamBadge key={stream.id} stream={stream} clickable={true} />
              ))}
            </div>
          )}

          {/* 5. Engagement Row */}
          <div className="flex items-center gap-4 py-3 border-y border-border">
            <LikeButton
              isLiked={isLiked}
              likeCount={likeCount}
              onLike={onAssetLike}
              variant="ghost"
              size="default"
            />
            <button
              onClick={onScrollToComments}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <ViewersTooltip
              assetId={currentAsset.id}
              viewCount={viewCount}
              className="ml-auto"
            />
          </div>

          {/* 6. Comments Section */}
          <div ref={commentsSectionRef} id="comments-section" className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-foreground">
              Comments ({comments.length})
            </h3>
            <CommentList
              assetId={originalAssetId}
              comments={comments}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEditComment}
              onStartEdit={onStartEdit}
              onDelete={onDeleteComment}
              editingCommentId={editingCommentId}
              onCancelEdit={onCancelEdit}
              highlightedCommentId={highlightedCommentId}
            />
          </div>
        </div>
      </div>

      {/* Fixed Comment Input */}
      <div className="p-4 bg-background border-t border-border z-10 shrink-0">
        {replyingToId && replyingToUser && (
          <div className="flex items-center justify-between bg-muted/50 rounded-t-lg px-3 py-1.5 mb-2 text-xs border border-border">
            <span className="text-muted-foreground flex items-center gap-1">
              <Reply className="h-3 w-3" />
              Replying to{" "}
              <span className="font-medium text-foreground">
                @{replyingToUser.username || "unknown"}
              </span>
            </span>
            <button
              onClick={() => onReply(null)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <CommentInput
          currentUser={currentUser}
          onSubmit={onAddComment}
          isSubmitting={isSubmitting}
          placeholder={replyingToId ? "Write a reply..." : "Add a comment..."}
          autoFocus={!!replyingToId}
          onCancel={replyingToId ? () => onReply(null) : undefined}
          assetId={originalAssetId}
        />
      </div>
    </div>
  );
}
