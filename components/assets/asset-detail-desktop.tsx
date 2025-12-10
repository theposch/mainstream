"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
// Removed framer-motion for instant modal opening - no animation delay
import { createClient } from "@/lib/supabase/client";
import { useAssetComments } from "@/lib/hooks/use-asset-comments";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { useAssetView } from "@/lib/hooks/use-asset-view";
import { useUserFollow } from "@/lib/hooks/use-user-follow";
import { ViewersTooltip } from "./viewers-tooltip";
import { StreamBadge } from "@/components/streams/stream-badge";
import { LikeButton } from "@/components/ui/like-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KEYS } from "@/lib/constants";
import { X, Heart, MessageCircle, Share2, Download, MoreHorizontal, Reply, Trash2, Loader2, Pencil, ExternalLink } from "lucide-react";
import { getFigmaEmbedUrl, getLoomEmbedUrl, getProviderInfo, type EmbedProvider } from "@/lib/utils/embed-providers";
import { Badge } from "@/components/ui/badge";
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
 * Shows thumbnail/medium immediately (cached from feed), then upgrades to full res.
 * 
 * Pattern: Same as Pinterest - display low-res immediately, upgrade when high-res ready.
 * The thumbnail is already in browser cache from the feed, so it appears instantly.
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
  // Track which image we're currently showing
  // Key: reset to thumbnail when fullSrc changes (navigating to different asset)
  const [currentSrc, setCurrentSrc] = React.useState(thumbnailSrc);
  
  // Reset to thumbnail when asset changes
  React.useEffect(() => {
    // If same image, just show it
    if (thumbnailSrc === fullSrc) {
      setCurrentSrc(fullSrc);
      return;
    }
    
    // Show thumbnail immediately (should be cached from feed)
    setCurrentSrc(thumbnailSrc);
    
    // Load full-res in background
    const img = new window.Image();
    let cancelled = false;
    
    img.onload = () => {
      if (!cancelled) {
        // Use rAF to batch with next paint
        requestAnimationFrame(() => setCurrentSrc(fullSrc));
      }
    };
    img.src = fullSrc;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [fullSrc, thumbnailSrc]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, calc(100vw - 480px)"
      priority
    />
  );
}

import type { Asset, User } from "@/lib/types/database";

interface AssetDetailDesktopProps {
  asset: Asset;
  /** Previous asset for arrow key navigation */
  previousAsset?: Asset | null;
  /** Next asset for arrow key navigation */
  nextAsset?: Asset | null;
  /** Callback when modal should close (for overlay mode) */
  onClose?: () => void;
  /** Callback when navigating to another asset (for modal mode) */
  onNavigate?: (assetId: string) => void;
}

export function AssetDetailDesktop({ asset, previousAsset = null, nextAsset = null, onClose, onNavigate }: AssetDetailDesktopProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedCommentId = searchParams.get('comment');
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
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  
  // Local asset state for optimistic updates
  const [currentAsset, setCurrentAsset] = React.useState<Asset>(asset);
  
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
  
  // View count state - initialized from asset, updated when view is recorded
  const [viewCount, setViewCount] = React.useState(currentAsset.view_count || 0);
  
  // Sync view count when asset changes (e.g., navigating between assets)
  React.useEffect(() => {
    setViewCount(currentAsset.view_count || 0);
  }, [currentAsset.id, currentAsset.view_count]);
  
  // Track view after 2 seconds (excludes owner views)
  // Callback updates the displayed count in real-time
  useAssetView(currentAsset.id, !isOwnPost, (newCount) => {
    setViewCount(newCount);
  });
  
  // Get streams from asset (already joined in server query or passed from feed)
  // Use local state to allow optimistic updates from edit dialog
  const [assetStreams, setAssetStreams] = React.useState(asset.streams || []);
  
  // Sync streams when asset prop changes
  React.useEffect(() => {
    setAssetStreams(asset.streams || []);
  }, [asset.streams]);

  // Navigation between assets (passed from parent)
  
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
            // Use onNavigate callback for modal mode, router.push for standalone mode
            if (onNavigate) {
              onNavigate(previousAsset.id);
            } else {
              router.push(`/e/${previousAsset.id}`);
            }
          }
          break;
        case KEYS.arrowRight:
          if (nextAsset) {
            e.preventDefault();
            // Use onNavigate callback for modal mode, router.push for standalone mode
            if (onNavigate) {
              onNavigate(nextAsset.id);
            } else {
              router.push(`/e/${nextAsset.id}`);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [router, previousAsset, nextAsset, onClose, onNavigate]);

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
  const handleEditSuccess = React.useCallback((updatedAsset: Partial<Asset>) => {
    setCurrentAsset((prev) => ({
      ...prev,
      title: updatedAsset.title ?? prev.title,
      description: updatedAsset.description ?? prev.description,
    }));
    // Also update streams
    if (updatedAsset.streams) {
      setAssetStreams(updatedAsset.streams);
    }
  }, []);

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[100] bg-background flex flex-row overflow-hidden"
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
      <div className="flex-1 relative bg-muted/30 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
          {/* Embed View (Figma, etc.) */}
          {currentAsset.asset_type === 'embed' && currentAsset.embed_url ? (
            <div className="relative w-full h-full">
              {currentAsset.embed_provider === 'figma' ? (
                <>
                  <iframe
                    src={getFigmaEmbedUrl(currentAsset.embed_url)}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                  {/* Figma badge */}
                  <Badge 
                    asChild 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80 cursor-pointer"
                  >
                    <a href={currentAsset.embed_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      Figma
                    </a>
                  </Badge>
                </>
              ) : currentAsset.embed_provider === 'loom' ? (
                <>
                  <iframe
                    src={getLoomEmbedUrl(currentAsset.embed_url) || ''}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                  />
                  {/* Loom badge */}
                  <Badge 
                    asChild 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80 cursor-pointer"
                  >
                    <a href={currentAsset.embed_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      Loom
                    </a>
                  </Badge>
                </>
              ) : (
                // Generic embed fallback
                <div className="flex flex-col items-center justify-center w-full h-full">
                  {(() => {
                    const providerInfo = getProviderInfo(currentAsset.embed_provider as EmbedProvider);
                    return (
                      <>
                        <div className={`flex items-center justify-center w-24 h-24 rounded-2xl mb-4 ${providerInfo.bgColor}`}>
                          <span className="text-5xl">{providerInfo.icon}</span>
                        </div>
                        <p className="text-lg font-medium text-muted-foreground mb-4">{providerInfo.name} Embed</p>
                        <a
                          href={currentAsset.embed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Link
                        </a>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : currentAsset.asset_type === 'video' || currentAsset.mime_type === 'video/webm' ? (
            // Video View (WebM)
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={currentAsset.url}
                className="max-w-full max-h-full rounded-lg"
                controls
                autoPlay
                loop
                muted
                playsInline
              />
              {/* Video badge */}
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
              >
                VIDEO
              </Badge>
            </div>
          ) : (
            // Image View
            <div className="relative w-full h-full">
              {/* Progressive loading: show medium_url immediately (already cached from feed), 
                  then upgrade to full url when it loads */}
              <ProgressiveImage
                thumbnailSrc={asset.medium_url || asset.thumbnail_url || asset.url}
                fullSrc={asset.url}
                alt={asset.title}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Sidebar Info */}
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
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
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
                      className="text-sm font-medium text-foreground hover:underline"
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
                  onLike={handleAssetLike}
                  variant="ghost"
                  size="default"
                />
                
                <button 
                  onClick={scrollToComments}
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
                  comments={comments}
                  currentUser={currentUser}
                  onReply={setReplyingToId}
                  onEdit={handleEditComment}
                  onStartEdit={setEditingCommentId}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  editingCommentId={editingCommentId}
                  onCancelEdit={() => setEditingCommentId(null)}
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
                 Replying to <span className="font-medium text-foreground">@{replyingToUser.username || 'unknown'}</span>
               </span>
               <button 
                 onClick={() => setReplyingToId(null)}
                 className="text-muted-foreground hover:text-foreground p-0.5"
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
              assetId={asset.id}
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
