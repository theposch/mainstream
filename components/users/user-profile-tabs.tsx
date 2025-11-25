"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
 * Displays three tabs: Shots, Streams, and Liked with animated transitions.
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
  // Issue #6 Fix: Reduce duplication with array mapping
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
    <div className="flex justify-center w-full" role="tablist" aria-label="User profile content">
      <div className="flex p-1.5 bg-muted/80 backdrop-blur-md rounded-full border border-border shadow-sm">
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
              "relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10",
              activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeUserProfileTab"
                className="absolute inset-0 bg-secondary rounded-full shadow-sm"
                transition={{ type: "spring", duration: 0.5 }}
                style={{ zIndex: -1 }}
              />
            )}
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
    </div>
  );
});

