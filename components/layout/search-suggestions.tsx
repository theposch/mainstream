"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Search, Image as ImageIcon, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SEARCH_CONSTANTS } from "@/lib/constants/search";

// Types for database records
interface Asset {
  id: string;
  title: string;
  url: string;
  uploader_id: string;
  uploader?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
}

interface Stream {
  id: string;
  name: string;
  description?: string;
  owner_type: string;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (query: string) => void;
  recentSearches: string[];
}

export function SearchSuggestions({
  query,
  isOpen,
  onClose,
  onSelect,
  recentSearches,
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
  const suggestions = React.useMemo(() => {
    const items: Array<{
      type: "recent" | "asset" | "stream" | "user" | "viewAll";
      id: string;
      label: string;
      href?: string;
      icon?: React.ReactNode;
      thumbnail?: string;
      subtitle?: string;
      data?: Asset | Stream | User;
    }> = [];

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
      return items;
    }

    // Show search results
    if (results) {
      // Assets - with thumbnails!
      results.assets.slice(0, SEARCH_CONSTANTS.MAX_ASSET_SUGGESTIONS).forEach((asset) => {
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
      results.streams.slice(0, SEARCH_CONSTANTS.MAX_STREAM_SUGGESTIONS).forEach((stream) => {
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
      results.users.slice(0, SEARCH_CONSTANTS.MAX_USER_SUGGESTIONS).forEach((user) => {
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

    return items;
  }, [query, results, recentSearches]);

  // Reset selected index when suggestions change
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions.length, query]);

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
  }, [isOpen, selectedIndex, suggestions.length, onClose, handleSelectSuggestion]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      id="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-[500px] overflow-y-auto"
    >
      <div ref={suggestionsRef} className="py-2">
        {!query.trim() && recentSearches.length > 0 && (
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Recent Searches
          </div>
        )}
        
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
        ) : (
          suggestions.map((suggestion, index) => {
            // Render asset with thumbnail
            if (suggestion.type === "asset" && suggestion.thumbnail) {
              return (
                <button
                  key={suggestion.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                    "hover:bg-accent",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                  <img 
                    src={suggestion.thumbnail} 
                    alt={suggestion.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
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
          }

          // Render user with avatar
          if (suggestion.type === "user" && suggestion.thumbnail) {
            return (
              <button
                key={suggestion.id}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                  "hover:bg-accent",
                  selectedIndex === index && "bg-accent"
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <img 
                    src={suggestion.thumbnail} 
                    alt={suggestion.label}
                    onError={(e) => {
                      // Fallback if image fails to load
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
          }

          // Render other types (recent, stream, viewAll)
          return (
            <button
              key={suggestion.id}
              role="option"
              aria-selected={selectedIndex === index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                "hover:bg-accent",
                selectedIndex === index && "bg-accent"
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
        })
        )}
      </div>
    </div>
  );
}

