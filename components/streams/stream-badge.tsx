"use client";

import * as React from "react";
import Link from "next/link";
import { Hash, Lock } from "lucide-react";
import { Stream } from "@/lib/mock-data/streams";
import { cn } from "@/lib/utils";

interface StreamBadgeProps {
  stream: Stream;
  clickable?: boolean;
  isLocked?: boolean;
  className?: string;
}

export const StreamBadge = React.memo(function StreamBadge({
  stream,
  clickable = true,
  isLocked = false,
  className,
}: StreamBadgeProps) {
  const content = (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
      "bg-secondary/50 text-secondary-foreground border border-border/50",
      "transition-colors",
      clickable && !isLocked && "hover:bg-secondary hover:border-border cursor-pointer",
      isLocked && "opacity-60",
      className
    )}>
      {isLocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <Hash className="h-3 w-3" />
      )}
      <span className="truncate max-w-[120px]">
        {stream.name.replace(/^# /, '')}
      </span>
    </span>
  );

  if (!clickable || isLocked) {
    return content;
  }

  return (
    <Link href={`/stream/${stream.id}`} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  );
});

