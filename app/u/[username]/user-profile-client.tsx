"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { UserProfileHeader } from "@/components/users/user-profile-header";
import { UserProfileTabs, type UserProfileTab } from "@/components/users/user-profile-tabs";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { AssetDetail } from "@/components/assets/asset-detail";
import { Button } from "@/components/ui/button";
import { assetKeys, fetchAssetById } from "@/lib/queries/asset-queries";
import type { Asset, User, Stream } from "@/lib/types/database";

interface StreamWithAssets extends Stream {
  assetsCount?: number;
  recentPosts?: Array<{ id: string; url: string; title: string }>;
}

interface UserProfileClientProps {
  profileUser: User;
  userAssets: Asset[];
  userStreams: StreamWithAssets[];
  initialLikedAssets: Asset[];
  stats: { followers: number; following: number; assets: number };
  currentUserId: string | null;
  initialTab: UserProfileTab;
}

export function UserProfileClient({
  profileUser,
  userAssets,
  userStreams,
  initialLikedAssets,
  stats,
  currentUserId,
  initialTab,
}: UserProfileClientProps) {
  const router = useRouter();

  // Tab state with per-tab scroll position memory
  const [activeTab, setActiveTab] = React.useState<UserProfileTab>(initialTab);
  const [visitedTabs, setVisitedTabs] = React.useState<Set<UserProfileTab>>(
    () => new Set([initialTab])
  );
  const scrollPositions = React.useRef<Record<string, number>>({});
  const rafIdRef = React.useRef<number | null>(null);

  // Liked assets managed client-side so we can remove unliked items instantly
  const [likedAssets, setLikedAssets] = React.useState<Asset[]>(initialLikedAssets);

  // Asset detail modal — URL-synced via nuqs
  const [selectedAssetId, setSelectedAssetId] = useQueryState("asset", {
    defaultValue: "",
    shallow: true,
    history: "push",
  });

  // Reload server data when the user uploads an asset on their own profile
  React.useEffect(() => {
    const handleAssetUploaded = () => router.refresh();
    window.addEventListener("asset-uploaded", handleAssetUploaded);
    return () => window.removeEventListener("asset-uploaded", handleAssetUploaded);
  }, [router]);

  // Cleanup pending RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const handleTabChange = React.useCallback(
    (tab: UserProfileTab) => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);

      // Save scroll position of current tab
      scrollPositions.current[activeTab] = window.scrollY;

      React.startTransition(() => {
        setVisitedTabs((prev) => new Set(prev).add(tab));
      });

      setActiveTab(tab);
      router.push(`/u/${profileUser.username}?tab=${tab}`, { scroll: false });

      // Restore scroll position for the new tab
      rafIdRef.current = requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositions.current[tab] || 0);
        rafIdRef.current = null;
      });
    },
    [activeTab, profileUser.username, router]
  );

  const handleLikedAssetChange = React.useCallback(
    (assetId: string, isLiked: boolean) => {
      if (!isLiked) {
        setLikedAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    },
    []
  );

  // Find selected asset from in-memory lists first (avoids extra fetch)
  const assetFromCache = React.useMemo(() => {
    if (!selectedAssetId) return null;
    return (
      userAssets.find((a) => a.id === selectedAssetId) ||
      likedAssets.find((a) => a.id === selectedAssetId) ||
      null
    );
  }, [selectedAssetId, userAssets, likedAssets]);

  // Deep-link support: fetch from API when asset not in local cache
  const { data: fetchedAsset } = useQuery({
    queryKey: assetKeys.detail(selectedAssetId || ""),
    queryFn: () => fetchAssetById(selectedAssetId!),
    enabled: !!selectedAssetId && !assetFromCache,
    staleTime: 5 * 60 * 1000,
  });

  const selectedAsset = assetFromCache || fetchedAsset || null;

  const handleAssetClick = React.useCallback(
    (asset: Asset) => setSelectedAssetId(asset.id),
    [setSelectedAssetId]
  );

  const handleCloseModal = React.useCallback(
    () => setSelectedAssetId(""),
    [setSelectedAssetId]
  );

  const isOwnProfile = currentUserId === profileUser.id;

  return (
    <div className="w-full min-h-screen pb-20">
      <UserProfileHeader
        user={{
          ...profileUser,
          followersCount: stats.followers,
          followingCount: stats.following,
          assetsCount: stats.assets,
        }}
        isOwnProfile={isOwnProfile}
      />

      <div className="mt-12 mb-10">
        <UserProfileTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          shotsCount={userAssets.length}
          streamsCount={userStreams.length}
          likedCount={likedAssets.length}
        />
      </div>

      <div>
        {/* Shots Tab */}
        <div
          id="shots-panel"
          role="tabpanel"
          aria-labelledby="shots-tab"
          className={activeTab === "shots" ? "block" : "hidden"}
        >
          {visitedTabs.has("shots") &&
            (userAssets.length > 0 ? (
              <MasonryGrid assets={userAssets} onAssetClick={handleAssetClick} />
            ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">
                  No shots yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                  {isOwnProfile
                    ? "Upload your first asset to get started."
                    : "This user hasn't uploaded any assets yet."}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link href="/home">Upload Asset</Link>
                  </Button>
                )}
              </div>
            ))}
        </div>

        {/* Liked Tab */}
        <div
          id="liked-panel"
          role="tabpanel"
          aria-labelledby="liked-tab"
          className={activeTab === "liked" ? "block" : "hidden"}
        >
          {visitedTabs.has("liked") &&
            (likedAssets.length > 0 ? (
              <MasonryGrid
                assets={likedAssets}
                onLikeChange={handleLikedAssetChange}
                onAssetClick={handleAssetClick}
              />
            ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">
                  No liked assets yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                  {isOwnProfile
                    ? "Start liking assets to build your collection."
                    : "This user hasn't liked any assets yet."}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link href="/home">Browse Assets</Link>
                  </Button>
                )}
              </div>
            ))}
        </div>

        {/* Streams Tab */}
        <div
          id="streams-panel"
          role="tabpanel"
          aria-labelledby="streams-tab"
          className={activeTab === "streams" ? "block" : "hidden"}
        >
          {visitedTabs.has("streams") &&
            (userStreams.length > 0 ? (
              <StreamGrid streams={userStreams} />
            ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">
                  No streams yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                  {isOwnProfile
                    ? "Create your first stream to get started."
                    : "This user hasn't created any streams yet."}
                </p>
                {isOwnProfile && (
                  <Button asChild>
                    <Link href="/streams">Create Stream</Link>
                  </Button>
                )}
              </div>
            ))}
        </div>
      </div>

      {selectedAsset && (
        <AssetDetail
          asset={selectedAsset}
          allAssets={activeTab === "liked" ? likedAssets : userAssets}
          onClose={handleCloseModal}
          onNavigate={setSelectedAssetId}
        />
      )}
    </div>
  );
}
