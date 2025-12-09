"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";

type Contributor = Pick<User, "id" | "username" | "display_name" | "avatar_url">;

interface ContributorAvatarsProps {
  contributors: Contributor[];
  /** Maximum avatars to show before "+X" badge */
  maxVisible?: number;
  /** Size of avatars */
  size?: "sm" | "default" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  default: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const overlapClasses = {
  sm: "-ml-2",
  default: "-ml-2.5",
  lg: "-ml-3",
};

/**
 * ContributorAvatars - Stacked avatar group with tooltip and profile links
 * 
 * Shows up to `maxVisible` avatars with a "+X" badge for overflow.
 * Each avatar has a tooltip showing the contributor's name and links to their profile.
 */
export function ContributorAvatars({
  contributors,
  maxVisible = 5,
  size = "default",
  className,
}: ContributorAvatarsProps) {
  if (!contributors || contributors.length === 0) {
    return null;
  }

  const visibleContributors = contributors.slice(0, maxVisible);
  const remainingCount = contributors.length - maxVisible;
  const hasMore = remainingCount > 0;

  // Get initials for fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {visibleContributors.map((contributor, index) => (
        <Tooltip key={contributor.id}>
          <TooltipTrigger asChild>
            <Link
              href={`/u/${contributor.username}`}
              className={cn(
                "relative rounded-full ring-2 ring-background transition-transform hover:z-10 hover:scale-110 cursor-pointer",
                index > 0 && overlapClasses[size]
              )}
              style={{ zIndex: visibleContributors.length - index }}
            >
              <Avatar className={sizeClasses[size]}>
                <AvatarImage
                  src={contributor.avatar_url}
                  alt={contributor.display_name}
                />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitials(contributor.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {contributor.display_name}
          </TooltipContent>
        </Tooltip>
      ))}

      {hasMore && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background cursor-default",
                sizeClasses[size],
                overlapClasses[size]
              )}
              style={{ zIndex: 0 }}
            >
              +{remainingCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {remainingCount} more contributor{remainingCount !== 1 ? "s" : ""}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

