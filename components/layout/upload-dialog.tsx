"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, AlertCircle, Type, Smile, AtSign, Image as ImageIcon, Link as LinkIcon, ChevronDown } from "lucide-react";
import { StreamPicker } from "@/components/streams/stream-picker";
import { RichTextArea } from "@/components/ui/rich-text-area";
import { StreamMentionDropdown } from "@/components/streams/stream-mention-dropdown";
import { useStreamMentions } from "@/lib/hooks/use-stream-mentions";
import type { Stream } from "@/lib/types/database";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  // Form state
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [streamIds, setStreamIds] = React.useState<string[]>([]);
  
  // Stream data
  const [allStreams, setAllStreams] = React.useState<Stream[]>([]);
  
  // Stream mentions state
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionPosition, setMentionPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [showMentionDropdown, setShowMentionDropdown] = React.useState(false);
  const replaceHashtagRef = React.useRef<((newText: string) => void) | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch streams from API
  React.useEffect(() => {
    const fetchStreams = async () => {
      try {
        const res = await fetch('/api/streams');
        if (res.ok) {
          const data = await res.json();
          setAllStreams(data.streams || []);
        }
      } catch (error) {
        console.error('[UploadDialog] Failed to fetch streams:', error);
      }
    };
    
    if (open) {
      fetchStreams();
    }
  }, [open]);

  // Callback when a stream is created by auto-sync
  const handleStreamCreated = React.useCallback((stream: Stream) => {
    console.log('[UploadDialog] Stream created by auto-sync:', stream.name);
    setAllStreams(prev => {
      // Check if already exists to avoid duplicates
      if (prev.find(s => s.id === stream.id)) return prev;
      return [stream, ...prev];
    });
  }, []);

  // Sync hashtags in description with streams
  useStreamMentions(description, allStreams, streamIds, setStreamIds, handleStreamCreated);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setStreamIds([]);
    setError(null);
    setIsLoading(false);
    setShowMentionDropdown(false);
    setMentionQuery("");
    setMentionPosition(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setError(null);

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError(`${selectedFile.name} is not a valid image file`);
      return;
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`${selectedFile.name} is too large (max 10MB)`);
      return;
    }

    // Set file and create preview
    setFile(selectedFile);
    
    // Auto-populate title from filename (without extension)
    const filenameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setTitle(filenameWithoutExt);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setStreamIds([]);
    setError(null);
    setShowMentionDropdown(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
  const handleStreamSelect = React.useCallback(async (streamName: string, isNew: boolean) => {
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

    if (isNew) {
      // Create new stream
      try {
        const response = await fetch('/api/streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: streamName.replace(/^#/, ''), // Remove # prefix if present
            owner_type: 'user',
            is_private: false,
          }),
        });

        if (response.ok) {
          const { stream } = await response.json();
          // Add to local state (check for duplicates)
          setAllStreams(prev => {
            if (prev.find(s => s.id === stream.id)) return prev;
            return [stream, ...prev];
          });
          // Add to selected streams
          setStreamIds(prev => [...new Set([...prev, stream.id])]);
        } else if (response.status === 409) {
          // Stream already exists, refresh list and find it
          console.log('[UploadDialog] Stream already exists, refreshing list');
          const refreshResponse = await fetch('/api/streams');
          if (refreshResponse.ok) {
            const { streams } = await refreshResponse.json();
            setAllStreams(streams);
            const existingStream = streams.find((s: Stream) => s.name === streamName.replace(/^#/, ''));
            if (existingStream) {
              setStreamIds(prev => [...new Set([...prev, existingStream.id])]);
            }
          }
        }
      } catch (error) {
        console.error('[UploadDialog] Failed to create stream:', error);
      }
    } else {
      // Find and add existing stream
      const stream = allStreams.find(s => 
        s.name.toLowerCase() === streamName.toLowerCase() ||
        s.name === streamName.replace(/^#/, '')
      );
      
      if (stream && !streamIds.includes(stream.id)) {
        setStreamIds(prev => [...new Set([...prev, stream.id])]);
      }
    }
  }, [streamIds, allStreams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!file) {
      setError("Please select an image");
      return;
    }

    if (!title.trim()) {
      setError("Please provide a title");
      return;
    }

    console.log('[UploadDialog] 🚀 Starting upload...');
    console.log(`  - File: ${file.name}`);
    console.log(`  - Size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`  - Title: ${title}`);
    console.log(`  - Description: ${description || '(none)'}`);
    console.log(`  - Streams: ${streamIds.length > 0 ? streamIds.join(', ') : '(none)'}`);

    setIsLoading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (streamIds.length > 0) {
        formData.append('streamIds', JSON.stringify(streamIds));
      }

      console.log('[UploadDialog] 📤 Sending request to /api/assets/upload...');

      // Upload
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      console.log(`[UploadDialog] Response status: ${response.status}`);

      const data = await response.json();
      console.log('[UploadDialog] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      console.log('[UploadDialog] ✅ Upload successful!');
      console.log(`  - Asset ID: ${data.asset.id}`);
      console.log(`  - URLs created: full, medium, thumbnail`);

      // Success! Close dialog and navigate
      console.log('[UploadDialog] Closing dialog and refreshing...');
      onOpenChange(false);
      
      // Navigate using Next.js router for better UX
      router.push('/home');
      router.refresh(); // Revalidate server components
      
      console.log('[UploadDialog] ✨ Complete!');
    } catch (err) {
      console.error('[UploadDialog] ❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[650px] ${file ? 'p-0 gap-0 bg-zinc-950 border-zinc-800' : 'sm:max-w-[500px]'}`}>
        {/* Initial Upload State */}
        {!file && (
          <>
            <DialogHeader className="p-6 pb-2">
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>
            Upload a single image file. Drag and drop or click to browse.
          </DialogDescription>
        </DialogHeader>

            <form onSubmit={handleSubmit} className="p-6 pt-2">
              <div className="space-y-4">
            {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }
                `}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop an image here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max file size: 10MB • Supported: JPG, PNG, GIF, WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

              <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* File Selected State - Pixel Perfect Match */}
        {file && preview && (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Preview Area */}
            <div className="p-6 pb-0">
              <div className="relative w-full aspect-[1.85/1] rounded-t-xl overflow-hidden bg-zinc-900 border border-zinc-800 border-b-0">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {/* Close Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-6 pt-4 pb-6 space-y-6 bg-zinc-950 rounded-b-xl relative">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Stream Mention Dropdown */}
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
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give it a title"
                  className="border-none shadow-none bg-transparent !text-[19px] font-bold text-white px-0 h-auto focus-visible:ring-0 placeholder:text-zinc-600 leading-snug"
                  required
                  autoFocus
                />
                
                <RichTextArea
                  value={description}
                  onChange={setDescription}
                  placeholder="type something..."
                  onHashtagTrigger={handleHashtagTrigger}
                  onHashtagComplete={handleHashtagComplete}
                  disabled={isLoading}
                  className="border-none shadow-none bg-transparent px-0 min-h-[40px] !text-[15px] text-zinc-400"
                />

                <div className="pt-1">
                  <StreamPicker
                    selectedStreamIds={streamIds}
                    onSelectStreams={setStreamIds}
                    disabled={isLoading}
                    variant="compact"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                {/* Left Actions */}
                <div className="flex items-center gap-5 text-zinc-500">
                  <Type className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                  <Smile className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                  <AtSign className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                  <ImageIcon className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                  <LinkIcon className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 h-9 px-3 text-sm"
                  >
                    <div className="w-4 h-4 mr-2 rounded-sm bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">#</span>
                    </div>
                    Select Slack Channels
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                  </Button>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-white text-black hover:bg-zinc-200 h-9 px-4 font-medium"
                  >
              {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                      'Post'
              )}
            </Button>
                </div>
              </div>
            </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

