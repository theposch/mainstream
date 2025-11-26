"use client";

import * as React from "react";
import { Check, Search, Plus, Hash, X } from "lucide-react";
import { Stream, STREAM_VALIDATION } from "@/lib/mock-data/streams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStreams, onStreamsUpdated } from "@/lib/utils/stream-storage";

interface StreamPickerProps {
  selectedStreamIds: string[];
  onSelectStreams: (streamIds: string[]) => void;
  maxStreams?: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "compact";
}

export function StreamPicker({
  selectedStreamIds,
  onSelectStreams,
  maxStreams = STREAM_VALIDATION.MAX_STREAMS_PER_ASSET,
  disabled = false,
  className,
  variant = "default",
}: StreamPickerProps) {
  // Import streams internally instead of as prop
  const [allStreams, setAllStreams] = React.useState<Stream[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [newStreamName, setNewStreamName] = React.useState("");
  const [open, setOpen] = React.useState(false);

  // Load streams on mount (includes both mock and persisted)
  React.useEffect(() => {
    const loadStreams = () => {
      const streams = getStreams(); // Get merged mock + localStorage streams
      setAllStreams(streams);
    };
    
    loadStreams();
    
    // Listen for stream updates from other components
    const cleanup = onStreamsUpdated(loadStreams);
    return cleanup;
  }, []);

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

  const toggleStream = React.useCallback((streamId: string) => {
    if (disabled) return;

    const isSelected = selectedStreamIds.includes(streamId);
    
    if (isSelected) {
      // Cannot deselect if it's the only stream
      if (selectedStreamIds.length <= STREAM_VALIDATION.MIN_STREAMS_PER_ASSET) {
        return;
      }
      onSelectStreams(selectedStreamIds.filter(id => id !== streamId));
    } else {
      // Check max streams limit
      if (selectedStreamIds.length >= maxStreams) {
        return;
      }
      onSelectStreams([...selectedStreamIds, streamId]);
    }
  }, [selectedStreamIds, onSelectStreams, maxStreams, disabled]);

  const handleCreateStream = React.useCallback(async () => {
    if (!newStreamName.trim()) return;
    
    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStreamName.trim(),
          ownerType: 'user',
          isPrivate: false,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create stream');
      }
      
      const { stream } = await response.json();
      
      // Add new stream to local list
      setAllStreams(prev => [stream, ...prev]);
      
      // Auto-select the new stream
      onSelectStreams([...selectedStreamIds, stream.id]);
      
      // Close dialog and reset
      setNewStreamName("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert(error instanceof Error ? error.message : 'Failed to create stream');
    }
  }, [newStreamName, selectedStreamIds, onSelectStreams]);

  const selectedStreams = React.useMemo(() => {
    return activeStreams.filter(s => selectedStreamIds.includes(s.id));
  }, [activeStreams, selectedStreamIds]);

  const renderSelectionContent = () => (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search streams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
          autoFocus
        />
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-3">
          {filteredStreams.map((stream) => {
            const isSelected = selectedStreamIds.includes(stream.id);
            const isMaxReached = selectedStreamIds.length >= maxStreams && !isSelected;

            return (
              <button
                key={stream.id}
                onClick={() => toggleStream(stream.id)}
                disabled={disabled || isMaxReached}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                  "hover:bg-secondary",
                  isSelected && "bg-secondary",
                  (disabled || isMaxReached) && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {stream.name}
                    </span>
                  </div>
                  {stream.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {stream.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {filteredStreams.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No streams found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create New Stream Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="cosmos-ghost"
            size="sm"
            className="w-full"
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Stream
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Stream</DialogTitle>
            <DialogDescription>
              Create a new stream to organize your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stream Name</label>
              <Input
                type="text"
                placeholder="# My New Stream"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                maxLength={STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH}
              />
              <p className="text-xs text-muted-foreground">
                {STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH}-{STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH} characters
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="cosmos-ghost"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="cosmos"
                onClick={handleCreateStream}
                disabled={newStreamName.trim().length < STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH}
              >
                Create Stream
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

        {selectedStreams.map((stream) => (
          <div
            key={stream.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition-colors"
          >
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span>{stream.name}</span>
            <button
              onClick={() => toggleStream(stream.id)}
              className="ml-1 p-0.5 rounded-full hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {stream.name}</span>
            </button>
          </div>
        ))}
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
              ({selectedStreamIds.length}/{maxStreams})
            </span>
          </label>
          <span className="text-xs text-muted-foreground">
            {STREAM_VALIDATION.MIN_STREAMS_PER_ASSET} required, max {maxStreams}
          </span>
        </div>

        {selectedStreams.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedStreams.map((stream) => (
              <button
                key={stream.id}
                onClick={() => toggleStream(stream.id)}
                disabled={disabled || selectedStreamIds.length <= STREAM_VALIDATION.MIN_STREAMS_PER_ASSET}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                  "bg-primary/10 text-primary border border-primary/20",
                  "hover:bg-primary/20 transition-colors",
                  disabled && "opacity-50 cursor-not-allowed",
                  selectedStreamIds.length <= STREAM_VALIDATION.MIN_STREAMS_PER_ASSET && "cursor-not-allowed opacity-60"
                )}
              >
                <Hash className="h-3 w-3" />
                <span>{stream.name}</span>
                <span className="ml-1 text-primary/60">×</span>
              </button>
            ))}
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

