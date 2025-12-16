"use client";

import * as React from "react";
import { Upload, Loader2, Users, LayoutGrid, Rows } from "lucide-react";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { FeedTabs } from "./feed-tabs";
import { WeekHeader } from "./week-header";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { AssetDetail } from "@/components/assets/asset-detail";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAssetsInfinite } from "@/lib/hooks/use-assets-infinite";
import { useFollowingAssets } from "@/lib/hooks/use-following-assets";
import { assetKeys, fetchAssetById } from "@/lib/queries/asset-queries";
import { UploadDialog } from "@/components/layout/upload-dialog";
import { groupAssetsByWeek } from "@/lib/utils/week-grouping";
import type { Asset } from "@/lib/types/database";

interface DashboardFeedProps {
  initialAssets: Asset[];
}

export const DashboardFeed = React.memo(function DashboardFeed({ initialAssets }: DashboardFeedProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"recent" | "following">("recent");
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [layout, setLayout] = React.useState<"grid" | "detailed">("grid");
  
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
    setUploadDialogOpen(true);
  }, []);
  
  // Infinite scroll hook for recent feed
  const { assets, loadMore, hasMore, loading, removeAsset } = useAssetsInfinite(initialAssets);
  
  // Hook for following feed
  const { 
    assets: followingAssets, 
    loadMore: loadMoreFollowing,
    hasMore: hasMoreFollowing,
    loading: loadingFollowing,
    removeAsset: removeFollowingAsset
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

  // Memoized computed values to prevent recalculation on every render
  const displayedAssets = React.useMemo(
    () => activeTab === "recent" ? assets : followingAssets,
    [activeTab, assets, followingAssets]
  );
  const currentLoading = activeTab === "recent" ? loading : loadingFollowing;
  const currentHasMore = activeTab === "recent" ? hasMore : hasMoreFollowing;

  // Group assets by week for display
  const weekGroups = React.useMemo(
    () => groupAssetsByWeek(displayedAssets),
    [displayedAssets]
  );

  const hasResults = displayedAssets.length > 0;
  const isEmpty = displayedAssets.length === 0;

  // Find selected asset from current assets for modal
  const assetFromCache = React.useMemo(() => {
    if (!selectedAssetId) return null;
    // Search in all loaded asset sources
    return (
      assets.find((a) => a.id === selectedAssetId) ||
      followingAssets.find((a) => a.id === selectedAssetId) ||
      null
    );
  }, [selectedAssetId, assets, followingAssets]);

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

  // Handle asset deletion - remove from both feeds
  const handleDeleteAsset = React.useCallback((assetId: string) => {
    removeAsset(assetId);
    removeFollowingAsset(assetId);
  }, [removeAsset, removeFollowingAsset]);

  return (
    <div className="w-full min-h-screen">
      <div className="mb-8 flex items-center justify-end gap-3">
        <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
          <button
            onClick={() => setLayout("grid")}
            className={`p-1.5 rounded-md transition-all ${
              layout === "grid" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLayout("detailed")}
            className={`p-1.5 rounded-md transition-all ${
              layout === "detailed" 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Detailed view"
          >
            <Rows className="w-4 h-4" />
          </button>
        </div>
      </div>

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
            {/* Weekly grouped feed */}
            <div className="space-y-1">
              {weekGroups.map((week) => (
                <div key={week.key}>
                  <WeekHeader
                    label={week.label}
                    postCount={week.postCount}
                    contributors={week.contributors}
                  />
                  <MasonryGrid 
                    assets={week.assets} 
                    layout={layout}
                    onAssetClick={handleAssetClick}
                  />
                </div>
              ))}
            </div>
            
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="w-full py-8 flex items-center justify-center">
              {currentLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading more designs...</span>
                </div>
              )}
              {!currentHasMore && displayedAssets.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  You've reached the end!
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Asset Detail Modal Overlay */}
      {selectedAsset && (
        <AssetDetail 
          asset={selectedAsset} 
          allAssets={displayedAssets}
          onClose={handleCloseModal}
          onNavigate={setSelectedAssetId}
          onDelete={handleDeleteAsset}
        />
      )}

      {/* Upload Dialog for empty state */}
      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </div>
  );
});
