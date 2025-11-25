"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import { X, Reply } from "lucide-react";
import { Asset } from "@/lib/mock-data/assets";
import { users } from "@/lib/mock-data/users";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IMAGE_SIZES } from "@/lib/constants";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MobileActionBar } from "./mobile-action-bar";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import { useAssetDetail } from "./use-asset-detail";

interface AssetDetailMobileProps {
  asset: Asset;
}

// Import at module scope for better performance
import { assets as rawAssets } from "@/lib/mock-data/assets";

export function AssetDetailMobile({ asset }: AssetDetailMobileProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  
  // Track the currently visible asset in the carousel
  const [currentCarouselIndex, setCurrentCarouselIndex] = React.useState<number>(-1);

  // Asset navigation logic (matching desktop) - memoized for performance
  const allAssets = React.useMemo(() => [
    ...rawAssets,
    ...rawAssets.map((a: Asset) => ({ ...a, id: a.id + '-copy-1' })),
    ...rawAssets.map((a: Asset) => ({ ...a, id: a.id + '-copy-2' })),
  ], []); // Empty deps - rawAssets is static

  const initialIndex = React.useMemo(() => 
    allAssets.findIndex((a: any) => a.id === asset.id),
    [allAssets, asset.id]
  );

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
    return asset; // Fallback to initial asset
  }, [currentCarouselIndex, allAssets, asset]);

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

  const uploader = React.useMemo(
    () => users.find(u => u.id === currentAsset.uploaderId),
    [currentAsset.uploaderId]
  );

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
      router.push(`/e/${newAsset.id}`);
    }
  }, [emblaApi, allAssets, currentAsset.id, router]);

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

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Close button - floating */}
      <Link 
        href="/home" 
        className="absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white backdrop-blur-md"
      >
        <X className="h-6 w-6" />
      </Link>
      
      {/* Embla Carousel - Full-screen image slider */}
      <div className="flex-1 relative w-full h-full bg-black overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {allAssets.map((carouselAsset: Asset, index: number) => (
            <div 
              key={`${carouselAsset.id}-${index}`} 
              className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center"
            >
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
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed bottom action bar */}
      <MobileActionBar
        likes={likeCount}
        hasLiked={isLiked}
        commentCount={comments.length}
        onLike={handleAssetLike}
        onCommentsTap={() => setSheetOpen(true)}
        onMoreTap={() => { /* TODO: Show more menu */ }}
      />
      
      {/* Bottom sheet with details - synced with current carousel asset */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Comments">
        <div className="flex flex-col h-full">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-4">
            {/* Header Info */}
            <div className="px-4 pt-2 pb-6 border-b border-zinc-900">
              <h1 className="text-xl font-bold text-white mb-4">{currentAsset.title}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-zinc-800">
                    <AvatarImage src={uploader?.avatarUrl} />
                    <AvatarFallback>{uploader?.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{uploader?.displayName}</span>
                    <span className="text-xs text-zinc-500">Added {new Date(currentAsset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="cosmos-secondary" size="sm">
                  Follow
                </Button>
              </div>
              
              {/* Colors */}
              {(currentAsset.colorPalette || currentAsset.dominantColor) && (
                <div className="mt-6 flex gap-2">
                  {(currentAsset.colorPalette || [currentAsset.dominantColor]).filter((c): c is string => !!c).map((color: string, i: number) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="p-4">
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
             />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

