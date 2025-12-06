"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserCard } from "@/components/users/user-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 12;

interface UserWithDetails {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  job_title?: string;
  location?: string;
  followerCount?: number;
  recentAssets?: Array<{
    id: string;
    title: string;
    thumbnail_url?: string;
    url?: string;
  }>;
  streams?: Array<{
    id: string;
    name: string;
    is_private: boolean;
  }>;
  totalStreams?: number;
}

async function fetchUsers(
  pageParam: number
): Promise<{ users: UserWithDetails[]; hasMore: boolean; total: number }> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(pageParam * PAGE_SIZE),
  });

  const response = await fetch(`/api/users?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export default function PeoplePage() {
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [followingMap, setFollowingMap] = React.useState<Map<string, boolean>>(new Map());
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Fetch current user
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Fetch who the current user follows
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        
        if (follows) {
          const map = new Map<string, boolean>();
          follows.forEach(f => map.set(f.following_id, true));
          setFollowingMap(map);
        }
      }
    };
    fetchCurrentUser();
  }, []);

  // Infinite query for users
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["people"],
    queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined;
    },
    initialPageParam: 0,
  });

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers = data?.pages.flatMap((page) => page.users) || [];

  // Handle follow/unfollow - memoized to prevent unnecessary UserCard re-renders
  const handleFollow = React.useCallback(async (username: string, isCurrentlyFollowing: boolean, userId: string) => {
    const response = await fetch(`/api/users/${username}/follow`, {
      method: isCurrentlyFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to toggle follow");
    }

    // Update local state using userId directly
    setFollowingMap(prev => {
      const newMap = new Map(prev);
      if (isCurrentlyFollowing) {
        newMap.delete(userId);
      } else {
        newMap.set(userId, true);
      }
      return newMap;
    });
  }, []);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-8 space-y-3">
        <h1 className="text-4xl font-bold text-foreground">People</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Discover designers, creators, and teams. Follow their work and get inspired.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-destructive">
            {error instanceof Error ? error.message : "Failed to load users"}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && allUsers.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">No people yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Be the first to join!
          </p>
        </div>
      )}

      {/* Users Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      {!isLoading && !isError && allUsers.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {allUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUserId || undefined}
                isFollowing={followingMap.get(user.id) || false}
                onFollow={handleFollow}
              />
            ))}
          </div>

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

