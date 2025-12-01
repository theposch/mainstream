"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/contexts/search-context";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { SearchSuggestions } from "./search-suggestions";

export function SearchBar() {
  const router = useRouter();
  const { query, setQuery, recentSearches, addRecentSearch } = useSearch();
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useClickOutside(containerRef, () => {
    setShowSuggestions(false);
  }, showSuggestions);

  // Cmd+K to focus search
  useKeyboardShortcut(["Meta", "k"], () => {
    inputRef.current?.focus();
  });

  // Ctrl+K for Windows/Linux
  useKeyboardShortcut(["Control", "k"], () => {
    inputRef.current?.focus();
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.trim()) {
      setShowSuggestions(true);
    } else {
      // Close suggestions if query is empty
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    setIsInputFocused(true);
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setIsInputFocused(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addRecentSearch(query);
      setShowSuggestions(false);
      inputRef.current?.blur();
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (selectedQuery: string) => {
    setQuery(selectedQuery);
    addRecentSearch(selectedQuery);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={cn(
      "relative max-w-sm w-full mx-auto group transition-all duration-300 ease-out",
      isInputFocused && "max-w-lg"
    )}>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          "relative flex items-center w-full h-10 rounded-full bg-muted/50 border border-border hover:border-input hover:bg-muted transition-all duration-200 overflow-hidden cursor-text",
          isInputFocused && "border-ring ring-ring/50 ring-[3px]"
        )}>
          <div className="flex items-center pl-3 pointer-events-none">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 px-3"
            placeholder="Try 'luxury product packaging'"
            aria-label="Search"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-controls="search-suggestions"
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mr-1"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && (
        <SearchSuggestions
          query={query}
          isOpen={showSuggestions}
          onClose={() => setShowSuggestions(false)}
          onSelect={handleSelectSuggestion}
          recentSearches={recentSearches}
        />
      )}
    </div>
  );
}
