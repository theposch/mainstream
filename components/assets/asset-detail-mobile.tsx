"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import { X, Reply, Heart, MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { getFigmaEmbedUrl, getLoomEmbedUrl, getProviderInfo, type EmbedProvider } from "@/lib/utils/embed-providers";
import { Badge } from "@/components/ui/badge";
import { useAssetView } from "@/lib/hooks/use-asset-view";
import { ViewersTooltip } from "./viewers-tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IMAGE_SIZES } from "@/lib/constants";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MobileActionBar } from "./mobile-action-bar";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import { useAssetDetail } from "./use-asset-detail";
import { MoreMenuSheet } from "./more-menu-sheet";
import { EditAssetDialog } from "./edit-asset-dialog";
import { StreamBadge } from "@/components/streams/stream-badge";
import { useUserFollow } from "@/lib/hooks/use-user-follow";
import { formatRelativeTime } from "@/lib/utils/time";
import { createClient } from "@/lib/supabase/client";
import type { Asset } from "@/lib/types/database";
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

interface AssetDetailMobileProps {
  asset: any;  // Asset from database
  /** All assets in the current view for swipe navigation */
  allAssets?: any[];
  /** Callback when modal should close (for overlay mode) */
  onClose?: () => void;
  /** Callback when navigating to another asset (for modal mode) */
  onNavigate?: (assetId: string) => void;
}

export function AssetDetailMobile({ asset, allAssets: allAssetsProp, onClose, onNavigate }: AssetDetailMobileProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedCommentId = searchParams.get('comment');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  
  // Local asset state for optimistic updates after editing
  const [localAsset, setLocalAsset] = React.useState(asset);
  
  // Track the currently visible asset in the carousel
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState<number>(-1);

  // Sync localAsset when asset prop changes
  React.useEffect(() => {
    setLocalAsset(asset);
  }, [asset]);
  
  // Use provided assets list for swipe navigation, fallback to just current asset
  const allAssets = React.useMemo(() => {
    if (allAssetsProp && allAssetsProp.length > 0) {
      return allAssetsProp;
    }
    return [localAsset];
  }, [allAssetsProp, localAsset]);

  // Find initial index based on current asset
  const initialIndex = React.useMemo(() => {
    const idx = allAssets.findIndex(a => a.id === asset.id);
    return idx >= 0 ? idx : 0;
  }, [allAssets, asset.id]);

  // Embla Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    skipSnaps: false,
    dragFree: false,
    startIndex: initialIndex >= 0 ? initialIndex : 0,
  });

  // Get the current asset being displayed
  const currentAsset = React.useMemo(() => {
    if (currentCarouselIndex >= 0 && currentCarouselIndex < allAssets.length) {
      return allAssets[currentCarouselIndex];
    }
    return localAsset; // Fallback to local asset
  }, [currentCarouselIndex, allAssets, localAsset]);

  // Use the current asset for all data
  const {
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
  } = useAssetDetail(currentAsset);

  // Get uploader from asset (already joined in server query)
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
  const [assetStreams, setAssetStreams] = React.useState<any[]>(currentAsset.streams || []);
  
  // Sync streams when asset prop changes
  React.useEffect(() => {
    setAssetStreams(currentAsset.streams || []);
  }, [currentAsset.streams]);

  // Initialize carousel index
  React.useEffect(() => {
    if (emblaApi && initialIndex >= 0) {
      setCurrentCarouselIndex(initialIndex);
    }
  }, [emblaApi, initialIndex]);

  // Preload adjacent images with cleanup
  React.useEffect(() => {
    if (currentCarouselIndex < 0) return;
    
    const prevAsset = allAssets[currentCarouselIndex - 1];
    const nextAsset = allAssets[currentCarouselIndex + 1];
    
    const images: HTMLImageElement[] = [];
    
    if (prevAsset?.url) {
      const img = new window.Image();
      img.src = prevAsset.url;
      images.push(img);
    }
    if (nextAsset?.url) {
      const img = new window.Image();
      img.src = nextAsset.url;
      images.push(img);
    }
    
    // Cleanup: abort loading if component unmounts or index changes
    return () => {
      images.forEach(img => {
        img.src = ''; // Cancel loading
      });
    };
  }, [currentCarouselIndex, allAssets]);

  // Memoized handler for carousel slide change
  const handleSlideChange = React.useCallback(() => {
    if (!emblaApi) return;
    
    const newIndex = emblaApi.selectedScrollSnap();
    const newAsset = allAssets[newIndex];
    
    // Update index first
    setCurrentCarouselIndex(newIndex);
    
    // Close bottom sheet when swiping to prevent confusion
    setSheetOpen(false);
    
    // Update URL to reflect current asset
    if (newAsset && newAsset.id !== currentAsset.id) {
      // Use onNavigate callback for modal mode, router.push for standalone mode
      if (onNavigate) {
        onNavigate(newAsset.id);
      } else {
        router.push(`/e/${newAsset.id}`);
      }
    }
  }, [emblaApi, allAssets, currentAsset.id, router, onNavigate]);

  // Handle carousel slide change
  React.useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', handleSlideChange);
    return () => {
      emblaApi.off('select', handleSlideChange);
    };
  }, [emblaApi, handleSlideChange]);

  // Disable carousel when bottom sheet is open
  React.useEffect(() => {
    if (!emblaApi) return;
    
    if (sheetOpen) {
      emblaApi.reInit({ watchDrag: false });
    } else {
      emblaApi.reInit({ watchDrag: true });
    }
  }, [emblaApi, sheetOpen]);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${currentAsset.id}`, {
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
    const url = `${window.location.origin}/e/${currentAsset.id}`;
    navigator.clipboard.writeText(url);
    setMoreMenuOpen(false);
    // TODO: Show toast notification
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentAsset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentAsset.title || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMoreMenuOpen(false);
    } catch (error) {
      console.error('Error downloading asset:', error);
    }
  };

  const handleReport = () => {
    setMoreMenuOpen(false);
    // TODO: Implement report functionality
  };

  const handleDeleteClick = () => {
    setMoreMenuOpen(false);
    setShowDeleteDialog(true);
  };

  const handleEditClick = () => {
    setMoreMenuOpen(false);
    setShowEditDialog(true);
  };

  // Handle edit success - update local state optimistically
  const handleEditSuccess = React.useCallback((updatedAsset: Partial<Asset>) => {
    setLocalAsset((prev: Asset) => ({
      ...prev,
      title: updatedAsset.title ?? prev.title,
      description: updatedAsset.description ?? prev.description,
    }));
    // Also update streams if provided
    if (updatedAsset.streams) {
      setAssetStreams(updatedAsset.streams);
    }
  }, []);

  const canDelete = currentUser && currentUser.id === currentAsset.uploader_id;
  const canEdit = canDelete; // Same permission as delete

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Close button - floating */}
      {onClose ? (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white backdrop-blur-md"
        >
          <X className="h-6 w-6" />
        </button>
      ) : (
        <Link 
          href="/home" 
          className="absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white backdrop-blur-md"
        >
          <X className="h-6 w-6" />
        </Link>
      )}
      
      {/* Embla Carousel - Full-screen image/embed slider */}
      <div className="flex-1 relative w-full h-full bg-black overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {allAssets.map((carouselAsset: Asset, index: number) => (
            <div 
              key={`${carouselAsset.id}-${index}`} 
              className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center"
            >
              {/* Embed View (Figma, Loom, etc.) */}
              {carouselAsset.asset_type === 'embed' && carouselAsset.embed_url ? (
                <div className="relative w-full h-full p-4">
                  {carouselAsset.embed_provider === 'figma' ? (
                    <>
                      <iframe
                        src={getFigmaEmbedUrl(carouselAsset.embed_url)}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                      {/* Figma badge */}
                      <Badge 
                        asChild 
                        variant="secondary" 
                        className="absolute top-6 right-6 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80"
                      >
                        <a href={carouselAsset.embed_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          Figma
                        </a>
                      </Badge>
                    </>
                  ) : carouselAsset.embed_provider === 'loom' ? (
                    <>
                      <iframe
                        src={getLoomEmbedUrl(carouselAsset.embed_url) || ''}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                        allow="autoplay; fullscreen"
                      />
                      {/* Loom badge */}
                      <Badge 
                        asChild 
                        variant="secondary" 
                        className="absolute top-6 right-6 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80"
                      >
                        <a href={carouselAsset.embed_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          Loom
                        </a>
                      </Badge>
                    </>
                  ) : (
                    // Generic embed fallback
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      {(() => {
                        const providerInfo = getProviderInfo(carouselAsset.embed_provider as EmbedProvider);
                        return (
                          <>
                            <div className={`flex items-center justify-center w-20 h-20 rounded-2xl mb-4 ${providerInfo.bgColor}`}>
                              <span className="text-4xl">{providerInfo.icon}</span>
                            </div>
                            <p className="text-base font-medium text-zinc-400 mb-4">{providerInfo.name}</p>
                            <a
                              href={carouselAsset.embed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium"
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
              ) : carouselAsset.asset_type === 'video' || carouselAsset.mime_type === 'video/webm' ? (
                // Video View (WebM)
                <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center p-4">
                  <video
                    src={carouselAsset.url}
                    className="max-w-full max-h-full rounded-lg"
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </div>
              ) : (
                // Image View
                <div className="relative w-full h-full max-h-[80vh]">
                  <Image 
                    src={carouselAsset.url} 
                    alt={carouselAsset.title} 
                    fill
                    className="object-contain select-none"
                    sizes={IMAGE_SIZES.full}
                    priority={index === currentCarouselIndex}
                    draggable={false}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed bottom action bar */}
      <MobileActionBar
        likes={likeCount}
        hasLiked={isLiked}
        commentCount={comments.length}
        viewCount={viewCount}
        onLike={handleAssetLike}
        onCommentsTap={() => setSheetOpen(true)}
        onMoreTap={() => setMoreMenuOpen(true)}
      />
      
      {/* Bottom sheet with details - synced with current carousel asset */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Details">
        <div className="flex flex-col h-full">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-4">
            {/* Header Info */}
            <div className="px-4 pt-2 pb-4 border-b border-zinc-900 space-y-4">
              {/* Title */}
              <h1 className="text-xl font-bold text-white">{currentAsset.title}</h1>
              
              {/* Author Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link href={`/u/${uploader?.username}`}>
                    <Avatar className="h-10 w-10 border border-zinc-800 hover:opacity-80 transition-opacity">
                      <AvatarImage src={uploader?.avatar_url} />
                      <AvatarFallback>{uploader?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex flex-col">
                    <Link 
                      href={`/u/${uploader?.username}`}
                      className="text-sm font-medium text-white hover:underline"
                    >
                      {uploader?.display_name || 'Unknown User'}
                    </Link>
                    <span className="text-xs text-zinc-500">
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

              {/* Description */}
              {currentAsset.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {currentAsset.description}
                </p>
              )}

              {/* Stream Badges */}
              {assetStreams.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {assetStreams.map((stream) => (
                    <StreamBadge key={stream.id} stream={stream} clickable={true} />
                  ))}
                </div>
              )}

              {/* Engagement Row */}
              <div className="flex items-center gap-4 pt-2">
                <button 
                  onClick={handleAssetLike}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group"
                >
                  <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "group-hover:text-white"}`} />
                  <span className={`text-sm font-medium ${isLiked ? "text-red-500" : ""}`}>{likeCount}</span>
                </button>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{comments.length}</span>
                </div>
                <ViewersTooltip 
                  assetId={currentAsset.id} 
                  viewCount={viewCount} 
                  className="ml-auto"
                />
              </div>
            </div>

            {/* Comments List */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-4">
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

          {/* Sticky comment input at bottom of sheet */}
          <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-900 p-4 pb-[max(16px,env(safe-area-inset-bottom))] z-10 shrink-0">
             {replyingToId && (
               <div className="flex items-center justify-between bg-zinc-900 rounded-t-lg px-3 py-1.5 mb-2 text-xs border border-zinc-800">
                 <span className="text-zinc-400 flex items-center gap-1">
                   <Reply className="h-3 w-3" />
                   Replying to <span className="font-medium text-zinc-300">@{replyingToUser?.username || 'unknown'}</span>
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
                autoFocus={false}
                onCancel={replyingToId ? () => setReplyingToId(null) : undefined}
                assetId={currentAsset.id}
             />
          </div>
        </div>
      </BottomSheet>

      {/* More Menu Sheet */}
      <MoreMenuSheet
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        onShare={handleShare}
        onDownload={handleDownload}
        onReport={handleReport}
        onEdit={handleEditClick}
        canEdit={canEdit}
        onDelete={handleDeleteClick}
        canDelete={canDelete}
      />

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
        <AlertDialogContent>
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
