"use client";

import * as React from "react";
import { X } from "lucide-react";
import { FeedTabs } from "./feed-tabs";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { Asset } from "@/lib/mock-data/assets";
import { useSearch } from "@/lib/contexts/search-context";
import { searchAssets } from "@/lib/utils/search";
import { users } from "@/lib/mock-data/users";
import { projects } from "@/lib/mock-data/projects";
import { Button } from "@/components/ui/button";

interface DashboardFeedProps {
  initialAssets: Asset[];
}

export function DashboardFeed({ initialAssets }: DashboardFeedProps) {
  const [activeTab, setActiveTab] = React.useState<"recent" | "following">("recent");
  const { debouncedQuery, clearSearch } = useSearch();
  
  // TODO: Replace with real API calls based on tab
  // Recent tab: GET /api/feed/recent (all public assets from teams user has access to)
  // Following tab: GET /api/feed/following (assets from users/teams user follows)
  // Implement infinite scroll or pagination
  // Add loading states and error handling
  const baseAssets = React.useMemo(() => {
    return activeTab === "recent" 
      ? initialAssets 
      : initialAssets.slice().reverse(); // Just flip them for variety
  }, [activeTab, initialAssets]);

  // Filter assets based on search query
  const displayedAssets = React.useMemo(() => {
    if (!debouncedQuery.trim()) return baseAssets;
    return searchAssets(debouncedQuery, baseAssets, users, projects);
  }, [debouncedQuery, baseAssets]);

  // Show search result info
  const isSearching = debouncedQuery.trim().length > 0;
  const hasResults = displayedAssets.length > 0;

  return (
    <div className="w-full min-h-screen">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {isSearching && (
        <div className="mt-6 flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              Showing <span className="font-semibold">{displayedAssets.length}</span> result{displayedAssets.length !== 1 ? 's' : ''} for <span className="font-semibold">&quot;{debouncedQuery}&quot;</span>
            </span>
          </div>
          <Button
            variant="cosmos-ghost"
            size="sm"
            onClick={clearSearch}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      <div className="mt-6">
        {hasResults ? (
          <MasonryGrid assets={displayedAssets} />
        ) : isSearching ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t find any assets matching &quot;{debouncedQuery}&quot;
            </p>
            <Button variant="cosmos" onClick={clearSearch}>
              Clear search
            </Button>
          </div>
        ) : (
          <MasonryGrid assets={displayedAssets} />
        )}
      </div>
    </div>
  );
}
