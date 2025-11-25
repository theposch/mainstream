"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TeamTab = "streams" | "posts";

interface TeamTabsProps {
  activeTab: TeamTab;
  onTabChange: (tab: TeamTab) => void;
  postsCount: number;
  streamsCount: number;
}

export const TeamTabs = React.memo(function TeamTabs({ activeTab, onTabChange, postsCount, streamsCount }: TeamTabsProps) {
  return (
    <div className="flex justify-center w-full">
      <div className="flex p-1.5 bg-muted/80 backdrop-blur-md rounded-full border border-border shadow-sm">
        <button
          onClick={() => onTabChange("posts")}
          className={cn(
            "relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10",
            activeTab === "posts" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeTab === "posts" && (
            <motion.div
              layoutId="activeTeamTab"
              className="absolute inset-0 bg-secondary rounded-full shadow-sm"
              transition={{ type: "spring", duration: 0.5 }}
              style={{ zIndex: -1 }}
            />
          )}
          Posts ({postsCount})
        </button>
        <button
          onClick={() => onTabChange("projects")}
          className={cn(
            "relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10",
            activeTab === "projects" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeTab === "projects" && (
            <motion.div
              layoutId="activeTeamTab"
              className="absolute inset-0 bg-secondary rounded-full shadow-sm"
              transition={{ type: "spring", duration: 0.5 }}
              style={{ zIndex: -1 }}
            />
          )}
          Projects ({projectsCount})
        </button>
      </div>
    </div>
  );
});

