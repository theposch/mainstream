"use client";

import * as React from "react";
import { Check, Search, X, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface UserPickerProps {
  selectedUserIds: string[];
  onSelectUsers: (userIds: string[]) => void;
  maxUsers?: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "compact";
  /** Custom className for the popover (useful for z-index in dialogs) */
  popoverClassName?: string;
}

export function UserPicker({
  selectedUserIds,
  onSelectUsers,
  maxUsers = 20,
  disabled = false,
  className,
  variant = "default",
  popoverClassName,
}: UserPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [searchResults, setSearchResults] = React.useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = React.useRef(false);

  // Load initial users when popover opens
  React.useEffect(() => {
    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setIsLoading(true);
      
      fetch("/api/users?limit=50")
        .then((res) => res.json())
        .then((data) => {
          setAllUsers(data.users || []);
          setSearchResults(data.users || []);
        })
        .catch((err) => {
          console.error("[UserPicker] Failed to load users:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  // Fetch selected users' data when selectedUserIds change
  React.useEffect(() => {
    const fetchSelectedUsers = async () => {
      if (selectedUserIds.length === 0) {
        setSelectedUsers([]);
        return;
      }

      // Only fetch users we don't already have
      const missingIds = selectedUserIds.filter(
        (id) => !selectedUsers.find((u) => u.id === id)
      );

      if (missingIds.length === 0) {
        // Filter out deselected users
        setSelectedUsers((prev) =>
          prev.filter((u) => selectedUserIds.includes(u.id))
        );
        return;
      }

      try {
        // Try to find in all users or search results first
        const fetchedUsers: User[] = [];
        for (const userId of missingIds) {
          const fromAll = allUsers.find((u) => u.id === userId);
          const fromResults = searchResults.find((u) => u.id === userId);
          if (fromAll) {
            fetchedUsers.push(fromAll);
          } else if (fromResults) {
            fetchedUsers.push(fromResults);
          }
        }

        setSelectedUsers((prev) => {
          const existing = prev.filter((u) => selectedUserIds.includes(u.id));
          return [...existing, ...fetchedUsers];
        });
      } catch (error) {
        console.error("[UserPicker] Failed to fetch selected users:", error);
      }
    };

    fetchSelectedUsers();
  }, [selectedUserIds, allUsers, searchResults]);

  // Filter/search users
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If no search query, show all users
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);

    let isCancelled = false;
    const abortController = new AbortController();

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/users?search=${encodeURIComponent(searchQuery)}&limit=20`,
          { signal: abortController.signal }
        );

        if (isCancelled) return;

        if (response.ok) {
          const data = await response.json();
          if (!isCancelled) {
            setSearchResults(data.users || []);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[UserPicker] Search error:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      abortController.abort();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, allUsers]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  const toggleUser = React.useCallback(
    (user: User) => {
      if (disabled) return;

      const isSelected = selectedUserIds.includes(user.id);

      if (isSelected) {
        onSelectUsers(selectedUserIds.filter((id) => id !== user.id));
      } else {
        if (selectedUserIds.length >= maxUsers) {
          return;
        }
        onSelectUsers([...selectedUserIds, user.id]);
        // Add to selected users cache
        setSelectedUsers((prev) => {
          if (prev.find((u) => u.id === user.id)) return prev;
          return [...prev, user];
        });
      }
    },
    [selectedUserIds, onSelectUsers, maxUsers, disabled]
  );

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const user = searchResults[selectedIndex];
        if (user) {
          toggleUser(user);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, searchResults, selectedIndex, toggleUser]);

  const renderSelectionContent = () => (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search teammates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
          autoFocus
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-3">
          {searchResults.map((user, index) => {
            const isSelected = selectedUserIds.includes(user.id);
            const isMaxReached =
              selectedUserIds.length >= maxUsers && !isSelected;

            return (
              <button
                key={user.id}
                onClick={() => toggleUser(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                disabled={disabled || isMaxReached}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                  "hover:bg-secondary",
                  selectedIndex === index && "bg-secondary",
                  isSelected && "bg-secondary/50",
                  (disabled || isMaxReached) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(user.display_name || user.username)
                      ?.substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate text-foreground">
                      {user.display_name || user.username}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                )}
              </button>
            );
          })}

          {!isLoading && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery
                ? `No teammates found matching "${searchQuery}"`
                : "No teammates available"}
            </div>
          )}

          {isLoading && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading teammates...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {selectedUsers.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground font-normal"
                disabled={disabled}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                All teammates
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border rounded-full px-3 text-xs font-medium bg-zinc-900/50 border-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-600 text-zinc-400"
                disabled={disabled}
              >
                <UserIcon className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            )}
          </PopoverTrigger>
          <PopoverContent
            className={cn("w-[300px] p-3", popoverClassName)}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {renderSelectionContent()}
          </PopoverContent>
        </Popover>

        {selectedUsers.map((user) => (
          <div
            key={user.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border"
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {(user.display_name || user.username)
                  ?.substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">
              {user.display_name || user.username}
            </span>
            <button
              onClick={() => toggleUser(user)}
              className="ml-0.5 p-0.5 rounded-full hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">
                Remove {user.display_name || user.username}
              </span>
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Teammates
            <span className="text-muted-foreground ml-1">
              ({selectedUserIds.length}/{maxUsers})
            </span>
          </label>
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                  "bg-primary/10 text-primary",
                  "hover:bg-primary/20 transition-colors",
                  "border border-primary/20",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(user.display_name || user.username)
                      ?.substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{user.display_name || user.username}</span>
                <span className="ml-1 text-primary/60">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
        {renderSelectionContent()}
      </div>
    </div>
  );
}

