import * as React from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchEmptyStateProps {
  query: string;
  recentSearches?: string[];
  onClearSearch?: () => void;
  onSelectRecent?: (query: string) => void;
}

export function SearchEmptyState({
  query,
  recentSearches = [],
  onClearSearch,
  onSelectRecent,
}: SearchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No results found</h3>
      
      <p className="text-muted-foreground mb-6">
        We couldn&apos;t find any results for <span className="font-medium text-foreground">&quot;{query}&quot;</span>
      </p>

      <div className="space-y-3 text-sm text-muted-foreground text-left w-full">
        <p className="font-medium">Try:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Checking your spelling</li>
          <li>Using different keywords</li>
          <li>Using more general terms</li>
        </ul>
      </div>

      {recentSearches.length > 0 && (
        <div className="mt-8 w-full">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Recent searches
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((search) => (
              <button
                key={search}
                onClick={() => onSelectRecent?.(search)}
                className="px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {onClearSearch && (
        <Button
          variant="default"
          onClick={onClearSearch}
          className="mt-6"
        >
          Clear search
        </Button>
      )}
    </div>
  );
}



