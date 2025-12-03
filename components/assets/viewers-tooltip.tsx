"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye } from "lucide-react";
import type { AssetViewer } from "@/lib/types/database";

interface ViewersTooltipProps {
  assetId: string;
  viewCount: number;
  className?: string;
}

/**
 * Displays view count with a tooltip showing who viewed the asset.
 * Fetches viewer list lazily on hover for performance.
 */
export function ViewersTooltip({ assetId, viewCount, className }: ViewersTooltipProps) {
  const [viewers, setViewers] = useState<AssetViewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Reset state when assetId changes (prevents stale data)
  React.useEffect(() => {
    setViewers([]);
    setFetched(false);
    setLoading(false);
  }, [assetId]);

  const fetchViewers = async () => {
    if (fetched || loading || viewCount === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/viewers?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setViewers(data.viewers || []);
      }
    } catch (error) {
      console.error("Failed to fetch viewers:", error);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // Show even with 0 views (users can see the element exists)
  // The tooltip will show "No viewer details available" until there are views

  const remainingCount = Math.max(0, viewCount - viewers.length);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onMouseEnter={fetchViewers}
            className={`flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors ${className}`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Seen by {viewCount} {viewCount === 1 ? "person" : "people"}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="start"
          className="p-3 max-w-xs z-[150]"
        >
          {loading ? (
            <p className="text-xs text-zinc-400">Loading...</p>
          ) : viewers.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Stacked avatars */}
              <div className="flex -space-x-2">
                {viewers.slice(0, 5).map((viewer) => (
                  <Avatar key={viewer.id} className="h-7 w-7 border-2 border-zinc-900 ring-0">
                    <AvatarImage src={viewer.avatar_url || undefined} alt={viewer.display_name} />
                    <AvatarFallback className="text-xs bg-zinc-700 text-zinc-200">
                      {viewer.display_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              
              {/* Names text */}
              <p className="text-xs text-zinc-300">
                {formatViewerNames(viewers, remainingCount)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No viewer details available</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Formats viewer names for display:
 * - 1 viewer: "Sarah"
 * - 2 viewers: "Sarah and Mike"
 * - 3 viewers: "Sarah, Mike, and Alex"
 * - 4+ viewers: "Sarah, Mike, and 8 others"
 */
function formatViewerNames(viewers: AssetViewer[], remainingCount: number): string {
  if (viewers.length === 0) return "";
  
  const names = viewers.map(v => v.display_name || v.username);
  
  if (names.length === 1) {
    return remainingCount > 0 ? `${names[0]} and ${remainingCount} others` : names[0];
  }
  
  if (names.length === 2) {
    return remainingCount > 0 
      ? `${names[0]}, ${names[1]}, and ${remainingCount} others`
      : `${names[0]} and ${names[1]}`;
  }
  
  // 3+ names shown
  if (remainingCount > 0) {
    return `${names.slice(0, 2).join(", ")}, and ${remainingCount + names.length - 2} others`;
  }
  
  // All names shown (3+)
  const lastIndex = names.length - 1;
  return `${names.slice(0, lastIndex).join(", ")}, and ${names[lastIndex]}`;
}

