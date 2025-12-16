"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tab = "recent" | "following";

interface FeedTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const FeedTabs = React.memo(function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex w-full" role="tablist" aria-label="Feed content">
      <div className="flex items-center gap-1">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "recent"}
          onClick={() => onTabChange("recent")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "recent"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Recent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "following"}
          onClick={() => onTabChange("following")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            activeTab === "following"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Following
        </button>
      </div>
    </div>
  );
});

