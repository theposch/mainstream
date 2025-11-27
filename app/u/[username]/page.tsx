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

interface UserProfileProps {
  params: Promise<{
    username: string;
  }>;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  job_title?: string;
}

interface Asset {
  id: string;
  title: string;
  url: string;
  thumbnail_url?: string;
  medium_url?: string;
  uploader_id: string;
  width?: number;
  height?: number;
  created_at: string;
  uploader?: User;
}

interface Stream {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_type: string;
  is_private: boolean;
  status: string;
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
  const [userStreams, setUserStreams] = React.useState<Stream[]>([]);
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

        // Fetch all data in parallel
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
          supabase.from('assets').select(`*, uploader:users!uploader_id(*)`).eq('uploader_id', userData.id).order('created_at', { ascending: false }),
          supabase.from('streams').select('*').eq('owner_id', userData.id).eq('owner_type', 'user').eq('status', 'active'),
          supabase.from('asset_likes')
            .select(`asset_id, assets(*, uploader:users!uploader_id(*))`)
            .eq('user_id', userData.id)
        ]);

        setStats({
          followers: followersCount || 0,
          following: followingCount || 0,
          assets: assetsCount || 0,
        });

        setUserAssets(assetsData || []);
        setUserStreams(streamsData || []);
        
        // Extract assets from likes
        const liked = likedData?.map(item => item.assets).filter(Boolean) || [];
        setLikedAssets(liked as unknown as Asset[]);

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
