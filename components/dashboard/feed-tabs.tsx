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
    <div className="flex justify-center w-full" role="tablist" aria-label="Feed content">
      <div className="flex p-1.5 bg-muted/80 backdrop-blur-md rounded-full border border-border shadow-sm">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "recent"}
          onClick={() => onTabChange("recent")}
          className={cn(
            "relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 cursor-pointer",
            activeTab === "recent" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeTab === "recent" && (
            <motion.div
              layoutId="activeFeedTab"
              className="absolute inset-0 bg-secondary rounded-full shadow-sm"
              transition={{ type: "spring", duration: 0.5 }}
              style={{ zIndex: -1 }}
            />
          )}
          Recent
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "following"}
          onClick={() => onTabChange("following")}
          className={cn(
            "relative px-8 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 cursor-pointer",
            activeTab === "following" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeTab === "following" && (
            <motion.div
              layoutId="activeFeedTab"
              className="absolute inset-0 bg-secondary rounded-full shadow-sm"
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

