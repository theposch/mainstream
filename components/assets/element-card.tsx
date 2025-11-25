"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Bookmark } from "lucide-react";
import { Asset } from "@/lib/mock-data/assets";
// TODO: Replace with real user data from database/API
import { users } from "@/lib/mock-data/users";
import { getAssetStreamObjects } from "@/lib/mock-data/migration-helpers";
import { StreamBadge } from "@/components/streams/stream-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ElementCardProps {
  asset: Asset;
  className?: string;
}

export const ElementCard = React.memo(
  function ElementCard({ asset, className }: ElementCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  // TODO: Replace with real like state from database - check if current user has liked this asset
  const [isLiked, setIsLiked] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Ensure we have valid numbers for aspect ratio (prevent division by zero)
  const width = asset.width && asset.width > 0 ? asset.width : 800;
  const height = asset.height && asset.height > 0 ? asset.height : 600;
  const aspectRatio = (height / width) * 100;

  // Progressive loading: use thumbnailUrl first, then upgrade to mediumUrl or full url
  const thumbnailUrl = asset.thumbnailUrl || asset.url;
  const displayUrl = imageLoaded ? (asset.mediumUrl || asset.url) : thumbnailUrl;

  // TODO: Replace with API call to fetch user data
  // GET /api/users/:uploaderId
  const uploader = users.find(u => u.id === asset.uploaderId);

  // Get streams for this asset
  const assetStreams = React.useMemo(() => getAssetStreamObjects(asset), [asset]);
  const visibleStreams = assetStreams.slice(0, 3);
  const overflowCount = Math.max(0, assetStreams.length - 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("relative group break-inside-avoid w-full", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/e/${asset.id}`} className="block w-full">
        <div className="relative rounded-xl overflow-hidden bg-secondary cursor-zoom-in w-full">
          {/* Aspect Ratio Container */}
          <div 
            className="relative w-full"
            style={{ paddingBottom: `${aspectRatio}%` }}
          >
            <Image
              src={displayUrl}
              alt={asset.title}
              fill
              className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoadingComplete={() => setImageLoaded(true)}
            />
          </div>

          {/* Hover Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {/* Top Right: Save to Collection */}
            <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
              {/* TODO: Replace with real save to collection functionality
                  - Open dialog to select collection/project
                  - POST /api/projects/:projectId/assets with { assetId }
                  - Show success/error toast
                  - Update saved state
              */}
              <button className="p-2.5 bg-white/90 hover:bg-white backdrop-blur-md rounded-full text-black transition-all shadow-lg">
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2" onClick={(e) => e.preventDefault()}>
              {/* Streams - Show on hover */}
              {assetStreams.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {visibleStreams.map((stream) => (
                    <StreamBadge key={stream.id} stream={stream} className="text-xs" />
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
                    <AvatarImage src={uploader?.avatarUrl} />
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

                {/* Right: Like Button */}
                {/* TODO: Replace with real like functionality
                    - Check authentication state first
                    - POST /api/assets/:assetId/like or DELETE /api/assets/:assetId/like
                    - Update like count in UI
                    - Handle optimistic updates
                    - Show login prompt if not authenticated
                */}
                <button 
                  className={cn(
                    "p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg shrink-0",
                    isLiked 
                      ? "bg-red-500 text-white" 
                      : "bg-white/90 hover:bg-white text-black"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLiked(!isLiked);
                  }}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
  },
  // Custom comparison to make memo actually work
  (prevProps, nextProps) => {
    return prevProps.asset.id === nextProps.asset.id &&
           prevProps.className === nextProps.className;
  }
);
