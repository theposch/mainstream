"use client";

import * as React from "react";
import Link from "next/link";
import { Hash, Lock } from "lucide-react";
import { Stream } from "@/lib/mock-data/streams";
import { cn } from "@/lib/utils";

interface StreamBadgeProps {
  // Accept either full stream object or just id and name for flexibility
  stream?: Stream;
  id?: string;
  name?: string;
  clickable?: boolean;
  isLocked?: boolean;
  className?: string;
}

export const StreamBadge = React.memo(function StreamBadge({
  stream,
  id,
  name,
  clickable = true,
  isLocked = false,
  className,
}: StreamBadgeProps) {
  // Support both APIs: full stream object or id+name
  const streamId = stream?.id || id;
  const streamName = stream?.name || name;
  const isPrivate = stream?.isPrivate || isLocked;

  if (!streamId || !streamName) {
    console.error('StreamBadge requires either stream object or id+name');
    return null;
  }

  const content = (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
      "bg-secondary/50 text-secondary-foreground border border-border/50",
      "transition-colors",
      clickable && !isPrivate && "hover:bg-secondary hover:border-border cursor-pointer",
      isPrivate && "opacity-60",
      className
    )}>
      {isPrivate ? (
        <Lock className="h-3 w-3" />
      ) : (
        <Hash className="h-3 w-3" />
      )}
      <span className="truncate max-w-[120px]">
        {streamName.replace(/^# /, '')}
      </span>
    </span>
  );

  if (!clickable || isPrivate) {
    return content;
  }

  return (
    <Link href={`/stream/${streamId}`} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  );
});

