"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, Image as ImageIcon, Hash, Users, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SEARCH_CONSTANTS } from "@/lib/constants/search";
import type { Asset, Stream, User } from "@/lib/types/database";

// Suggestion item type
type SuggestionItem = {
  type: "recent" | "asset" | "stream" | "user" | "viewAll";
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  thumbnail?: string;
  subtitle?: string;
  data?: Asset | Stream | User;
};

// Memoized suggestion item components
interface SuggestionItemProps {
  suggestion: SuggestionItem;
  isSelected: boolean;
  onSelect: (suggestion: SuggestionItem) => void;
  index: number; // Global index for scroll targeting
}

const AssetSuggestionItem = React.memo(function AssetSuggestionItem({
  suggestion,
  isSelected,
  onSelect,
  index,
}: SuggestionItemProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent input blur
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  return (
    <button
      role="option"
      aria-selected={isSelected}
      onMouseDown={handleMouseDown}
      data-suggestion-index={index}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors cursor-pointer",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
        <img 
          src={suggestion.thumbnail} 
          alt={suggestion.label}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{suggestion.label}</div>
        {suggestion.subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            by {suggestion.subtitle}
          </div>
        )}
      </div>
      <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
});

const UserSuggestionItem = React.memo(function UserSuggestionItem({
  suggestion,
  isSelected,
  onSelect,
  index,
}: SuggestionItemProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent input blur
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  return (
    <button
      role="option"
      aria-selected={isSelected}
      onMouseDown={handleMouseDown}
      data-suggestion-index={index}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors cursor-pointer",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <img 
          src={suggestion.thumbnail} 
          alt={suggestion.label}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{suggestion.label}</div>
        {suggestion.subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {suggestion.subtitle}
          </div>
        )}
      </div>
      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
});

const DefaultSuggestionItem = React.memo(function DefaultSuggestionItem({
  suggestion,
  isSelected,
  onSelect,
  index,
}: SuggestionItemProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent input blur
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  return (
    <button
      role="option"
      aria-selected={isSelected}
      onMouseDown={handleMouseDown}
      data-suggestion-index={index}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors cursor-pointer",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <span className="text-muted-foreground flex-shrink-0">{suggestion.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{suggestion.label}</div>
        {suggestion.subtitle && (
          <div className="text-xs text-muted-foreground truncate line-clamp-1">
            {suggestion.subtitle}
          </div>
        )}
      </div>
      {suggestion.type === "viewAll" && (
        <span className="text-xs text-muted-foreground flex-shrink-0">→</span>
      )}
    </button>
  );
});

// Recent search item with individual remove button
interface RecentSearchItemProps {
  suggestion: SuggestionItem;
  isSelected: boolean;
  onSelect: (suggestion: SuggestionItem) => void;
  onRemove?: (query: string) => void;
  index: number; // Global index for scroll targeting
}

const RecentSearchItem = React.memo(function RecentSearchItem({
  suggestion,
  isSelected,
  onSelect,
  onRemove,
  index,
}: RecentSearchItemProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  const handleRemove = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.(suggestion.label);
  }, [onRemove, suggestion.label]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-suggestion-index={index}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors group",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <button
        onMouseDown={handleMouseDown}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
      >
        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{suggestion.label}</span>
      </button>
      {onRemove && (
        <button
          onMouseDown={handleRemove}
          aria-label={`Remove "${suggestion.label}" from recent searches`}
          className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (query: string) => void;
  recentSearches: string[];
  onClearRecentSearches?: () => void;
  onRemoveRecentSearch?: (query: string) => void;
}

export function SearchSuggestions({
  query,
  isOpen,
  onClose,
  onSelect,
  recentSearches,
  onClearRecentSearches,
  onRemoveRecentSearch,
}: SearchSuggestionsProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Search results from API
  const [results, setResults] = React.useState<{
    assets: Asset[];
    streams: Stream[];
    users: User[];
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Popular streams for empty state suggestions
  const [popularStreams, setPopularStreams] = React.useState<Stream[]>([]);

  // Fetch popular streams when showing empty state
  React.useEffect(() => {
    // Only fetch if no query and no recent searches (empty state)
    if (query.trim() || recentSearches.length > 0 || !isOpen) {
      return;
    }

    const fetchPopularStreams = async () => {
      try {
        const res = await fetch('/api/streams?limit=5');
        const data = await res.json();
        setPopularStreams(data.streams?.slice(0, 5) || []);
      } catch (error) {
        console.error('[SearchSuggestions] Failed to fetch popular streams:', error);
      }
    };

    fetchPopularStreams();
  }, [query, recentSearches.length, isOpen]);

  // Fetch search results from API
  React.useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('q', query.trim());
        // Limit results for suggestions dropdown
        params.append('limit', '5');
        
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        
        // Use total from API (actual count, not limited results count)
        setResults({
          assets: data.assets || [],
          streams: data.streams || [],
          users: data.users || [],
          total: data.total || 0,
        });
      } catch (error) {
        console.error('[SearchSuggestions] Failed to fetch search results:', error);
        setResults({ assets: [], streams: [], users: [], total: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Build suggestions list with full data for rendering
  const { suggestions, hasAssets, hasStreams, hasUsers } = React.useMemo(() => {
    const items: SuggestionItem[] = [];
    let assetCount = 0;
    let streamCount = 0;
    let userCount = 0;

    // Show recent searches if no query
    if (!query.trim() && recentSearches.length > 0) {
      recentSearches.slice(0, SEARCH_CONSTANTS.MAX_RECENT_SEARCHES_SHOWN).forEach((search) => {
        items.push({
          type: "recent",
          id: `recent-${search}`,
          label: search,
          icon: <Clock className="h-4 w-4" />,
        });
      });
      return { suggestions: items, hasAssets: false, hasStreams: false, hasUsers: false };
    }

    // Show search results
    if (results) {
      // Assets - with thumbnails!
      const assetItems = results.assets.slice(0, SEARCH_CONSTANTS.MAX_ASSET_SUGGESTIONS);
      assetCount = assetItems.length;
      assetItems.forEach((asset) => {
        items.push({
          type: "asset",
          id: asset.id,
          label: asset.title,
          href: `/e/${asset.id}`,
          thumbnail: asset.url,
          subtitle: asset.uploader?.display_name,
          data: asset,
        });
      });

      // Streams - with hash icon
      const streamItems = results.streams.slice(0, SEARCH_CONSTANTS.MAX_STREAM_SUGGESTIONS);
      streamCount = streamItems.length;
      streamItems.forEach((stream) => {
        items.push({
          type: "stream",
          id: stream.id,
          label: stream.name,
          href: `/stream/${stream.name}`,
          icon: <Hash className="h-4 w-4" />,
          subtitle: stream.description || 'Stream',
          data: stream,
        });
      });

      // Users - with avatars
      const userItems = results.users.slice(0, SEARCH_CONSTANTS.MAX_USER_SUGGESTIONS);
      userCount = userItems.length;
      userItems.forEach((user) => {
        items.push({
          type: "user",
          id: user.id,
          label: user.display_name,
          href: `/u/${user.username}`,
          thumbnail: user.avatar_url,
          subtitle: `@${user.username}`,
        });
      });

      // "View all results" if we have results
      if (results.total > 0) {
        items.push({
          type: "viewAll",
          id: "view-all",
          label: `View all ${results.total} results`,
          href: `/search?q=${encodeURIComponent(query)}`,
          icon: <Search className="h-4 w-4" />,
        });
      }
    }

    return { 
      suggestions: items, 
      hasAssets: assetCount > 0, 
      hasStreams: streamCount > 0, 
      hasUsers: userCount > 0 
    };
  }, [query, results, recentSearches]);

  // Reset selected index when suggestions change
  // Using suggestions array (not just length) to handle content changes with same count
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = React.useCallback((suggestion: typeof suggestions[0]) => {
    if (suggestion.type === "recent") {
      onSelect(suggestion.label);
    } else if (suggestion.href) {
      router.push(suggestion.href);
      onClose();
    }
  }, [router, onClose, onSelect]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const suggestion = suggestions[selectedIndex];
            handleSelectSuggestion(suggestion);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, suggestions, onClose, handleSelectSuggestion]);

  // Scroll selected item into view
  // Use data attribute to find correct element since DOM includes section headers
  React.useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.querySelector(
        `[data-suggestion-index="${selectedIndex}"]`
      ) as HTMLElement;
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Get categorized suggestions for section rendering
  const assetSuggestions = suggestions.filter(s => s.type === "asset");
  const streamSuggestions = suggestions.filter(s => s.type === "stream");
  const userSuggestions = suggestions.filter(s => s.type === "user");
  const viewAllSuggestion = suggestions.find(s => s.type === "viewAll");
  const recentSuggestions = suggestions.filter(s => s.type === "recent");

  // Calculate indices for keyboard navigation
  const getGlobalIndex = (suggestion: SuggestionItem) => suggestions.indexOf(suggestion);

  // Section header component
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
      {title}
    </div>
  );

  return (
    <div 
      id="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-[500px] overflow-y-auto"
    >
      <div ref={suggestionsRef} className="py-1">
        {/* Empty state - no query and no recent searches */}
        {!query.trim() && recentSearches.length === 0 && (
          <div className="px-3 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              Popular Streams
            </div>
            {popularStreams.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularStreams.map((stream) => (
                  <button
                    key={stream.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      router.push(`/stream/${stream.name}`);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-full transition-colors cursor-pointer"
                  >
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {stream.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No streams yet
              </div>
            )}
          </div>
        )}

        {/* Recent searches with clear all */}
        {!query.trim() && recentSearches.length > 0 && (
          <>
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Searches
              </span>
              {onClearRecentSearches && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onClearRecentSearches();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            {recentSuggestions.map((suggestion) => (
              <RecentSearchItem
                key={suggestion.id}
                suggestion={suggestion}
                isSelected={selectedIndex === getGlobalIndex(suggestion)}
                onSelect={handleSelectSuggestion}
                onRemove={onRemoveRecentSearch}
                index={getGlobalIndex(suggestion)}
              />
            ))}
          </>
        )}
        
        {/* Loading state */}
        {isLoading && query.trim() ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Searching...
            </div>
          </div>
        ) : suggestions.length === 0 && query.trim() ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results found for &quot;{query}&quot;
          </div>
        ) : query.trim() && (
          <>
            {/* Assets section */}
            {hasAssets && (
              <>
                <SectionHeader title="Assets" />
                {assetSuggestions.map((suggestion) => (
                  <AssetSuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    isSelected={selectedIndex === getGlobalIndex(suggestion)}
                    onSelect={handleSelectSuggestion}
                    index={getGlobalIndex(suggestion)}
                  />
                ))}
              </>
            )}

            {/* Streams section */}
            {hasStreams && (
              <>
                <SectionHeader title="Streams" />
                {streamSuggestions.map((suggestion) => (
                  <DefaultSuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    isSelected={selectedIndex === getGlobalIndex(suggestion)}
                    onSelect={handleSelectSuggestion}
                    index={getGlobalIndex(suggestion)}
                  />
                ))}
              </>
            )}

            {/* Users section */}
            {hasUsers && (
              <>
                <SectionHeader title="People" />
                {userSuggestions.map((suggestion) => (
                  <UserSuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    isSelected={selectedIndex === getGlobalIndex(suggestion)}
                    onSelect={handleSelectSuggestion}
                    index={getGlobalIndex(suggestion)}
                  />
                ))}
              </>
            )}

            {/* View all results */}
            {viewAllSuggestion && (
              <div className="border-t border-border mt-1 pt-1">
                <DefaultSuggestionItem
                  suggestion={viewAllSuggestion}
                  isSelected={selectedIndex === getGlobalIndex(viewAllSuggestion)}
                  onSelect={handleSelectSuggestion}
                  index={getGlobalIndex(viewAllSuggestion)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

