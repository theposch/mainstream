import * as React from "react";
import { format } from "date-fns";
import Image from "next/image";
import { BlockRenderer } from "./block-renderer";
import type { DropBlock, User } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface DropBlocksViewProps {
  title: string;
  description?: string | null;
  blocks: DropBlock[];
  contributors: User[];
  isEditing?: boolean;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}


// Format contributor names
function formatContributorNames(contributors: User[]): string {
  if (contributors.length === 0) return "";
  if (contributors.length === 1) return contributors[0].display_name;
  if (contributors.length === 2) {
    return `${contributors[0].display_name} and ${contributors[1].display_name}`;
  }
  const othersCount = contributors.length - 2;
  return `${contributors[0].display_name}, ${contributors[1].display_name}, and ${othersCount} other${othersCount > 1 ? "s" : ""}`;
}

// Count posts in blocks
function countPosts(blocks: DropBlock[]): number {
  return blocks.filter((b) => b.type === "post" || b.type === "featured_post").length;
}

// Format date range for display
// Extracts the date portion (YYYY-MM-DD) to avoid timezone shifts
function formatDateRange(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  // Extract date portion to avoid UTC->local timezone shifts
  const startDateStr = start.substring(0, 10);
  const endDateStr = end.substring(0, 10);
  // Parse at noon local time to avoid DST edge cases
  const startDate = new Date(`${startDateStr}T12:00:00`);
  const endDate = new Date(`${endDateStr}T12:00:00`);
  return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
}

export function DropBlocksView({
  title,
  description,
  blocks,
  contributors,
  dateRangeStart,
  dateRangeEnd,
}: DropBlocksViewProps) {
  const postCount = countPosts(blocks);
  const contributorNames = formatContributorNames(contributors);
  const dateRange = formatDateRange(dateRangeStart, dateRangeEnd);

  return (
    <div className="max-w-[700px] mx-auto bg-background text-foreground font-sans">
      {/* Header */}
      <div className="text-center py-10 px-5 pt-10">
        <p className="text-xs text-muted-foreground tracking-wider uppercase m-0">Mainstream</p>
        <h1 className="text-[32px] font-bold text-foreground my-6 leading-tight">{title}</h1>
        {dateRange && (
          <p className="text-sm text-muted-foreground mt-2 mb-0">
            {dateRange}
          </p>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-base leading-relaxed text-muted-foreground px-5 pb-4 m-0 text-center whitespace-pre-wrap">
          {description}
        </p>
      )}

      {/* Contributors avatars */}
      {contributors.length > 0 && (
        <div className="text-center py-4 px-5">
          {/* Overlapping avatars */}
          <div className="inline-block">
            {contributors.slice(0, 5).map((contributor, index) => (
              <div
                key={contributor.id}
                className={cn(
                  "inline-block relative",
                  index !== 0 && "-ml-3"
                )}
                style={{ zIndex: contributors.length - index }}
              >
                {contributor.avatar_url ? (
                  <Image
                    src={contributor.avatar_url}
                    alt={contributor.display_name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-background object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-background bg-muted inline-flex items-center justify-center text-foreground text-sm font-medium">
                    {(contributor.display_name || contributor.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {contributors.length > 5 && (
              <div className="inline-block -ml-3 w-12 h-12 rounded-full border-2 border-background bg-muted text-muted-foreground text-sm font-medium leading-[44px] text-center">
                +{contributors.length - 5}
              </div>
            )}
          </div>
          
          {/* Post count text */}
          <p className="text-sm text-muted-foreground mt-3 mb-0">
            {postCount} post{postCount !== 1 ? "s" : ""} from {contributorNames}
          </p>
        </div>
      )}

      {/* Divider */}
      <hr className="border-border my-4 mx-5" />

      {/* Blocks */}
      <div className="px-5 pb-10">
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            isEditing={false}
          />
        ))}
      </div>
    </div>
  );
}

