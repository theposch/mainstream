"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextArea } from "@/components/ui/rich-text-area";
import { StreamMentionDropdown } from "@/components/streams/stream-mention-dropdown";
import { StreamPicker } from "@/components/streams/stream-picker";
import { useStreamMentions } from "@/lib/hooks/use-stream-mentions";
import { useAIDescription } from "@/lib/hooks/use-ai-description";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseStreamSelectionReturn } from "@/lib/hooks/use-stream-selection";
import type { Stream } from "@/lib/types/database";

interface PostMetadataFormProps {
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  streamSelection: UseStreamSelectionReturn;
  disabled?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  variant?: "upload" | "edit" | "embed";
  /** Whether to show labels for form fields */
  showLabels?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Hide title and description fields (only show stream picker) */
  hideTextFields?: boolean;
  /** Image URL for AI description generation (enables the sparkle button) */
  imageUrl?: string;
}

/**
 * Shared form component for post metadata (title, description, streams).
 * Used by both upload-dialog and edit-asset-dialog.
 * 
 * Features:
 * - Title input
 * - RichTextArea with hashtag detection (#streamname)
 * - StreamMentionDropdown for autocomplete
 * - StreamPicker for explicit stream selection
 * - useStreamMentions hook for auto-sync
 */
export function PostMetadataForm({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  streamSelection,
  disabled = false,
  titlePlaceholder = "Give it a title",
  descriptionPlaceholder = "type something...",
  variant = "upload",
  showLabels = false,
  className,
  hideTextFields = false,
  imageUrl,
}: PostMetadataFormProps) {
  const {
    streamIds,
    setStreamIds,
    pendingStreamNames,
    setPendingStreamNames,
    excludedStreamNames,
    setExcludedStreamNames,
    allStreams,
  } = streamSelection;
  
  // Stream mention state (for hashtag dropdown)
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionPosition, setMentionPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
  const replaceHashtagRef = React.useRef<((newText: string) => void) | null>(null);
  
  // Sync hashtags in description with streams
  useStreamMentions(
    description,
    allStreams,
    streamIds,
    setStreamIds,
    pendingStreamNames,
    setPendingStreamNames,
    excludedStreamNames
  );
  
  // AI description generation
  const { generate: generateAIDescription, isGenerating: isGeneratingAI } = useAIDescription({
    onSuccess: (generatedDescription) => {
      onDescriptionChange(generatedDescription);
    },
  });

  const handleGenerateDescription = React.useCallback(() => {
    if (imageUrl && !isGeneratingAI && !disabled) {
      generateAIDescription(imageUrl);
    }
  }, [imageUrl, isGeneratingAI, disabled, generateAIDescription]);
  
  // Handle hashtag trigger in description
  const handleHashtagTrigger = React.useCallback((
    query: string, 
    position: { top: number; left: number },
    replaceHashtag: (newText: string) => void
  ) => {
    setMentionQuery(query);
    setMentionPosition(position);
    setShowMentionDropdown(true);
    replaceHashtagRef.current = replaceHashtag;
  }, []);

  const handleHashtagComplete = React.useCallback(() => {
    setShowMentionDropdown(false);
    replaceHashtagRef.current = null;
  }, []);

  // Handle stream selection from dropdown
  const handleStreamSelect = React.useCallback((streamName: string, isNew: boolean) => {
    // Close dropdown FIRST to prevent re-triggering
    setShowMentionDropdown(false);
    setMentionQuery("");
    setMentionPosition(null);

    // Replace the hashtag text with the selected stream name
    if (replaceHashtagRef.current) {
      const fullHashtag = streamName.startsWith('#') ? streamName : `#${streamName}`;
      replaceHashtagRef.current(fullHashtag);
      replaceHashtagRef.current = null;
    }

    const cleanName = streamName.replace(/^#/, '');

    if (isNew) {
      // Add to pending streams (will be created on post)
      if (!pendingStreamNames.includes(cleanName)) {
        setPendingStreamNames(prev => [...prev, cleanName]);
      }
    } else {
      // Find and add existing stream
      const stream = allStreams.find(s => 
        s.name.toLowerCase() === cleanName.toLowerCase() ||
        s.name === cleanName
      );
      
      if (stream && !streamIds.includes(stream.id)) {
        setStreamIds(prev => [...prev, stream.id]);
      }
    }
  }, [streamIds, pendingStreamNames, allStreams, setStreamIds, setPendingStreamNames]);
  
  // Styles based on variant
  const isUploadVariant = variant === "upload";
  
  return (
    <div className={className}>
      {/* Stream Mention Dropdown (portal-based) */}
      {showMentionDropdown && mentionPosition && (
        <StreamMentionDropdown
          query={mentionQuery}
          streams={allStreams}
          position={mentionPosition}
          onSelect={handleStreamSelect}
          onClose={handleHashtagComplete}
          selectedStreamIds={streamIds}
        />
      )}
      
      <div className="space-y-3">
        {/* Title */}
        {!hideTextFields && (
          <>
            {showLabels && (
              <Label htmlFor="title" className="text-zinc-300">
                Title <span className="text-red-500">*</span>
              </Label>
            )}
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={titlePlaceholder}
              className={isUploadVariant 
                ? "border-none shadow-none bg-transparent !text-[19px] font-bold text-white px-0 h-auto focus-visible:ring-0 placeholder:text-zinc-600 leading-snug"
                : "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              }
              required
              autoFocus={isUploadVariant}
              maxLength={200}
              disabled={disabled}
            />
          </>
        )}
        
        {/* Description */}
        {!hideTextFields && (
          <>
            {showLabels && (
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-zinc-300">
                  Description
                </Label>
                <p className="text-xs text-zinc-600">
                  {description.length}/2000 characters
                </p>
              </div>
            )}
            <div className="relative group">
              <RichTextArea
                value={description}
                onChange={onDescriptionChange}
                placeholder={descriptionPlaceholder}
                onHashtagTrigger={handleHashtagTrigger}
                onHashtagComplete={handleHashtagComplete}
                disabled={disabled || isGeneratingAI}
                className={cn(
                  isUploadVariant
                    ? "border-none shadow-none bg-transparent px-0 min-h-[40px] !text-[15px] text-zinc-400 pr-10"
                    : "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 min-h-[100px] px-3 py-2 rounded-md pr-10",
                  isGeneratingAI && "opacity-50"
                )}
              />
              {/* AI Generate Button */}
              {imageUrl && (
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={disabled || isGeneratingAI}
                  className={cn(
                    "absolute right-1 top-1 p-1.5 rounded-md transition-all duration-200",
                    "text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    // Show on hover or when generating
                    !isGeneratingAI && "opacity-0 group-hover:opacity-100",
                    isGeneratingAI && "opacity-100 text-violet-400"
                  )}
                  title={isGeneratingAI ? "Generating description..." : "Generate description with AI"}
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            {!showLabels && !isUploadVariant && (
              <p className="text-xs text-zinc-600">
                {description.length}/2000 characters
              </p>
            )}
          </>
        )}

        {/* Stream Picker */}
        <div className="pt-1">
          {showLabels && (
            <Label className="text-zinc-300 mb-2 block">Streams</Label>
          )}
          <StreamPicker
            selectedStreamIds={streamIds}
            onSelectStreams={setStreamIds}
            pendingStreamNames={pendingStreamNames}
            onPendingStreamsChange={setPendingStreamNames}
            excludedStreamNames={excludedStreamNames}
            onExcludedStreamsChange={setExcludedStreamNames}
            disabled={disabled}
            variant="compact"
            popoverClassName="z-[130]"
          />
          {showLabels && (
            <p className="text-xs text-zinc-600 mt-1">
              Add to streams or create new ones. Use #streamname in description.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the return type for use in other components
export type { UseStreamSelectionReturn };

