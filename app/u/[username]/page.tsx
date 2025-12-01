"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { UserProfileHeader } from "@/components/users/user-profile-header";
import { UserProfileTabs, UserProfileTab } from "@/components/users/user-profile-tabs";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { createClient } from "@/lib/supabase/client";
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

        // Get asset IDs for like status check
        const userAssetIds = assetsData?.map(a => a.id) || [];
        const likedAssetIds = likedData?.map(l => l.asset_id) || [];
        const allAssetIds = [...new Set([...userAssetIds, ...likedAssetIds])];
        
        // Check which assets the current user has liked
        let userLikedAssetIds: Set<string> = new Set();
        if (authUser && allAssetIds.length > 0) {
          const { data: userLikes } = await supabase
            .from('asset_likes')
            .select('asset_id')
            .eq('user_id', authUser.id)
            .in('asset_id', allAssetIds);
          
          if (userLikes) {
            userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
          }
        }

        // Transform user assets with like data
        const transformedAssets = (assetsData || []).map((asset: any) => ({
          ...asset,
          likeCount: asset.asset_likes?.[0]?.count || 0,
          asset_likes: undefined,
          isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
        }));
        setUserAssets(transformedAssets);
        
        // Enrich streams with asset count and recent posts for thumbnails
        const enrichedStreams = await Promise.all(
          (streamsData || []).map(async (stream) => {
            // Get asset count for this stream
            const { count: streamAssetsCount } = await supabase
              .from('asset_streams')
              .select('*', { count: 'exact', head: true })
              .eq('stream_id', stream.id);

            // Get 4 most recent assets for thumbnails
            const { data: assetRelations } = await supabase
              .from('asset_streams')
              .select(`
                assets (
                  id,
                  url,
                  thumbnail_url,
                  title
                )
              `)
              .eq('stream_id', stream.id)
              .order('added_at', { ascending: false })
              .limit(4);

            const recentPosts = assetRelations?.map((rel: any) => ({
              id: rel.assets?.id || '',
              url: rel.assets?.thumbnail_url || rel.assets?.url || '',
              title: rel.assets?.title || '',
            })).filter(post => post.id) || [];

            return {
              ...stream,
              assetsCount: streamAssetsCount || 0,
              recentPosts,
            };
          })
        );
        
        setUserStreams(enrichedStreams as any);
        
        // Extract and transform liked assets with like data
        const liked = (likedData?.map(item => {
          const asset = item.assets as any;
          if (!asset) return null;
          return {
            ...asset,
            likeCount: asset.asset_likes?.[0]?.count || 0,
            asset_likes: undefined,
            isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
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
  }, [username]);

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
              <MasonryGrid assets={userAssets} />
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
              <MasonryGrid assets={likedAssets} />
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
    </div>
  );
}
