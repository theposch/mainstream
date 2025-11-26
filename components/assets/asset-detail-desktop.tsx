"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Asset } from "@/lib/mock-data/assets";
import { users } from "@/lib/mock-data/users";
import { teams } from "@/lib/mock-data/teams";
import { getAssetStreamObjects } from "@/lib/mock-data/migration-helpers";
import { StreamBadge } from "@/components/streams/stream-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KEYS, ANIMATION_DURATION, ANIMATION_EASING, IMAGE_SIZES } from "@/lib/constants";
import { X, Heart, MessageCircle, Share2, Download, MoreHorizontal, ArrowLeft, ChevronRight, Reply } from "lucide-react";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import { useAssetDetail } from "./use-asset-detail";

interface AssetDetailDesktopProps {
  asset: Asset;
}

export function AssetDetailDesktop({ asset }: AssetDetailDesktopProps) {
  const router = useRouter();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const commentsSectionRef = React.useRef<HTMLDivElement>(null);
  
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
  } = useAssetDetail(asset);
  
  // Data fetching logic from original component
  const uploader = users.find(u => u.id === asset.uploaderId);
  
  // Get streams for this asset (many-to-many relationship)
  const assetStreams = React.useMemo(() => getAssetStreamObjects(asset), [asset]);
  const visibleStreams = assetStreams.slice(0, 3);
  const overflowCount = Math.max(0, assetStreams.length - 3);

  // Recreate full asset list logic
  // TODO: This should probably move up or to context eventually
  const assets = React.useMemo(() => [], []); // Placeholder to fix TS error, logic needs to be consistent with original
  // Original logic was:
  // const allAssets = React.useMemo(() => [
  //   ...assets,
  //   ...assets.map(a => ({ ...a, id: a.id + '-copy-1' })),
  //   ...assets.map(a => ({ ...a, id: a.id + '-copy-2' })),
  // ], []);
  // Since we can't easily recreate the context here without prop drilling or context, 
  // we will simplify navigation for now or rely on the parent page handling it? 
  // Actually, let's just copy the logic for now to maintain parity.
  
  // Re-import assets for the navigation logic
  const { assets: rawAssets } = require("@/lib/mock-data/assets");
  const allAssets = React.useMemo(() => [
    ...rawAssets,
    ...rawAssets.map((a: any) => ({ ...a, id: a.id + '-copy-1' })),
    ...rawAssets.map((a: any) => ({ ...a, id: a.id + '-copy-2' })),
  ], [rawAssets]);

  const currentIndex = React.useMemo(() => 
    allAssets.findIndex((a: any) => a.id === asset.id),
    [allAssets, asset.id]
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allAssets.length - 1;
  const previousAsset = hasPrevious ? allAssets[currentIndex - 1] : null;
  const nextAsset = hasNext ? allAssets[currentIndex + 1] : null;

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        if (e.key === KEYS.escape) return;
        if (e.key === KEYS.arrowLeft || e.key === KEYS.arrowRight) return;
      }

      switch(e.key) {
        case KEYS.escape:
          router.push('/home');
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
  }, [router, previousAsset, nextAsset]);

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
      <Link 
        href="/home" 
        className="absolute top-4 left-4 z-50 p-2 bg-background/50 hover:bg-accent rounded-full text-foreground transition-colors backdrop-blur-md"
        aria-label="Close asset detail"
        title="Close (ESC)"
      >
        <X className="h-6 w-6" aria-hidden="true" />
      </Link>

      {/* Left: Media View */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={asset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.fast, ease: ANIMATION_EASING.easeInOut }}
              className="relative w-full h-full"
            >
              <Image
                src={asset.url}
                alt={asset.title}
                fill
                className="object-contain"
                sizes={IMAGE_SIZES.full}
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Sidebar Info */}
      <div className="w-[400px] lg:w-[480px] bg-black border-l border-zinc-900 flex flex-col h-full overflow-hidden shrink-0">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={asset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.fast, ease: ANIMATION_EASING.easeInOut }}
              className="p-6 space-y-8 pb-20"
            >
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                      <Button variant="cosmos-secondary" size="icon-lg">
                          <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="cosmos-secondary" size="icon-lg">
                          <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="cosmos-secondary" size="icon-lg">
                          <MoreHorizontal className="h-4 w-4" />
                      </Button>
                  </div>
                  <Button variant="cosmos" size="default">
                      Save
                  </Button>
              </div>

              {/* Stream Badges */}
              {assetStreams.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap -mt-4">
                  {visibleStreams.map((stream) => (
                    <StreamBadge key={stream.id} stream={stream} clickable={true} />
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-xs text-white/70 px-2 py-1 bg-white/10 backdrop-blur-md rounded-md">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              )}

              {/* Title & Uploader */}
              <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white leading-tight">{asset.title}</h1>
                  
                  <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={uploader?.avatarUrl} />
                          <AvatarFallback>{uploader?.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{uploader?.displayName || 'Unknown User'}</span>
                          <span className="text-xs text-muted-foreground">Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Button variant="cosmos-secondary" size="sm" className="ml-auto">
                          Follow
                      </Button>
                  </div>
              </div>

              {/* Interactions */}
              <div className="flex gap-6 border-y border-zinc-900 py-4">
                  <button 
                    onClick={handleAssetLike}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                  >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "group-hover:text-white"}`} />
                      <span className={`text-sm font-medium ${isLiked ? "text-red-500" : ""}`}>{likeCount}</span>
                  </button>
                  <button 
                    onClick={scrollToComments}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                      </span>
                  </button>
              </div>

              {/* Color Palette */}
              {(asset.colorPalette || asset.dominantColor) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Colors</h3>
                  <div className="flex gap-2 flex-wrap">
                    {(asset.colorPalette || [asset.dominantColor]).map((color, i) => (
                      <button
                        key={i}
                        className="group relative h-10 w-10 rounded-full border border-white/10 cursor-pointer hover:scale-110 transition-all duration-200 hover:shadow-lg"
                        style={{ backgroundColor: color }}
                        title={color}
                        aria-label={`Color ${color}`}
                        onClick={() => {
                          navigator.clipboard.writeText(color || '');
                        }}
                      >
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {color}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

               {/* Streams */}
               {assetStreams.length > 0 && (
               <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Streams</h3>
                  <div className="flex flex-wrap gap-2">
                      {assetStreams.map((stream) => (
                        <StreamBadge key={stream.id} stream={stream} clickable={true} className="text-sm" />
                      ))}
                       </div>
                  </div>
               )}

              {/* Comments List */}
              <div ref={commentsSectionRef} id="comments-section" className="space-y-6 pt-2">
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-6">
                     <h3 className="text-sm font-semibold text-white">Comments ({comments.length})</h3>
                  </div>
                  
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Comment Input */}
        <div className="p-4 bg-black border-t border-zinc-900 z-10 shrink-0">
           {replyingToId && (
             <div className="flex items-center justify-between bg-zinc-900/50 rounded-t-lg px-3 py-1.5 mb-2 text-xs border border-zinc-800">
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
              autoFocus={!!replyingToId}
              onCancel={replyingToId ? () => setReplyingToId(null) : undefined}
           />
        </div>
      </div>

    </div>
  );
}

