"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { UserProfileHeader } from "@/components/users/user-profile-header";
import { UserProfileTabs, UserProfileTab } from "@/components/users/user-profile-tabs";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { AssetDetail } from "@/components/assets/asset-detail";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { createClient } from "@/lib/supabase/client";
import { assetKeys, fetchAssetById } from "@/lib/queries/asset-queries";
import type { Asset, User, Stream } from "@/lib/types/database";

interface UserProfileProps {
  params: Promise<{
    username: string;
  }>;
}

// Extended Stream type with assets info for profile page
interface StreamWithAssets extends Stream {
  assetsCount?: number;
  recentPosts?: Array<{
    id: string;
    url: string;
    title: string;
  }>;
}

/**
 * User profile page component displaying user information, tabs, and content.
 * Handles three tabs: Shots (user's uploads), Streams, and Liked assets.
 * 
 * @param params - Next.js route params containing username
 */
export default function UserProfile({ params }: UserProfileProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [userAssets, setUserAssets] = React.useState<Asset[]>([]);
  const [userStreams, setUserStreams] = React.useState<StreamWithAssets[]>([]);
  const [likedAssets, setLikedAssets] = React.useState<Asset[]>([]);
  const [stats, setStats] = React.useState({ followers: 0, following: 0, assets: 0 });
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Bug #3 Fix: URL state synchronization
  const urlTab = searchParams.get('tab') as UserProfileTab | null;
  const initialTab = urlTab && ['shots', 'streams', 'liked'].includes(urlTab) ? urlTab : 'shots';
  const [activeTab, setActiveTab] = React.useState<UserProfileTab>(initialTab);
  
  // Bug #6 Fix: Lazy initialization for Set
  const [visitedTabs, setVisitedTabs] = React.useState<Set<UserProfileTab>>(
    () => new Set([initialTab])
  );
  
  // Bug #5 Fix: Store scroll position per tab
  const scrollPositions = React.useRef<Record<string, number>>({});
  const rafIdRef = React.useRef<number | null>(null);

  // Modal state with URL sync via nuqs (Pinterest-style overlay)
  const [selectedAssetId, setSelectedAssetId] = useQueryState("asset", {
    defaultValue: "",
    shallow: true,
    history: "push",
  });

  // Issue #13 Fix: Add error handling for decodeURIComponent
  React.useEffect(() => {
    params.then((p) => {
      try {
        const decodedUsername = decodeURIComponent(p.username);
        
        // Validate username format - alphanumeric, underscore, hyphen only
        if (!/^[a-zA-Z0-9_-]+$/.test(decodedUsername)) {
          console.error('Invalid username format:', decodedUsername);
          notFound();
          return;
        }
        
        setUsername(decodedUsername);
      } catch (error) {
        console.error('Invalid username format:', error);
        notFound();
      }
    });
  }, [params]);

  // Listen for asset upload events to refresh data
  React.useEffect(() => {
    const handleAssetUploaded = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('asset-uploaded', handleAssetUploaded);
    return () => window.removeEventListener('asset-uploaded', handleAssetUploaded);
  }, []);

  // Fetch user data from Supabase
  React.useEffect(() => {
    if (!username) return;

    const fetchUserData = async () => {
      setLoading(true);
      const supabase = await createClient();

      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUserId(authUser?.id || null);

        // Get user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();

        if (userError || !userData) {
          notFound();
          return;
        }

        setUser(userData);

        // Fetch all data in parallel (include like counts)
        // Note: Like status is verified client-side for reliability
        const [
          { count: followersCount },
          { count: followingCount },
          { count: assetsCount },
          { data: assetsData },
          { data: streamsData },
          { data: likedData },
        ] = await Promise.all([
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userData.id),
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userData.id),
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('uploader_id', userData.id),
          supabase.from('assets').select(`*, uploader:users!uploader_id(*), asset_likes(count)`).eq('uploader_id', userData.id).order('created_at', { ascending: false }),
          supabase.from('streams').select('*').eq('owner_id', userData.id).eq('owner_type', 'user').eq('status', 'active'),
          supabase.from('asset_likes')
            .select(`asset_id, assets(*, uploader:users!uploader_id(*), asset_likes(count))`)
            .eq('user_id', userData.id)
        ]);

        setStats({
          followers: followersCount || 0,
          following: followingCount || 0,
          assets: assetsCount || 0,
        });

        // Collect all asset IDs for batch like status check
        const userAssetIds = assetsData?.map((a: any) => a.id) || [];
        const likedAssetIds = likedData?.map((l: any) => l.asset_id) || [];
        const allAssetIds = [...new Set([...userAssetIds, ...likedAssetIds])];
        
        // Batch fetch which assets the current user has liked
        let currentUserLikedIds: Set<string> = new Set();
        if (authUser && allAssetIds.length > 0) {
          const { data: currentUserLikes } = await supabase
            .from('asset_likes')
            .select('asset_id')
            .eq('user_id', authUser.id)
            .in('asset_id', allAssetIds);
          
          if (currentUserLikes) {
            currentUserLikedIds = new Set(currentUserLikes.map(l => l.asset_id));
          }
        }

        // Transform user assets with like count and status
        const transformedAssets = (assetsData || []).map((asset: any) => ({
          ...asset,
          likeCount: asset.asset_likes?.[0]?.count || 0,
          asset_likes: undefined,
          isLikedByCurrentUser: currentUserLikedIds.has(asset.id),
        }));
        setUserAssets(transformedAssets);
        
        // Enrich streams with asset count and recent posts - batch query to prevent N+1
        const streamIds = (streamsData || []).map(s => s.id);
        
        let enrichedStreams: StreamWithAssets[] = [];
        if (streamIds.length > 0) {
          // Single batch query: get all asset_streams for all user streams at once
          const { data: allAssetRelations } = await supabase
            .from('asset_streams')
            .select(`
              stream_id,
              added_at,
              assets (
                id,
                url,
                thumbnail_url,
                title
              )
            `)
            .in('stream_id', streamIds)
            .order('added_at', { ascending: false });

          // Group results by stream_id
          const streamAssetMap = new Map<string, { count: number; posts: any[] }>();
          streamIds.forEach(id => streamAssetMap.set(id, { count: 0, posts: [] }));
          
          (allAssetRelations || []).forEach((rel: any) => {
            const entry = streamAssetMap.get(rel.stream_id);
            if (entry) {
              entry.count++;
              if (entry.posts.length < 4 && rel.assets) {
                entry.posts.push({
                  id: rel.assets.id,
                  url: rel.assets.thumbnail_url || rel.assets.url || '',
                  title: rel.assets.title || '',
                });
              }
            }
          });

          // Build enriched streams
          enrichedStreams = (streamsData || []).map(stream => {
            const data = streamAssetMap.get(stream.id) || { count: 0, posts: [] };
            return {
              ...stream,
              assetsCount: data.count,
              recentPosts: data.posts,
            };
          });
        }
        
        setUserStreams(enrichedStreams);
        
        // Extract and transform liked assets with like count and status
        const liked = (likedData?.map(item => {
          const asset = item.assets as any;
          if (!asset) return null;
          return {
            ...asset,
            likeCount: asset.asset_likes?.[0]?.count || 0,
            asset_likes: undefined,
            isLikedByCurrentUser: currentUserLikedIds.has(asset.id),
          };
        }).filter(Boolean) || []) as unknown as Asset[];
        setLikedAssets(liked);

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, refreshKey]);

  // Bug #2, #3, #5 Fix: Improved tab change with URL sync and per-tab scroll
  const handleTabChange = React.useCallback((tab: UserProfileTab) => {
    // Cancel any pending scroll restoration
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Store current tab's scroll position
    scrollPositions.current[activeTab] = window.scrollY;
    
    // Bug #2 Fix: Use startTransition to prioritize state updates
    React.startTransition(() => {
      setVisitedTabs(prev => new Set(prev).add(tab));
    });
    
    setActiveTab(tab);
    
    // Bug #3 Fix: Update URL without scroll
    if (username) {
      router.push(`/u/${username}?tab=${tab}`, { scroll: false });
    }
    
    // Bug #5 Fix: Restore the new tab's scroll position
    rafIdRef.current = requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[tab] || 0);
      rafIdRef.current = null;
    });
  }, [activeTab, username, router]);

  // Handle like changes from the Liked tab - remove unliked assets
  const handleLikedAssetChange = React.useCallback((assetId: string, isLiked: boolean) => {
    if (!isLiked) {
      // Asset was unliked - remove from likedAssets array
      setLikedAssets(prev => prev.filter(asset => asset.id !== assetId));
    }
  }, []);

  // Find selected asset from current assets for modal
  const assetFromCache = React.useMemo(() => {
    if (!selectedAssetId) return null;
    // Search in all profile asset sources
    return (
      userAssets.find((a) => a.id === selectedAssetId) ||
      likedAssets.find((a) => a.id === selectedAssetId) ||
      null
    );
  }, [selectedAssetId, userAssets, likedAssets]);

  // Deep linking support: fetch asset from API if not in cache
  const { data: fetchedAsset } = useQuery({
    queryKey: assetKeys.detail(selectedAssetId || ""),
    queryFn: () => fetchAssetById(selectedAssetId!),
    enabled: !!selectedAssetId && !assetFromCache,
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

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Check if viewing own profile
  const isOwnProfile = user && currentUserId ? currentUserId === user.id : false;

  // Show loading state
  if (!username || loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen pb-20">
       {/* Profile Header */}
      <UserProfileHeader 
        user={{
          ...user,
          followersCount: stats.followers,
          followingCount: stats.following,
          assetsCount: stats.assets,
        }}
        isOwnProfile={isOwnProfile}
      />

      {/* Tabs */}
      <div className="mt-12 mb-10">
        <UserProfileTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          shotsCount={userAssets.length}
          streamsCount={userStreams.length}
          likedCount={likedAssets.length}
        />
         </div>

      {/* Content - All tabs rendered but only active one is visible to preserve scroll position */}
      {/* Bug #1 Fix: Remove outer role="tabpanel" - each panel should be sibling */}
      <div>
        {/* Bug #4 Fix: Add consistent empty states for all tabs */}
        
        {/* Shots Tab */}
        <div 
          id="shots-panel"
          role="tabpanel"
          aria-labelledby="shots-tab"
          className={activeTab === "shots" ? "block" : "hidden"}
        >
          {visitedTabs.has("shots") && (
            userAssets.length > 0 ? (
              <MasonryGrid assets={userAssets} onAssetClick={handleAssetClick} />
            ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">No shots yet.</p>
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
            )
          )}
        </div>

        {/* Liked Tab */}
        <div 
          id="liked-panel"
          role="tabpanel"
          aria-labelledby="liked-tab"
          className={activeTab === "liked" ? "block" : "hidden"}
        >
          {visitedTabs.has("liked") && (
            likedAssets.length > 0 ? (
              <MasonryGrid 
                assets={likedAssets} 
                onLikeChange={handleLikedAssetChange} 
                onAssetClick={handleAssetClick}
              />
            ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">No liked assets yet.</p>
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
            )
          )}
      </div>

        {/* Streams Tab */}
        <div 
          id="streams-panel"
          role="tabpanel"
          aria-labelledby="streams-tab"
          className={activeTab === "streams" ? "block" : "hidden"}
        >
          {visitedTabs.has("streams") && (
            userStreams.length > 0 ? (
             <StreamGrid streams={userStreams} />
          ) : (
              <div className="text-center py-24">
                <p className="text-lg font-medium text-muted-foreground">No streams yet.</p>
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
            )
          )}
        </div>
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
}
