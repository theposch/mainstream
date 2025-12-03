"use client";

import * as React from "react";
import { X, Upload, Loader2, Users } from "lucide-react";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { FeedTabs } from "./feed-tabs";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { AssetDetail } from "@/components/assets/asset-detail";
import { useSearch } from "@/lib/contexts/search-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAssetsInfinite } from "@/lib/hooks/use-assets-infinite";
import { useFollowingAssets } from "@/lib/hooks/use-following-assets";
import { assetKeys, fetchAssetById } from "@/lib/queries/asset-queries";
import type { Asset } from "@/lib/types/database";

interface DashboardFeedProps {
  initialAssets: Asset[];
}

export const DashboardFeed = React.memo(function DashboardFeed({ initialAssets }: DashboardFeedProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"recent" | "following">("recent");
  const { debouncedQuery, clearSearch } = useSearch();
  const [searchResults, setSearchResults] = React.useState<Asset[]>([]);
  const [searching, setSearching] = React.useState(false);
  
  // Modal state with URL sync via nuqs
  // shallow: true = URL updates without server re-render (client-side only)
  // history: 'push' = back button closes modal
  const [selectedAssetId, setSelectedAssetId] = useQueryState("asset", {
    defaultValue: "",
    shallow: true,
    history: "push",
  });
  
  // Memoized callbacks for stable references
  const handleUploadClick = React.useCallback(() => {
    router.push('/upload');
  }, [router]);
  
  // Infinite scroll hook for recent feed
  const { assets, loadMore, hasMore, loading } = useAssetsInfinite(initialAssets);
  
  // Hook for following feed
  const { 
    assets: followingAssets, 
    loadMore: loadMoreFollowing,
    hasMore: hasMoreFollowing,
    loading: loadingFollowing
  } = useFollowingAssets();
  
  // Load following assets when tab switches to "following"
  React.useEffect(() => {
    if (activeTab === "following" && followingAssets.length === 0 && !loadingFollowing) {
      loadMoreFollowing();
    }
  }, [activeTab, followingAssets.length, loadingFollowing, loadMoreFollowing]);
  
  // Intersection Observer for infinite scroll
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Use different load function and state based on active tab
    const currentLoadMore = activeTab === "recent" ? loadMore : loadMoreFollowing;
    const currentHasMore = activeTab === "recent" ? hasMore : hasMoreFollowing;
    const currentLoading = activeTab === "recent" ? loading : loadingFollowing;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && currentHasMore && !currentLoading) {
          currentLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px", // Start loading 100px before reaching the sentinel
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, hasMore, loading, loadMore, hasMoreFollowing, loadingFollowing, loadMoreFollowing]);

  // Search via API when query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const performSearch = async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=assets&limit=50`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.assets || []);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);
  
  // Memoized computed values to prevent recalculation on every render
  const baseAssets = React.useMemo(
    () => activeTab === "recent" ? assets : followingAssets,
    [activeTab, assets, followingAssets]
  );
  const currentLoading = activeTab === "recent" ? loading : loadingFollowing;
  const currentHasMore = activeTab === "recent" ? hasMore : hasMoreFollowing;

  const displayedAssets = React.useMemo(
    () => debouncedQuery.trim() ? searchResults : baseAssets,
    [debouncedQuery, searchResults, baseAssets]
  );

  // Show search result info
  const isSearching = debouncedQuery.trim().length > 0;
  const hasResults = displayedAssets.length > 0;
  const isEmpty = !isSearching && baseAssets.length === 0;

  // Find selected asset from current assets for modal
  const assetFromCache = React.useMemo(() => {
    if (!selectedAssetId) return null;
    // Search in all loaded asset sources
    return (
      assets.find((a) => a.id === selectedAssetId) ||
      followingAssets.find((a) => a.id === selectedAssetId) ||
      searchResults.find((a) => a.id === selectedAssetId) ||
      null
    );
  }, [selectedAssetId, assets, followingAssets, searchResults]);

  // Deep linking support: fetch asset from API if not in cache
  // This handles direct URLs like /home?asset=xxx
  const { data: fetchedAsset } = useQuery({
    queryKey: assetKeys.detail(selectedAssetId || ""),
    queryFn: () => fetchAssetById(selectedAssetId!),
    enabled: !!selectedAssetId && !assetFromCache, // Only fetch if not in cache
    staleTime: 5 * 60 * 1000,
  });

  // Use cached asset if available, otherwise use fetched asset
  const selectedAsset = assetFromCache || fetchedAsset || null;

  // Modal handlers
  const handleAssetClick = React.useCallback(
    (asset: Asset) => {
      setSelectedAssetId(asset.id);
    },
    [setSelectedAssetId]
  );

  const handleCloseModal = React.useCallback(() => {
    setSelectedAssetId("");
  }, [setSelectedAssetId]);

  return (
    <div className="w-full min-h-screen">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {isSearching && (
        <div className="mt-6 flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-border">
          <div className="flex items-center gap-2">
            {searching ? (
              <span className="text-sm text-foreground">
                <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                Searching...
              </span>
            ) : (
            <span className="text-sm text-foreground">
              Showing <span className="font-semibold">{displayedAssets.length}</span> result{displayedAssets.length !== 1 ? 's' : ''} for <span className="font-semibold">&quot;{debouncedQuery}&quot;</span>
            </span>
            )}
          </div>
          <Button
            variant="ghost"
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
        {isEmpty ? (
          activeTab === "following" ? (
            // Empty state for Following tab
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Follow some creators to see their latest work here. Discover amazing designs from the community.
              </p>
              <Button 
                variant="default" 
                size="lg"
                onClick={() => router.push('/streams')}
              >
                <Users className="w-4 h-4 mr-2" />
                Discover Creators
              </Button>
            </div>
          ) : (
            // Empty state for Recent tab
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Upload your first design</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start building your portfolio by uploading your first design. Share your work with the community and get feedback.
              </p>
              <Button 
                variant="default" 
                size="lg"
                onClick={handleUploadClick}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Design
              </Button>
            </div>
          )
        ) : hasResults ? (
          <>
          <MasonryGrid 
            assets={displayedAssets} 
            onAssetClick={handleAssetClick}
          />
            
            {/* Infinite scroll sentinel - only show for non-search queries */}
            {!isSearching && (
              <div ref={sentinelRef} className="w-full py-8 flex items-center justify-center">
                {currentLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more designs...</span>
                  </div>
                )}
                {!currentHasMore && baseAssets.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You've reached the end!
                  </p>
                )}
              </div>
            )}
          </>
        ) : isSearching ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t find any assets matching &quot;{debouncedQuery}&quot;
            </p>
            <Button variant="default" onClick={clearSearch}>
              Clear search
            </Button>
          </div>
        ) : null}
      </div>

      {/* Asset Detail Modal Overlay */}
      {selectedAsset && (
        <AssetDetail 
          asset={selectedAsset} 
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
});
