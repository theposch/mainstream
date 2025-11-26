"use client";

import * as React from "react";
import Link from "next/link";
import { Hash, Lock } from "lucide-react";
import { Stream } from "@/lib/mock-data/streams";
import { cn } from "@/lib/utils";

interface StreamBadgeProps {
  stream: Stream;  // Required, no alternatives
  clickable?: boolean;
  className?: string;
}

export const StreamBadge = React.memo(function StreamBadge({
  stream,
  clickable = true,
  className,
}: StreamBadgeProps) {
  const { name, isPrivate } = stream;

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
        {name}
      </span>
    </span>
  );

  if (!clickable || isPrivate) {
    return content;
  }

  return (
    <Link href={`/stream/${name}`} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  );
});

