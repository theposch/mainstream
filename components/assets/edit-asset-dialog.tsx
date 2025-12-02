"use client";

import * as React from "react";
import { Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StreamPicker } from "@/components/streams/stream-picker";
import type { Asset, Stream } from "@/lib/types/database";

interface EditAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset;
  currentStreams: Stream[];
  onSuccess?: (updatedAsset: Asset) => void;
}

export function EditAssetDialog({
  open,
  onOpenChange,
  asset,
  currentStreams,
  onSuccess,
}: EditAssetDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = React.useState(asset.title);
  const [description, setDescription] = React.useState(asset.description || "");
  const [streamIds, setStreamIds] = React.useState<string[]>(
    currentStreams.map(s => s.id)
  );
  const [pendingStreamNames, setPendingStreamNames] = React.useState<string[]>([]);
  
  // Reset form when dialog opens or asset changes
  React.useEffect(() => {
    if (open) {
      setTitle(asset.title);
      setDescription(asset.description || "");
      setStreamIds(currentStreams.map(s => s.id));
      setPendingStreamNames([]);
      setError(null);
    }
  }, [open, asset, currentStreams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create pending streams first
      let createdStreamIds: string[] = [];
      
      if (pendingStreamNames.length > 0) {
        const createPromises = pendingStreamNames.map(async (name) => {
          try {
            const response = await fetch('/api/streams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                owner_type: 'user',
                is_private: false,
              }),
            });

            if (response.ok) {
              const { stream } = await response.json();
              return { success: true, id: stream.id, name };
            } else {
              return { success: false, name };
            }
          } catch {
            return { success: false, name };
          }
        });

        const results = await Promise.all(createPromises);
        createdStreamIds = results.filter(r => r.success).map(r => r.id);
        const failedStreamNames = results.filter(r => !r.success).map(r => r.name);
        
        if (failedStreamNames.length > 0) {
          console.warn('Failed to create some streams:', failedStreamNames);
        }
      }
      
      // Combine existing and newly created stream IDs
      const allStreamIds = [...streamIds, ...createdStreamIds];
      
      // Update asset
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          streamIds: allStreamIds,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update asset');
      }
      
      const { asset: updatedAsset } = await response.json();
      
      // Call success callback
      onSuccess?.(updatedAsset);
      
      // Close dialog
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    } finally {
      setIsLoading(false);
    }
  };
  
  const hasChanges = React.useMemo(() => {
    const titleChanged = title.trim() !== asset.title;
    const descriptionChanged = (description.trim() || null) !== (asset.description || null);
    const currentStreamIdsSet = new Set(currentStreams.map(s => s.id));
    const selectedStreamIdsSet = new Set(streamIds);
    const streamsChanged = 
      pendingStreamNames.length > 0 ||
      currentStreamIdsSet.size !== selectedStreamIdsSet.size ||
      [...currentStreamIdsSet].some(id => !selectedStreamIdsSet.has(id));
    
    return titleChanged || descriptionChanged || streamsChanged;
  }, [title, description, streamIds, pendingStreamNames, asset, currentStreams]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Pencil className="h-5 w-5" />
            Edit Post
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update your post&apos;s title, description, and streams.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              maxLength={200}
              disabled={isLoading}
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 min-h-[100px] resize-none"
              maxLength={2000}
              disabled={isLoading}
            />
            <p className="text-xs text-zinc-600">
              {description.length}/2000 characters
            </p>
          </div>
          
          {/* Streams */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Streams</Label>
            <StreamPicker
              selectedStreamIds={streamIds}
              onSelectStreams={setStreamIds}
              pendingStreamNames={pendingStreamNames}
              onPendingStreamsChange={setPendingStreamNames}
              disabled={isLoading}
              variant="compact"
            />
            <p className="text-xs text-zinc-600">
              Add to streams or create new ones
            </p>
          </div>
          
          {/* Error */}
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

