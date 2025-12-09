"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Bookmark, Play, ExternalLink } from "lucide-react";
import { StreamBadge } from "@/components/streams/stream-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { useAssetPrefetch } from "@/lib/hooks/use-asset-prefetch";
import { getProviderInfo, type EmbedProvider } from "@/lib/utils/embed-providers";
import { LikeButton } from "@/components/ui/like-button";
import { Badge } from "@/components/ui/badge";

import { formatDistanceToNow } from "date-fns";

interface ElementCardProps {
  asset: Asset;
  className?: string;
  /** Layout mode: 'grid' (default) has overlay metadata, 'detailed' has metadata below */
  layout?: "grid" | "detailed";
  /** Callback when like status changes - receives assetId and new isLiked state */
  onLikeChange?: (assetId: string, isLiked: boolean) => void;
  /** Callback when card is clicked - for modal overlay mode */
  onClick?: (asset: Asset) => void;
}

export const ElementCard = React.memo(
  function ElementCard({ asset, className, layout = "grid", onLikeChange, onClick }: ElementCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  // Use pre-fetched like data from server
  const { isLiked, likeCount, toggleLike, loading } = useAssetLike(
    asset.id,
    asset.isLikedByCurrentUser ?? false,
    asset.likeCount ?? 0
  );

  // Prefetch hook for hover-based data loading AND full-res image preload
  const { onMouseEnter: prefetchOnEnter, onMouseLeave: prefetchOnLeave } = useAssetPrefetch(asset.id, asset.url);

  // Memoized callbacks for stable references - combine hover state with prefetch
  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
    prefetchOnEnter();
  }, [prefetchOnEnter]);
  
  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    prefetchOnLeave();
  }, [prefetchOnLeave]);
  const handleImageLoad = React.useCallback(() => setImageLoaded(true), []);
  
  // Handle card click - for modal overlay mode
  const handleCardClick = React.useCallback((e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(asset);
    }
  }, [onClick, asset]);
  
  const handleLikeClick = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent click from bubbling to parent Link/card
    const wasLiked = isLiked;
    const success = await toggleLike();
    // Only notify parent if toggle succeeded (prevents desynced state on API failure)
    if (success) {
      onLikeChange?.(asset.id, !wasLiked);
    }
  }, [toggleLike, isLiked, asset.id, onLikeChange]);

  // Ensure we have valid numbers for aspect ratio (prevent division by zero)
  const width = asset.width && asset.width > 0 ? asset.width : 800;
  const height = asset.height && asset.height > 0 ? asset.height : 600;
  const aspectRatio = (height / width) * 100;

  // Check if this is an animated GIF
  const isGif = asset.mime_type === 'image/gif';

  // Check if this is a video asset (WebM)
  const isVideo = asset.asset_type === 'video' || asset.mime_type === 'video/webm';

  // Check if this is an embed asset (Figma, YouTube, etc.)
  const isEmbed = asset.asset_type === 'embed';
  const embedProvider = isEmbed ? (asset.embed_provider as EmbedProvider) : null;
  const providerInfo = embedProvider ? getProviderInfo(embedProvider) : null;
  
  // Check if embed has a thumbnail (from oEmbed or frame-specific)
  const embedHasThumbnail = isEmbed && asset.thumbnail_url && !asset.thumbnail_url.includes('figma.com/file');

  // Calculate embed aspect ratio and determine if cropping is needed
  // Max height is 120% (5:6 ratio) - taller frames will be cropped from top
  const MAX_EMBED_RATIO = 120; // 5:6 aspect ratio max
  const MIN_EMBED_RATIO = 50;  // 2:1 wide minimum
  
  const getEmbedDisplayInfo = () => {
    if (!isEmbed) return { ratio: aspectRatio, needsCrop: false, actualRatio: aspectRatio };
    
    // If we have actual dimensions from Figma, use them
    if (asset.width && asset.height && asset.width > 0) {
      const actualRatio = (asset.height / asset.width) * 100;
      const clampedRatio = Math.min(Math.max(actualRatio, MIN_EMBED_RATIO), MAX_EMBED_RATIO);
      const needsCrop = actualRatio > MAX_EMBED_RATIO;
      
      return { ratio: clampedRatio, needsCrop, actualRatio };
    }
    
    // Default to 16:9 for embeds without dimensions
    return { ratio: 56.25, needsCrop: false, actualRatio: 56.25 };
  };
  
  const embedDisplayInfo = getEmbedDisplayInfo();
  const embedAspectRatio = embedDisplayInfo.ratio;
  const embedNeedsCrop = embedDisplayInfo.needsCrop;

  // Progressive loading: use thumbnailUrl first, then upgrade to mediumUrl or full url
  // For GIFs: thumbnail is static JPEG, medium/full are animated
  // On hover for GIFs: show animated version
  const thumbnailUrl = asset.thumbnail_url || asset.url;
  const animatedUrl = asset.medium_url || asset.url;
  
  // For GIFs: show animated on hover, static otherwise
  // For other images: normal progressive loading behavior
  const displayUrl = isGif
    ? (isHovered ? animatedUrl : thumbnailUrl)
    : (imageLoaded ? (asset.medium_url || asset.url) : thumbnailUrl);

  // Get uploader from the asset (already joined from database query)
  const uploader = asset.uploader;

  // Use pre-fetched streams from asset (prevents N+1 query)
  const streams = asset.streams || [];
  const visibleStreams = streams.slice(0, 3);
  const overflowCount = Math.max(0, streams.length - 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative group break-inside-avoid w-full",
        layout === 'detailed' && "flex flex-col gap-3 p-3 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-border/80 transition-colors",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/e/${asset.id}`} className="block w-full" onClick={handleCardClick}>
        <div className="relative rounded-xl overflow-hidden bg-secondary cursor-zoom-in w-full">
          {/* Aspect Ratio Container */}
          <div 
            className="relative w-full"
            style={{ paddingBottom: isEmbed ? `${embedAspectRatio}%` : `${aspectRatio}%` }}
          >
            {/* Video asset (WebM) - autoplay, loop, muted like GIFs */}
            {isVideo ? (
              <video
                src={asset.url}
                className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : isEmbed && embedHasThumbnail ? (
              /* Embed with thumbnail (from oEmbed or frame-specific) */
              <>
                <Image
                  src={asset.thumbnail_url!}
                  alt={asset.title}
                  fill
                  className={cn(
                    "absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105",
                    // For tall frames that need cropping: show top portion (hero area)
                    // For normal frames: contain the full image
                    embedNeedsCrop 
                      ? "object-cover object-top" 
                      : asset.width && asset.height 
                        ? "object-contain bg-zinc-900" 
                        : "object-cover"
                  )}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoad={handleImageLoad}
                />
              </>
            ) : isEmbed && providerInfo ? (
              // Embed placeholder (no thumbnail available)
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-lg",
                  providerInfo.bgColor
                )}>
                  <span className="text-3xl">{providerInfo.icon}</span>
                </div>
                <span className="text-sm font-medium text-zinc-400">{providerInfo.name}</span>
              </div>
            ) : isGif && isHovered ? (
              // Animated GIF on hover - use img tag to ensure animation plays
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={animatedUrl}
                alt={asset.title}
                className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={displayUrl}
                alt={asset.title}
                fill
                className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={handleImageLoad}
                unoptimized={isGif} // Don't optimize GIFs (preserves animation)
              />
            )}
          </div>

          {/* GIF Badge - Always visible for GIFs */}
          {isGif && (
            <div className={cn(
              "absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-200",
              isHovered 
                ? "bg-green-500 text-white" 
                : "bg-black/70 text-white backdrop-blur-sm"
            )}>
              {isHovered ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  GIF
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  GIF
                </>
              )}
            </div>
          )}

          {/* Embed Badge - Always visible for embeds */}
          {isEmbed && providerInfo && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              {providerInfo.name}
            </Badge>
          )}

          {/* Video Badge - Always visible for videos */}
          {isVideo && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
            >
              <Play className="h-3 w-3 fill-current" />
              VIDEO
            </Badge>
          )}

          {/* Hover Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {/* Top Right: Save to Collection */}
            <div className="absolute top-3 right-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {/* TODO: Replace with real save to collection functionality
                  - Open dialog to select collection/stream
                  - POST /api/streams/:streamId/assets with { assetId }
                  - Show success/error toast
                  - Update saved state
              */}
              <button className="p-2.5 bg-white/90 hover:bg-white backdrop-blur-md rounded-full text-black transition-all shadow-lg">
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Section */}
            {layout === 'grid' && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {/* Streams - Show on hover (clickable=false to avoid nested <a> tags) */}
              {streams.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {visibleStreams.map((stream) => (
                    <StreamBadge key={stream.id} stream={stream} clickable={false} className="text-xs" />
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-xs text-white/70 px-2 py-1 bg-white/10 backdrop-blur-md rounded-md">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              )}
              
              {/* User Info Row */}
              <div className="flex items-center justify-between gap-3">
              {/* Left: User Info */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8 border-2 border-white/20 shrink-0">
                  <AvatarImage src={uploader?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {uploader?.username?.substring(0, 2).toUpperCase() || 'UN'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate leading-tight">
                    {asset.title}
                  </span>
                  <span className="text-xs text-white/80 truncate">
                    @{uploader?.username || 'unknown'}
                  </span>
                </div>
              </div>

              {/* Right: Like Button with Real-time Updates */}
              <div className="flex items-center gap-2 shrink-0">
                <LikeButton
                  isLiked={isLiked}
                  likeCount={likeCount}
                  onLike={handleLikeClick}
                  isLoading={loading}
                  variant="solid"
                />
              </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </Link>

      {layout === 'detailed' && (
        <div className="flex flex-col gap-3 px-1">
           <div className="flex items-start justify-between gap-3">
             <Link href={`/e/${asset.id}`} onClick={handleCardClick} className="group/title min-w-0">
                <h3 className="font-semibold text-lg leading-tight group-hover/title:underline decoration-1 underline-offset-2 truncate">
                  {asset.title}
                </h3>
             </Link>
             <LikeButton
               isLiked={isLiked}
               likeCount={likeCount}
               onLike={handleLikeClick}
               isLoading={loading}
               variant="ghost"
               size="sm"
               className="shrink-0 -mr-1"
             />
           </div>
           
           {asset.description && (
             <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed -mt-1">
               {asset.description}
             </p>
           )}

           {streams.length > 0 && (
             <div className="flex flex-wrap gap-1.5">
               {streams.map(stream => (
                 <StreamBadge key={stream.id} stream={stream} className="bg-secondary/50 hover:bg-secondary text-xs px-2 py-0.5" />
               ))}
             </div>
           )}

           <div className="flex items-center gap-2 mt-1">
              <Link href={`/u/${uploader?.username}`}>
                <Avatar className="h-5 w-5 border border-border/50 shrink-0">
                  <AvatarImage src={uploader?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {uploader?.username?.substring(0, 2).toUpperCase() || 'UN'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link href={`/u/${uploader?.username}`} className="font-medium hover:text-foreground">
                  {uploader?.display_name || uploader?.username}
                </Link>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                </span>
              </div>
           </div>
        </div>
      )}
    </motion.div>
  );
  }
);
