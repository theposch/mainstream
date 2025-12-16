"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Stream } from "@/lib/types/database";
import { Lock, Hash, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStreamFollow } from "@/lib/hooks/use-stream-follow";
import { ContributorAvatars } from "@/components/dashboard/contributor-avatars";

interface StreamListItemProps {
  stream: Stream & {
    assetsCount?: number;
    recentPosts?: Array<{
      id: string;
      url: string;
      title: string;
    }>;
    contributors?: Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }>;
  };
}

export const StreamListItem = React.memo(function StreamListItem({ 
  stream 
}: StreamListItemProps) {
  const router = useRouter();
  const assetsCount = stream.assetsCount ?? 0;
  const { isFollowing, toggleFollow, loading } = useStreamFollow(stream.id);
  const prefetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasPrefetchedRef = React.useRef(false);

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFollow();
  };

  const handleMouseEnter = React.useCallback(() => {
    if (hasPrefetchedRef.current) return;
    
    // Debounce prefetch by 150ms to avoid unnecessary prefetches
    prefetchTimeoutRef.current = setTimeout(() => {
      router.prefetch(`/stream/${stream.name}`);
      hasPrefetchedRef.current = true;
    }, 150);
  }, [router, stream.name]);

  const handleMouseLeave = React.useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Link 
      href={`/stream/${stream.name}`}
      className="group block cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-row items-center gap-4 lg:gap-6 py-6 lg:py-8">
        {/* Left: Stream Info */}
        <div className="flex-shrink-0 min-w-0 flex-1 lg:flex-none lg:w-[320px] xl:w-[360px] space-y-1 lg:space-y-3">
          {/* Stream name with hash */}
          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className="text-muted-foreground text-base lg:text-xl">#</span>
            <h3 className="text-base lg:text-xl font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {stream.name}
            </h3>
            {stream.is_private && (
              <Lock className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {/* Post count */}
          <p className="text-xs lg:text-sm text-muted-foreground">
            {assetsCount} {assetsCount === 1 ? "post" : "posts"}
          </p>

          {/* Description - hidden on mobile */}
          {stream.description && (
            <p className="hidden lg:block text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {stream.description}
            </p>
          )}

          {/* Contributors - hidden on mobile */}
          {stream.contributors && stream.contributors.length > 0 && (
            <div 
              className="hidden lg:block pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ContributorAvatars 
                contributors={stream.contributors} 
                size="sm" 
                maxVisible={4}
              />
            </div>
          )}

          {/* Follow button */}
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowClick}
            disabled={loading}
            className="gap-1 lg:gap-1.5 mt-1 lg:mt-2 h-7 lg:h-9 text-xs lg:text-sm px-2 lg:px-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </div>

        {/* Right: Preview Images */}
        <div className="flex-shrink-0 lg:flex-1 lg:min-w-0">
          {stream.recentPosts && stream.recentPosts.length > 0 ? (
            <div className="flex gap-2 lg:gap-3 lg:justify-end">
              {stream.recentPosts.slice(0, 4).map((post, index) => (
                <div 
                  key={post.id} 
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-[160px] lg:h-auto xl:w-[180px] lg:aspect-[4/3] rounded-lg overflow-hidden bg-muted flex-shrink-0 ${index >= 2 ? 'hidden lg:block' : ''}`}
                >
                  <Image
                    src={post.url}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 180px"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex lg:justify-end">
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-[160px] xl:w-[180px] lg:h-auto lg:aspect-[4/3] rounded-lg bg-muted/30">
                <Hash className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/30" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

