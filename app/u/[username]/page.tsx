"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
// TODO: Replace with database queries
import { users, currentUser } from "@/lib/mock-data/users";
import { streams } from "@/lib/mock-data/streams";
import { teams } from "@/lib/mock-data/teams";
import { assets } from "@/lib/mock-data/assets";
import { getLikedAssetIds } from "@/lib/mock-data/likes";
import { UserProfileHeader } from "@/components/users/user-profile-header";
import { UserProfileTabs, UserProfileTab } from "@/components/users/user-profile-tabs";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";

interface UserProfileProps {
  params: Promise<{
    username: string;
  }>;
}

// TODO: Convert to async server component
// async function getUserProfile(username: string) {
//   const user = await db.query.users.findFirst({
//     where: eq(users.username, username),
//     with: {
//       streams: {
//         where: eq(streams.isPrivate, false), // Only show public streams unless viewing own profile
//         orderBy: desc(streams.createdAt)
//       },
//       followers: true,
//       following: true
//     }
//   });
//   return user;
// }

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
        setUsername(decodeURIComponent(p.username));
      } catch (error) {
        console.error('Invalid username format:', error);
        notFound();
      }
    });
  }, [params]);

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
  
  // TODO: Replace with: const user = await getUserProfile(username);
  const user = React.useMemo(
    () => username ? users.find((u) => u.username === username) : null,
    [username]
  );

  // Issue #1 Fix: Memoize expensive computations - MUST be called before any conditional returns
  // TODO: Replace with database query - only show public streams unless it's the user's own profile
  const userStreams = React.useMemo(
    () => user ? streams.filter(s => s.ownerId === user.id && s.ownerType === 'user') : [],
    [user]
  );

  // TODO: Replace with database query - GET /api/users/:userId/assets
  const userAssets = React.useMemo(
    () => user ? assets.filter(asset => asset.uploaderId === user.id) : [],
    [user]
  );

  // TODO: Replace with database query - GET /api/users/:userId/likes
  const likedAssetIds = React.useMemo(
    () => user ? getLikedAssetIds(user.id) : [],
    [user]
  );

  const likedAssets = React.useMemo(
    () => assets.filter(asset => likedAssetIds.includes(asset.id)),
    [likedAssetIds]
  );

  // Get user's team if they have one
  const userTeam = React.useMemo(
    () => user?.teamId ? teams.find(t => t.id === user.teamId) : undefined,
    [user]
  );

  // Check if viewing own profile
  const isOwnProfile = user ? currentUser.id === user.id : false;

  // Issue #9 Fix: Add loading state - Moved AFTER all hooks
  if (!username) {
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
        user={user}
        team={userTeam}
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
                  <Button asChild variant="cosmos">
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
                  <Button asChild variant="cosmos">
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
                  <Button asChild variant="cosmos">
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
