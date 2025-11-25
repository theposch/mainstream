"use client";

import * as React from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { SEARCH_CONSTANTS } from "@/lib/constants/search";
import {
  getRecentColors,
  addRecentColor as addRecentColorUtil,
  clearRecentColors as clearRecentColorsUtil,
} from "@/lib/utils/color";

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  isSearching: boolean; // Future: API loading state
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  clearSearch: () => void;
  // Color search
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  recentColors: string[];
  addRecentColor: (color: string) => void;
  clearRecentColors: () => void;
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  // Get initial query from URL params (only on mount)
  const [query, setQueryState] = React.useState<string>(() => {
    if (typeof window === 'undefined') return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [isSearching] = React.useState(false); // Future: API loading state
  
  // Color search state
  const [selectedColor, setSelectedColorState] = React.useState<string | null>(null);
  const [recentColors, setRecentColors] = React.useState<string[]>([]);
  
  // Debounce the query for performance (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches and colors from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
      
      // Load recent colors
      const colors = getRecentColors();
      setRecentColors(colors);
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    }
  }, []);

  // NOTE: We DON'T auto-sync between URL and query state in the context
  // This prevents:
  // 1. Constant recompilation (performance issue)
  // 2. Query being reset on home page where there's no URL param (typing issue)
  // 
  // Instead:
  // - On home page: query state is independent, enables real-time filtering
  // - On search results page: SearchResults component syncs URL → query on mount
  // - URL updates happen only on explicit navigation (Enter key, clicking suggestions)

  const setQuery = React.useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const addRecentSearch = React.useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      // Remove if already exists (move to front)
      const filtered = prev.filter((s) => s !== trimmed);
      // Add to front and limit to max
      const updated = [trimmed, ...filtered].slice(0, SEARCH_CONSTANTS.MAX_RECENT_SEARCHES_STORED);
      
      // Save to localStorage
      try {
        localStorage.setItem(SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save recent searches:", error);
      }
      
      return updated;
    });
  }, []);

  const clearRecentSearches = React.useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(SEARCH_CONSTANTS.RECENT_SEARCHES_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear recent searches:", error);
    }
  }, []);

  const clearSearch = React.useCallback(() => {
    setQueryState("");
  }, []);

  const setSelectedColor = React.useCallback((color: string | null) => {
    setSelectedColorState(color);
  }, []);

  const addRecentColor = React.useCallback((color: string) => {
    addRecentColorUtil(color);
    // Update state to reflect changes
    setRecentColors(getRecentColors());
  }, []);

  const clearRecentColors = React.useCallback(() => {
    clearRecentColorsUtil();
    setRecentColors([]);
  }, []);

  const value = React.useMemo(
    () => ({
      query,
      setQuery,
      debouncedQuery,
      isSearching,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
      clearSearch,
      selectedColor,
      setSelectedColor,
      recentColors,
      addRecentColor,
      clearRecentColors,
    }),
    [query, setQuery, debouncedQuery, isSearching, recentSearches, addRecentSearch, clearRecentSearches, clearSearch, selectedColor, setSelectedColor, recentColors, addRecentColor, clearRecentColors]
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = React.useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

// TODO: Future enhancements when backend is implemented:
// - Add results caching: results: SearchResults | null
// - Add error handling: error: Error | null
// - Add API call function: searchAPI: (query: string) => Promise<void>
// - Add cache management: clearCache: () => void
// - Sync recent searches with backend user preferences

