"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StreamBadge } from "@/components/streams/stream-badge";
import { MapPin, Briefcase, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    job_title?: string;
    location?: string;
    followerCount?: number;
    recentAssets?: Array<{
      id: string;
      title: string;
      thumbnail_url?: string;
      url?: string;
    }>;
    streams?: Array<{
      id: string;
      name: string;
      is_private: boolean;
    }>;
    totalStreams?: number;
  };
  currentUserId?: string;
  onFollow?: (username: string, isFollowing: boolean, userId: string) => Promise<void>;
  isFollowing?: boolean;
}

export const UserCard = React.memo(function UserCard({
  user,
  currentUserId,
  onFollow,
  isFollowing = false,
}: UserCardProps) {
  const [following, setFollowing] = React.useState(isFollowing);
  const [loading, setLoading] = React.useState(false);
  const isOwnProfile = currentUserId === user.id;

  React.useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading || isOwnProfile || !onFollow) return;
    
    setLoading(true);
    // Optimistic update
    setFollowing(!following);
    
    try {
      await onFollow(user.username, following, user.id);
    } catch {
      // Rollback on error
      setFollowing(following);
    } finally {
      setLoading(false);
    }
  };

  const recentAssets = user.recentAssets || [];
  const streams = user.streams || [];
  const totalStreams = user.totalStreams || streams.length;
  const extraStreams = totalStreams > 4 ? totalStreams - 4 : 0;

  return (
    <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:shadow-lg transition-all duration-200">
      {/* Shots Grid - 5 columns on desktop, horizontal scroll on mobile */}
      <div className="relative">
        {recentAssets.length > 0 ? (
          <div className="flex md:grid md:grid-cols-5 gap-0.5 p-0.5 overflow-x-auto md:overflow-visible scrollbar-hide">
            {recentAssets.slice(0, 5).map((asset, index) => (
              <Link
                key={asset.id}
                href={`/e/${asset.id}`}
                className="relative aspect-[4/3] min-w-[120px] md:min-w-0 flex-shrink-0 md:flex-shrink overflow-hidden bg-muted group/shot"
              >
                <Image
                  src={asset.thumbnail_url || asset.url || "/placeholder.svg"}
                  alt={asset.title}
                  fill
                  className="object-cover transition-transform group-hover/shot:scale-105"
                  sizes="(max-width: 768px) 120px, (max-width: 1200px) 150px, 200px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/shot:bg-black/20 transition-colors" />
              </Link>
            ))}
            {/* Fill empty slots on desktop */}
            {Array.from({ length: Math.max(0, 5 - recentAssets.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="hidden md:block aspect-[4/3] bg-muted/30"
              />
            ))}
          </div>
        ) : (
          <div className="aspect-[5/1] bg-muted/20 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No public work yet</span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Link href={`/u/${user.username}`}>
            <Avatar className="h-12 w-12 rounded-full border border-border/50 transition-transform hover:scale-105">
              <AvatarImage src={user.avatar_url} alt={user.display_name} />
              <AvatarFallback className="bg-secondary text-sm">
                {user.display_name?.substring(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Name & Details */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/u/${user.username}`}
              className="block group/name"
            >
              <h3 className="font-semibold text-foreground truncate group-hover/name:text-primary transition-colors">
                {user.display_name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                @{user.username}
              </p>
            </Link>

            {/* Role & Location */}
            {(user.job_title || user.location) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                {user.job_title && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{user.job_title}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{user.location}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Follow Button */}
          {!isOwnProfile && onFollow && (
            <Button
              variant={following ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={loading}
              className={cn(
                "h-8 px-3 text-xs font-medium shrink-0",
                following && "hover:border-destructive hover:text-destructive"
              )}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : following ? (
                <>
                  <UserMinus className="h-3.5 w-3.5 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>

        {/* Stream Badges */}
        {streams.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {streams.slice(0, 4).map((stream) => (
              <StreamBadge
                key={stream.id}
                stream={stream}
                clickable
                className="text-[11px]"
              />
            ))}
            {extraStreams > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-secondary/30 text-muted-foreground">
                +{extraStreams} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

