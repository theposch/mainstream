"use client";

import * as React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { UserCard } from "@/components/users/user-card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import type { UserWithDetails } from "@/lib/types/database";

const PAGE_SIZE = 12;

type Tab = "all" | "following";

interface UsersResponse {
  users: UserWithDetails[];
  hasMore: boolean;
  total: number;
}

async function fetchUsers(
  pageParam: number,
  filter?: "following"
): Promise<UsersResponse> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(pageParam * PAGE_SIZE),
  });

  if (filter) {
    params.set("filter", filter);
  }

  const response = await fetch(`/api/users?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

interface PeoplePageClientProps {
  currentUserId: string | null;
  initialFollowingMap: Map<string, boolean>;
}

export function PeoplePageClient({
  currentUserId,
  initialFollowingMap,
}: PeoplePageClientProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("all");
  const [followingMap, setFollowingMap] = React.useState<Map<string, boolean>>(
    initialFollowingMap
  );
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Query for "All People" tab
  const allPeopleQuery = useInfiniteQuery({
    queryKey: ["people", "all"],
    queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query for "Following" tab
  const followingQuery = useInfiniteQuery({
    queryKey: ["people", "following"],
    queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam, "following"),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
    initialPageParam: 0,
    enabled: activeTab === "following", // Only fetch when tab is active
    staleTime: 1000 * 60 * 5,
  });

  // Select active query based on tab
  const activeQuery = activeTab === "all" ? allPeopleQuery : followingQuery;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = activeQuery;

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

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers = data?.pages.flatMap((page) => page.users) || [];

  // Handle follow/unfollow with cache invalidation
  const handleFollow = React.useCallback(
    async (username: string, isCurrentlyFollowing: boolean, userId: string) => {
      const response = await fetch(`/api/users/${username}/follow`, {
        method: isCurrentlyFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle follow");
      }

      // Update local state
      setFollowingMap((prev) => {
        const newMap = new Map(prev);
        if (isCurrentlyFollowing) {
          newMap.delete(userId);
        } else {
          newMap.set(userId, true);
        }
        return newMap;
      });

      // Invalidate following query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["people", "following"] });
    },
    [queryClient]
  );

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Tabs Row */}
      <div className="mb-8 flex items-center justify-between">
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="People content"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "all"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All People
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "following"}
            onClick={() => setActiveTab("following")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "following"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Following
          </button>
        </div>
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

      {/* Empty State - All People */}
      {!isLoading &&
        !isError &&
        allUsers.length === 0 &&
        activeTab === "all" && (
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

      {/* Empty State - Following */}
      {!isLoading &&
        !isError &&
        allUsers.length === 0 &&
        activeTab === "following" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              You&apos;re not following anyone yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Follow designers and creators to see them here. Discover inspiring
              work from the community.
            </p>
            <Button variant="default" size="lg" onClick={() => setActiveTab("all")}>
              <Users className="w-4 h-4 mr-2" />
              Browse All People
            </Button>
          </div>
        )}

      {/* Users Grid */}
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




