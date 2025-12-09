"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "recent" | "following";

interface FeedTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const FeedTabs = React.memo(function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex justify-center w-full mb-8">
      <div className="flex p-1 bg-muted/80 backdrop-blur-md rounded-full border border-border">
        <button
          onClick={() => onTabChange("recent")}
          className={cn(
            "relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 cursor-pointer",
            activeTab === "recent" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {activeTab === "recent" && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-secondary rounded-full"
              transition={{ type: "spring", duration: 0.5 }}
              style={{ zIndex: -1 }}
            />
          )}
          Recent
        </button>
        <button
          onClick={() => onTabChange("following")}
          className={cn(
            "relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 cursor-pointer",
            activeTab === "following" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {activeTab === "following" && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-secondary rounded-full"
              transition={{ type: "spring", duration: 0.5 }}
              style={{ zIndex: -1 }}
            />
          )}
          Following
        </button>
      </div>
    </div>
  );
});

