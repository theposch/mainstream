"use client";

import * as React from "react";
import { Check, Search, Plus, Hash, X } from "lucide-react";
import { STREAM_VALIDATION } from "@/lib/constants/streams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Stream {
  id: string;
  name: string;
  description?: string;
  status: string;
  owner_type: string;
  owner_id: string;
}

interface StreamPickerProps {
  selectedStreamIds: string[];
  onSelectStreams: (streamIds: string[]) => void;
  pendingStreamNames?: string[]; // Streams that will be created on post
  onPendingStreamsChange?: (names: string[]) => void;
  excludedStreamNames?: string[]; // Streams user removed (prevents auto-sync re-adding)
  onExcludedStreamsChange?: (names: string[]) => void;
  maxStreams?: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "compact";
}

export function StreamPicker({
  selectedStreamIds,
  onSelectStreams,
  pendingStreamNames = [],
  onPendingStreamsChange,
  excludedStreamNames = [],
  onExcludedStreamsChange,
  maxStreams = STREAM_VALIDATION.MAX_STREAMS_PER_ASSET,
  disabled = false,
  className,
  variant = "default",
}: StreamPickerProps) {
  // Import streams internally instead of as prop
  const [allStreams, setAllStreams] = React.useState<Stream[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Load streams from API
  const loadStreams = React.useCallback(async () => {
      try {
        const res = await fetch('/api/streams');
        if (!res.ok) {
          throw new Error('Failed to load streams');
        }
        const data = await res.json();
        setAllStreams(data.streams || []);
      } catch (error) {
        console.error('[StreamPicker] Failed to load streams:', error);
        setAllStreams([]);
      }
  }, []);
    
  React.useEffect(() => {
    loadStreams();
  }, [loadStreams]);

  // Refresh streams if we detect a selected ID that we don't have
  React.useEffect(() => {
    const missingIds = selectedStreamIds.filter(id => 
      !allStreams.find(s => s.id === id)
    );
    
    if (missingIds.length > 0) {
      console.log('[StreamPicker] Detected missing stream IDs, refreshing...', missingIds);
      loadStreams();
    }
  }, [selectedStreamIds, allStreams, loadStreams]);

  // Filter active streams only (memoized for performance)
  const activeStreams = React.useMemo(() => 
    allStreams.filter(s => s.status === 'active'),
    [allStreams]
  );

  // Filter streams by search query
  const filteredStreams = React.useMemo(() => {
    if (!searchQuery.trim()) return activeStreams;
    
    const lowerQuery = searchQuery.toLowerCase();
    return activeStreams.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery)
    );
  }, [activeStreams, searchQuery]);

  // Validate stream name format (same as useStreamMentions)
  const isValidStreamName = React.useCallback((name: string): boolean => {
    const slug = name.toLowerCase().trim();
    if (slug.length < 2 || slug.length > 50) return false;
    // Same regex as useStreamMentions: alphanumeric + hyphens
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }, []);

  // Normalize and check for exact match
  const normalizedQuery = React.useMemo(() => 
    searchQuery.toLowerCase().trim(),
    [searchQuery]
  );

  const exactMatch = React.useMemo(() => {
    return filteredStreams.some(s => s.name === normalizedQuery);
  }, [filteredStreams, normalizedQuery]);

  // Show create option if query is valid and doesn't match exactly
  const showCreateOption = React.useMemo(() => {
    return normalizedQuery.length >= 2 && 
           !exactMatch && 
           isValidStreamName(normalizedQuery);
  }, [normalizedQuery, exactMatch, isValidStreamName]);

  // Combined list: existing streams + create option
  const allOptions = React.useMemo(() => [
    ...filteredStreams,
    ...(showCreateOption ? [{
      id: '__create__',
      name: normalizedQuery,
      status: 'pending' as const,
      owner_type: 'user',
      owner_id: '',
      isNew: true,
    }] : [])
  ], [filteredStreams, showCreateOption, normalizedQuery]);

  // Reset selected index when options change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [allOptions.length, searchQuery]);

  // Refs for keyboard navigation
  const allOptionsRef = React.useRef(allOptions);
  const selectedIndexRef = React.useRef(selectedIndex);
  
  React.useEffect(() => {
    allOptionsRef.current = allOptions;
    selectedIndexRef.current = selectedIndex;
  }, [allOptions, selectedIndex]);

  const toggleStream = React.useCallback((streamId: string, isPending: boolean = false) => {
    if (disabled) return;

    const totalSelected = selectedStreamIds.length + pendingStreamNames.length;

    if (isPending) {
      // Handle pending stream toggle
      const streamName = streamId.replace('pending-', '');
      const isSelected = pendingStreamNames.includes(streamName);
    
    if (isSelected) {
        // Remove pill AND add to excluded list (prevents auto-sync re-adding)
        if (onPendingStreamsChange) {
          onPendingStreamsChange(pendingStreamNames.filter(name => name !== streamName));
        }
        if (onExcludedStreamsChange && !excludedStreamNames.includes(streamName)) {
          onExcludedStreamsChange([...excludedStreamNames, streamName]);
        }
      } else {
        // Add pill (and remove from excluded if present)
        if (totalSelected >= maxStreams) {
        return;
      }
        if (onPendingStreamsChange) {
          onPendingStreamsChange([...pendingStreamNames, streamName]);
        }
        if (onExcludedStreamsChange && excludedStreamNames.includes(streamName)) {
          onExcludedStreamsChange(excludedStreamNames.filter(n => n !== streamName));
        }
      }
    } else {
      // Handle real stream toggle
      const isSelected = selectedStreamIds.includes(streamId);
      
      if (isSelected) {
        // Remove pill AND add to excluded list (prevents auto-sync re-adding)
        onSelectStreams(selectedStreamIds.filter(id => id !== streamId));
        const stream = allStreams.find(s => s.id === streamId);
        if (stream && onExcludedStreamsChange && !excludedStreamNames.includes(stream.name)) {
          onExcludedStreamsChange([...excludedStreamNames, stream.name]);
        }
      } else {
        // Add pill (and remove from excluded if present)
        if (totalSelected >= maxStreams) {
        return;
      }
      onSelectStreams([...selectedStreamIds, streamId]);
        const stream = allStreams.find(s => s.id === streamId);
        if (stream && onExcludedStreamsChange && excludedStreamNames.includes(stream.name)) {
          onExcludedStreamsChange(excludedStreamNames.filter(n => n !== stream.name));
        }
      }
    }
  }, [selectedStreamIds, pendingStreamNames, onSelectStreams, onPendingStreamsChange, maxStreams, disabled, excludedStreamNames, onExcludedStreamsChange, allStreams]);

  // Handle stream selection (both existing and new)
  const handleSelectStream = React.useCallback((
    streamId: string,
    isNew: boolean,
    streamName?: string
  ) => {
    if (disabled) return;

    const totalSelected = selectedStreamIds.length + pendingStreamNames.length;

    if (isNew && streamName) {
      // Creating new stream (pending - not in DB yet)
      const slug = streamName.toLowerCase();
      
      // Check if already exists
      const alreadyPending = pendingStreamNames.includes(slug);
      const alreadyReal = activeStreams.some(s => s.name === slug);
      const isExcluded = excludedStreamNames.includes(slug);
      
      if (alreadyPending || alreadyReal) {
        console.log('[StreamPicker] Stream already added:', slug);
        setSearchQuery("");
        setOpen(false);
        return;
      }
      
      if (isExcluded) {
        // User previously removed this - remove from excluded list
        if (onExcludedStreamsChange) {
          onExcludedStreamsChange(excludedStreamNames.filter(n => n !== slug));
        }
      }
      
      // Check max streams
      if (totalSelected >= maxStreams) {
        console.log('[StreamPicker] Max streams reached');
        return;
      }
      
      // Add to pending (will be created on Post)
      if (onPendingStreamsChange) {
        onPendingStreamsChange([...pendingStreamNames, slug]);
        console.log('[StreamPicker] Added pending stream:', slug);
      }
      
      // Clear search and close dropdown
      setSearchQuery("");
      setOpen(false);
    } else {
      // Selecting existing stream - use existing toggle logic
      toggleStream(streamId, false);
    }
  }, [
    disabled,
    selectedStreamIds,
    pendingStreamNames,
    activeStreams,
    excludedStreamNames,
    maxStreams,
    onPendingStreamsChange,
    onExcludedStreamsChange,
      toggleStream,
    ]);

  // Keyboard navigation for dropdown
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allOptionsRef.current.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const option = allOptionsRef.current[selectedIndexRef.current];
        if (option) {
          const isNew = 'isNew' in option && option.isNew;
          handleSelectStream(option.id, isNew, option.name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSelectStream]);

  // Combined selected streams (real + pending)
  const selectedStreams = React.useMemo(() => {
    const realStreams = activeStreams.filter(s => selectedStreamIds.includes(s.id));
    const pendingStreams = pendingStreamNames.map(name => ({
      id: `pending-${name}`,
      name,
      status: 'pending' as const,
      owner_type: 'user',
      owner_id: '',
    }));
    return [...realStreams, ...pendingStreams];
  }, [activeStreams, selectedStreamIds, pendingStreamNames]);

  const renderSelectionContent = () => (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search or create new stream"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
          autoFocus
        />
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-3">
          {allOptions.map((option) => {
            const isNew = 'isNew' in option && option.isNew;
            const streamName = option.name;
            
            // Check if selected
            const isSelected = isNew
              ? pendingStreamNames.includes(streamName)
              : selectedStreamIds.includes(option.id);
            
            const totalSelected = selectedStreamIds.length + pendingStreamNames.length;
            const isMaxReached = totalSelected >= maxStreams && !isSelected;

            return (
              <button
                key={isNew ? '__create__' : option.id}
                onClick={() => handleSelectStream(option.id, isNew, streamName)}
                onMouseEnter={() => setSelectedIndex(allOptions.indexOf(option))}
                disabled={disabled || isMaxReached}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                  "hover:bg-secondary",
                  selectedIndex === allOptions.indexOf(option) && "bg-secondary",
                  isSelected && "bg-secondary/50",
                  (disabled || isMaxReached) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                  isNew 
                    ? "bg-blue-500/20 border-blue-500/50" 
                    : isSelected 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground/30"
                )}>
                  {isNew ? (
                    <Plus className="h-3 w-3 text-blue-400" />
                  ) : isSelected ? (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isNew ? "text-blue-400" : "text-foreground"
                    )}>
                      {streamName}
                    </span>
                    {isSelected && !isNew && (
                      <Check className="h-3 w-3 text-green-500 shrink-0 ml-auto" />
                    )}
                  </div>
                  {isNew && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create new stream
                    </p>
                  )}
                  {!isNew && 'description' in option && option.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {allOptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery.trim() ? 'No streams found' : 'No streams available'}
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
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 border rounded-full px-3 text-xs font-medium bg-zinc-900/50 border-zinc-700 hover:bg-zinc-900 hover:text-white hover:border-zinc-600 text-zinc-400"
              disabled={disabled}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Streams
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-3" align="start">
            {renderSelectionContent()}
          </PopoverContent>
        </Popover>

        {selectedStreams.map((stream) => {
          const isPending = stream.status === 'pending';
          return (
          <div
            key={stream.id}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors",
                isPending ? "border-2 border-dashed border-blue-500/50" : "border border-border"
              )}
          >
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span>{stream.name}</span>
            <button
                onClick={() => toggleStream(stream.id, isPending)}
              className="ml-1 p-0.5 rounded-full hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {stream.name}</span>
            </button>
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Selected Streams Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Streams
            <span className="text-muted-foreground ml-1">
              ({selectedStreamIds.length + pendingStreamNames.length}/{maxStreams})
            </span>
          </label>
          <span className="text-xs text-muted-foreground">
            {STREAM_VALIDATION.MIN_STREAMS_PER_ASSET} required, max {maxStreams}
          </span>
        </div>

        {selectedStreams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedStreams.map((stream) => {
              const isPending = stream.status === 'pending';
              const totalSelected = selectedStreamIds.length + pendingStreamNames.length;
              return (
              <button
                key={stream.id}
                  onClick={() => toggleStream(stream.id, isPending)}
                  disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                    "bg-primary/10 text-primary",
                  "hover:bg-primary/20 transition-colors",
                    isPending ? "border-2 border-dashed border-blue-500/50" : "border border-primary/20",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Hash className="h-3 w-3" />
                <span>{stream.name}</span>
                <span className="ml-1 text-primary/60">×</span>
              </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stream Search & Selection */}
      <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
        {renderSelectionContent()}
      </div>
    </div>
  );
}

