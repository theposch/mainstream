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
import { PostMetadataForm } from "@/components/assets/post-metadata-form";
import { useStreamSelection } from "@/lib/hooks/use-stream-selection";
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
  
  // Stream selection (shared hook)
  const streamSelection = useStreamSelection({
    initialStreamIds: currentStreams.map(s => s.id),
  });
  
  // Reset form when dialog opens or asset changes
  React.useEffect(() => {
    if (open) {
      setTitle(asset.title);
      setDescription(asset.description || "");
      streamSelection.reset({ streamIds: currentStreams.map(s => s.id) });
      setError(null);
    }
  }, [open, asset, currentStreams]);
  
  // Detect changes
  const hasChanges = React.useMemo(() => {
    const titleChanged = title.trim() !== asset.title;
    const descriptionChanged = (description.trim() || null) !== (asset.description || null);
    const currentStreamIdsSet = new Set(currentStreams.map(s => s.id));
    const selectedStreamIdsSet = new Set(streamSelection.streamIds);
    const streamsChanged = 
      streamSelection.pendingStreamNames.length > 0 ||
      currentStreamIdsSet.size !== selectedStreamIdsSet.size ||
      [...currentStreamIdsSet].some(id => !selectedStreamIdsSet.has(id));
    
    return titleChanged || descriptionChanged || streamsChanged;
  }, [title, description, streamSelection.streamIds, streamSelection.pendingStreamNames, asset, currentStreams]);
  
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
      // Create pending streams first using shared hook
      const { created: createdStreamIds, failed: failedStreamNames } = await streamSelection.createPendingStreams();
      
      if (failedStreamNames.length > 0) {
        console.warn('Failed to create some streams:', failedStreamNames);
      }
      
      // Combine existing and newly created stream IDs
      const allStreamIds = [...streamSelection.streamIds, ...createdStreamIds];
      
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
            Use #streamname to add streams.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post Metadata Form (shared component with hashtag support) */}
          <PostMetadataForm
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
            streamSelection={streamSelection}
            disabled={isLoading}
            variant="edit"
            showLabels={true}
            titlePlaceholder="Enter a title..."
            descriptionPlaceholder="Add a description... Use #streamname to add streams."
          />
          
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
