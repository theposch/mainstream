"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Removed framer-motion for instant modal opening - no animation delay
import { createClient } from "@/lib/supabase/client";
import { useAssetComments } from "@/lib/hooks/use-asset-comments";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { useUserFollow } from "@/lib/hooks/use-user-follow";
import { StreamBadge } from "@/components/streams/stream-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KEYS, IMAGE_SIZES } from "@/lib/constants";
import { X, Heart, MessageCircle, Share2, Download, MoreHorizontal, Reply, Trash2, Eye, Loader2, Pencil } from "lucide-react";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import { EditAssetDialog } from "./edit-asset-dialog";
import { formatRelativeTime } from "@/lib/utils/time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Progressive Image Component
 * Shows thumbnail/medium immediately (cached from feed), then upgrades to full res
 */
function ProgressiveImage({ 
  thumbnailSrc, 
  fullSrc, 
  alt 
}: { 
  thumbnailSrc: string; 
  fullSrc: string; 
  alt: string;
}) {
  const [showFull, setShowFull] = React.useState(false);
  const loadingRef = React.useRef(false);

  // Start loading full image immediately
  React.useEffect(() => {
    if (thumbnailSrc === fullSrc) {
      setShowFull(true);
      return;
    }

    // Prevent double-load from StrictMode
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    const img = new window.Image();
    img.onload = () => {
      requestAnimationFrame(() => setShowFull(true));
    };
    img.src = fullSrc;

    return () => {
      img.onload = null;
      loadingRef.current = false;
    };
  }, [fullSrc, thumbnailSrc]);

  return (
    <Image
      src={showFull ? fullSrc : thumbnailSrc}
      alt={alt}
      fill
      className="object-contain"
      sizes={IMAGE_SIZES.full}
      priority
    />
  );
}

interface AssetDetailDesktopProps {
  asset: any; // Asset from database (snake_case)
  /** Callback when modal should close (for overlay mode) */
  onClose?: () => void;
}

export function AssetDetailDesktop({ asset, onClose }: AssetDetailDesktopProps) {
  const router = useRouter();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const commentsSectionRef = React.useRef<HTMLDivElement>(null);
  
  // Use real hooks for comments and likes (pass server-fetched like data)
  const { comments, addComment, updateComment, deleteComment, loading: commentsLoading } = useAssetComments(asset.id);
  const { isLiked, likeCount, toggleLike } = useAssetLike(
    asset.id,
    asset.isLikedByCurrentUser ?? false,
    asset.likeCount ?? 0
  );
  
  // Local UI state for comment interactions
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  
  // Local asset state for optimistic updates
  const [currentAsset, setCurrentAsset] = React.useState(asset);
  
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
  
  // Sync currentAsset when asset prop changes (e.g., navigation)
  React.useEffect(() => {
    setCurrentAsset(asset);
  }, [asset]);
  
  // Get uploader from asset object (already joined in server query)
  const uploader = currentAsset.uploader;
  
  // Use follow hook for the uploader
  const { isFollowing, toggleFollow, loading: followLoading } = useUserFollow(uploader?.username || '');
  
  // Check if current user is viewing their own post
  const isOwnPost = currentUser?.id === currentAsset.uploader_id;
  
  // TODO: Implement view tracking - add asset_views table and API
  // Future migration: scripts/migrations/005_asset_views.sql
  // CREATE TABLE asset_views (
  //   asset_id UUID REFERENCES assets(id),
  //   user_id UUID REFERENCES users(id),
  //   viewed_at TIMESTAMP DEFAULT NOW(),
  //   PRIMARY KEY (asset_id, user_id)
  // );
  const viewCount = 11; // Placeholder until backend implemented
  
  // Get streams from asset (already joined in server query or passed from feed)
  // Use local state to allow optimistic updates from edit dialog
  const [assetStreams, setAssetStreams] = React.useState<any[]>(asset.streams || []);
  
  // Sync streams when asset prop changes
  React.useEffect(() => {
    setAssetStreams(asset.streams || []);
  }, [asset.streams]);

  // Navigation between assets (simplified for now - can be enhanced with context)
  const previousAsset: any = null;
  const nextAsset: any = null;
  
  // Comment interaction handlers
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

  const handleLikeComment = React.useCallback((_commentId: string) => {
    // Comment likes are handled by useCommentLike hook in CommentItem component
  }, []);

  const handleAssetLike = React.useCallback(async () => {
    await toggleLike();
  }, [toggleLike]);

  const replyingToUser = React.useMemo(() => {
    if (!replyingToId) return null;
    const comment = comments.find(c => c.id === replyingToId);
    return comment?.user || null;
  }, [replyingToId, comments]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        if (e.key === KEYS.escape) return;
        if (e.key === KEYS.arrowLeft || e.key === KEYS.arrowRight) return;
      }

      switch(e.key) {
        case KEYS.escape:
          if (onClose) {
            onClose();
          } else {
            router.push('/home');
          }
          break;
        case KEYS.arrowLeft:
          if (previousAsset) {
            e.preventDefault();
            router.push(`/e/${previousAsset.id}`);
          }
          break;
        case KEYS.arrowRight:
          if (nextAsset) {
            e.preventDefault();
            router.push(`/e/${nextAsset.id}`);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [router, previousAsset, nextAsset, onClose]);

  // Preload adjacent images
  React.useEffect(() => {
    if (previousAsset?.url) {
      const img = new window.Image();
      img.src = previousAsset.url;
    }
    if (nextAsset?.url) {
      const img = new window.Image();
      img.src = nextAsset.url;
    }
  }, [previousAsset, nextAsset]);

  // Focus management
  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== KEYS.tab || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousFocus?.focus();
    };
  }, []);

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete asset');
      }

      // Success - close modal or redirect to home
      if (onClose) {
        onClose();
      } else {
        router.push('/home');
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete asset');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/e/${asset.id}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.title || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading asset:', error);
    }
  };

  const canDelete = currentUser && currentUser.id === currentAsset.uploader_id;
  const canEdit = canDelete; // Same permission as delete
  
  // Handle edit success - update local state optimistically
  const handleEditSuccess = React.useCallback((updatedAsset: any) => {
    setCurrentAsset((prev: any) => ({
      ...prev,
      title: updatedAsset.title,
      description: updatedAsset.description,
    }));
    // Also update streams
    if (updatedAsset.streams) {
      setAssetStreams(updatedAsset.streams);
    }
  }, []);

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[100] bg-black flex flex-row overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Asset detail view"
      tabIndex={-1}
    >
      {/* Close Button */}
      {onClose ? (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 p-2 bg-background/50 hover:bg-accent rounded-full text-foreground transition-colors backdrop-blur-md"
          aria-label="Close asset detail"
          title="Close (ESC)"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      ) : (
        <Link 
          href="/home" 
          className="absolute top-4 left-4 z-50 p-2 bg-background/50 hover:bg-accent rounded-full text-foreground transition-colors backdrop-blur-md"
          aria-label="Close asset detail"
          title="Close (ESC)"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </Link>
      )}

      {/* Left: Media View */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Progressive loading: show medium_url immediately (already cached from feed), 
                then upgrade to full url when it loads */}
            <ProgressiveImage
              thumbnailSrc={asset.medium_url || asset.thumbnail_url || asset.url}
              fullSrc={asset.url}
              alt={asset.title}
            />
          </div>
        </div>
      </div>

      {/* Right: Sidebar Info */}
      <div className="w-[400px] lg:w-[480px] bg-black border-l border-zinc-900 flex flex-col h-full overflow-hidden shrink-0">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-6 space-y-5 pb-20">
              {/* 1. Title + 3-dot Menu Row */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-white leading-tight flex-1">
                  {currentAsset.title}
                </h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400 hover:text-white">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[110]">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setShowDeleteDialog(true)}
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
                      <AvatarFallback>{uploader?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex flex-col">
                    <Link 
                      href={`/u/${uploader?.username}`}
                      className="text-sm font-medium text-white hover:underline"
                    >
                      {uploader?.display_name || 'Unknown User'}
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
                    onClick={toggleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </Button>
                )}
              </div>

              {/* 3. Description (conditional) */}
              {currentAsset.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">
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
              <div className="flex items-center gap-4 py-3 border-y border-zinc-900">
                <button 
                  onClick={handleAssetLike}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group"
                >
                  <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "group-hover:text-white"}`} />
                  <span className={`text-sm font-medium ${isLiked ? "text-red-500" : ""}`}>{likeCount}</span>
                </button>
                <button 
                  onClick={scrollToComments}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <span className="ml-auto text-xs text-zinc-500 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Seen by {viewCount} people
                </span>
              </div>

              {/* 6. Comments Section */}
              <div ref={commentsSectionRef} id="comments-section" className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-white">
                  Comments ({comments.length})
                </h3>
                
                <CommentList 
                  comments={comments}
                  currentUser={currentUser}
                  onReply={setReplyingToId}
                  onEdit={handleEditComment}
                  onStartEdit={setEditingCommentId}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  editingCommentId={editingCommentId}
                  onCancelEdit={() => setEditingCommentId(null)}
                />
              </div>
            </div>
        </div>

        {/* Fixed Comment Input */}
        <div className="p-4 bg-black border-t border-zinc-900 z-10 shrink-0">
           {replyingToId && replyingToUser && (
             <div className="flex items-center justify-between bg-zinc-900/50 rounded-t-lg px-3 py-1.5 mb-2 text-xs border border-zinc-800">
               <span className="text-zinc-400 flex items-center gap-1">
                 <Reply className="h-3 w-3" />
                 Replying to <span className="font-medium text-zinc-300">@{replyingToUser.username || 'unknown'}</span>
               </span>
               <button 
                 onClick={() => setReplyingToId(null)}
                 className="text-zinc-500 hover:text-white p-0.5"
               >
                 <X className="h-3 w-3" />
               </button>
             </div>
           )}
           <CommentInput 
              currentUser={currentUser}
              onSubmit={handleAddComment}
              isSubmitting={isSubmitting}
              placeholder={replyingToId ? "Write a reply..." : "Add a comment..."}
              autoFocus={!!replyingToId}
              onCancel={replyingToId ? () => setReplyingToId(null) : undefined}
           />
        </div>
      </div>

      {/* Edit Asset Dialog */}
      <EditAssetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        asset={currentAsset}
        currentStreams={assetStreams}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the asset and all associated comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
