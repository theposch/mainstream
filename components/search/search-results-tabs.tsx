import * as React from "react";
import { cn } from "@/lib/utils";

export type SearchTab = "all" | "assets" | "streams" | "users";

interface SearchResultsTabsProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  counts: {
    all: number;
    assets: number;
    streams: number;
    users: number;
  };
}

export function SearchResultsTabs({
  activeTab,
  onTabChange,
  counts,
}: SearchResultsTabsProps) {
  const tabs: Array<{ id: SearchTab; label: string }> = [
    { id: "all", label: "All" },
    { id: "assets", label: "Assets" },
    { id: "streams", label: "Streams" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="border-b border-border">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-1 py-3 text-sm font-medium transition-colors",
              "hover:text-foreground",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            <span>{tab.label}</span>
            {counts[tab.id] > 0 && (
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {counts[tab.id]}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}



