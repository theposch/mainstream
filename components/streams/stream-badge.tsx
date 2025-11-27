"use client";

import * as React from "react";
import Link from "next/link";
import { Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamBadgeProps {
  stream: any;  // Stream from database
  clickable?: boolean;
  className?: string;
}

export const StreamBadge = React.memo(function StreamBadge({
  stream,
  clickable = true,
  className,
}: StreamBadgeProps) {
  const { name, is_private } = stream;

  const content = (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
      "bg-secondary/50 text-secondary-foreground border border-border/50",
      "transition-colors",
      clickable && !is_private && "hover:bg-secondary hover:border-border cursor-pointer",
      is_private && "opacity-60",
      className
    )}>
      {is_private ? (
        <Lock className="h-3 w-3" />
      ) : (
        <Hash className="h-3 w-3" />
      )}
      <span className="truncate max-w-[120px]">
        {name}
      </span>
    </span>
  );

  if (!clickable || is_private) {
    return content;
  }

  return (
    <Link href={`/stream/${name}`} onClick={(e) => e.stopPropagation()}>
      {content}
    </Link>
  );
});

