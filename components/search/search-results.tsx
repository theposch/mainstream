"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchResultsTabs, SearchTab } from "./search-results-tabs";
import { SearchEmptyState } from "./search-empty-state";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { StreamGrid } from "@/components/streams/stream-grid";
import { useSearch } from "@/lib/contexts/search-context";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import type { Asset, Stream, User } from "@/lib/types/database";

interface SearchResultsProps {
  initialQuery: string;
}

export function SearchResults({ initialQuery }: SearchResultsProps) {
  const { query, setQuery, recentSearches, clearSearch } = useSearch();
  const [activeTab, setActiveTab] = React.useState<SearchTab>("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    assets: Asset[];
    streams: Stream[];
    users: User[];
    total: number;
  }>({
    assets: [],
    streams: [],
    users: [],
    total: 0,
  });

  // Sync initial query from URL with context on mount only
  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Fetch search results from API
  React.useEffect(() => {
    // Don't search if no query
    if (!query.trim()) {
      setResults({ assets: [], streams: [], users: [], total: 0 });
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
          // Text search - use search API
          const params = new URLSearchParams();
          if (query.trim()) params.append('q', query.trim());
          
          const res = await fetch(`/api/search?${params}`);
          const data = await res.json();
          
          const total = (data.assets?.length || 0) + 
                       (data.streams?.length || 0) + 
                       (data.users?.length || 0);
          
          setResults({
            assets: data.assets || [],
            streams: data.streams || [],
            users: data.users || [],
            total,
          });
      } catch (error) {
        console.error('Search failed:', error);
        setResults({ assets: [], streams: [], users: [], total: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // Tab counts
  const counts = {
    all: results.total,
    assets: results.assets.length,
    streams: results.streams.length,
    users: results.users.length,
  };

  // Render content based on active tab
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Searching...</p>
        </div>
      );
    }

    if (results.total === 0) {
      return (
        <SearchEmptyState
          query={query}
          recentSearches={recentSearches}
          onClearSearch={clearSearch}
          onSelectRecent={(recentQuery) => setQuery(recentQuery)}
        />
      );
    }

    switch (activeTab) {
      case "all":
        return (
          <div className="space-y-12">
            {results.assets.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Assets</h2>
                  <button
                    onClick={() => setActiveTab("assets")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all {results.assets.length} →
                  </button>
                </div>
                <MasonryGrid assets={results.assets.slice(0, 12)} />
              </section>
            )}

            {results.streams.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Streams</h2>
                  <button
                    onClick={() => setActiveTab("streams")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all {results.streams.length} →
                  </button>
                </div>
                <StreamGrid streams={results.streams.slice(0, 6)} />
              </section>
            )}

            {results.users.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Users</h2>
                  <button
                    onClick={() => setActiveTab("users")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all {results.users.length} →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.users.slice(0, 8).map((user) => (
                    <Link
                      key={user.id}
                      href={`/u/${user.username}`}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-input hover:bg-muted/50 transition-all"
                    >
                      <Avatar className="h-10 w-10">
                        <img src={user.avatar_url} alt={user.display_name} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.display_name}</div>
                        <div className="text-sm text-muted-foreground truncate">@{user.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        );

      case "assets":
        return <MasonryGrid assets={results.assets} />;

      case "streams":
        return <StreamGrid streams={results.streams} />;

      case "users":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.users.map((user) => (
              <Link
                key={user.id}
                href={`/u/${user.username}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-input hover:bg-muted/50 transition-all"
              >
                <Avatar className="h-12 w-12">
                  <img src={user.avatar_url} alt={user.display_name} />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.display_name}</div>
                  <div className="text-sm text-muted-foreground truncate">@{user.username}</div>
                  {user.bio && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">{user.bio}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        );
    }
  };

  // Check if we have any search criteria
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">Start searching</h3>
        <p className="text-muted-foreground">
          Enter a search term to find assets, streams, and users
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              Search results for &quot;{query}&quot;
            </h1>
            <p className="text-muted-foreground">
              Found {results.total} result{results.total !== 1 ? 's' : ''}
            </p>
      </div>

      <SearchResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      <div className="mt-8">{renderContent()}</div>
    </div>
  );
}

