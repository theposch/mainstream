"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type UserProfileTab = "shots" | "streams" | "liked";

// TODO: Future tabs to implement:
// - "activity" tab - Recent comments, uploads, project updates (requires activity feed)

interface UserProfileTabsProps {
  activeTab: UserProfileTab;
  onTabChange: (tab: UserProfileTab) => void;
  shotsCount: number;
  streamsCount: number;
  likedCount: number;
}

interface TabConfig {
  id: UserProfileTab;
  label: string;
  count: number;
}

/**
 * Tab navigation component for user profiles.
 * Displays three tabs: Shots, Streams, and Liked.
 * 
 * @param activeTab - Currently active tab
 * @param onTabChange - Callback when tab is changed
 * @param shotsCount - Number of shots to display
 * @param streamsCount - Number of streams to display
 * @param likedCount - Number of liked assets to display
 */
export const UserProfileTabs = React.memo(function UserProfileTabs({ 
  activeTab, 
  onTabChange, 
  shotsCount, 
  streamsCount,
  likedCount
}: UserProfileTabsProps) {
  const tabs: TabConfig[] = React.useMemo(() => [
    { id: "shots" as const, label: "Shots", count: shotsCount },
    { id: "streams" as const, label: "Streams", count: streamsCount },
    { id: "liked" as const, label: "Liked", count: likedCount },
  ], [shotsCount, streamsCount, likedCount]);

  const handleTabChange = React.useCallback((tab: UserProfileTab, e: React.MouseEvent) => {
    e.preventDefault();
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <div className="flex w-full" role="tablist" aria-label="User profile content">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            onClick={(e) => handleTabChange(tab.id, e)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
    </div>
  );
});

