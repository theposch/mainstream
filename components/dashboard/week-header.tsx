"use client";

import * as React from "react";
import { ContributorAvatars } from "./contributor-avatars";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";

type Contributor = Pick<User, "id" | "username" | "display_name" | "avatar_url">;

interface WeekHeaderProps {
  /** Display label: "This week", "Last week", or "Nov 25 - Dec 1" */
  label: string;
  /** Number of posts this week */
  postCount: number;
  /** Contributors who posted this week */
  contributors: Contributor[];
  className?: string;
}

/**
 * WeekHeader - Header for a week section in the feed
 * 
 * Shows post count, week label, and contributor avatars.
 * Example: "6 posts last week" with stacked avatars on the right.
 */
export function WeekHeader({
  label,
  postCount,
  contributors,
  className,
}: WeekHeaderProps) {
  // Format the label for display (lowercase for natural reading)
  const formattedLabel = label.toLowerCase();
  
  return (
    <div
      className={cn(
        "flex items-center justify-between py-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{postCount}</span>
          {" "}
          {postCount === 1 ? "post" : "posts"}
          {" "}
          {formattedLabel}
        </span>
      </div>

      <ContributorAvatars
        contributors={contributors}
        maxVisible={5}
        size="default"
      />
    </div>
  );
}

