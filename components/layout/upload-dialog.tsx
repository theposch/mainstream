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
import { Loader2, Upload, X, AlertCircle, Type, Smile, AtSign, Image as ImageIcon, Link as LinkIcon, ChevronDown } from "lucide-react";
import { PostMetadataForm } from "@/components/assets/post-metadata-form";
import { useStreamSelection } from "@/lib/hooks/use-stream-selection";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a stream when opening from a stream page */
  initialStreamId?: string;
}

export function UploadDialog({ open, onOpenChange, initialStreamId }: UploadDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  // File state
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  
  // Metadata state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  
  // Stream selection (shared hook)
  const streamSelection = useStreamSelection({
    initialStreamIds: initialStreamId ? [initialStreamId] : [],
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Track if we've already initialized the stream for this dialog session
  const hasInitializedStreamRef = React.useRef(false);

  // Pre-populate stream when initialStreamId is provided (only on initial open)
  React.useEffect(() => {
    if (open && initialStreamId && !hasInitializedStreamRef.current) {
      streamSelection.setStreamIds([initialStreamId]);
      hasInitializedStreamRef.current = true;
    }
  }, [open, initialStreamId, streamSelection]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
      hasInitializedStreamRef.current = false;
    }
  }, [open]);

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    streamSelection.reset();
    setError(null);
    setIsLoading(false);
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
    streamSelection.reset();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    setIsLoading(true);

    try {
      // Create pending streams first using shared hook
      const { created: createdStreamIds, failed: failedStreamNames } = await streamSelection.createPendingStreams();
      
      // Show warning if any failed (non-blocking)
      if (failedStreamNames.length > 0) {
        const failedList = failedStreamNames.map(n => `#${n}`).join(', ');
        setError(`Warning: Could not create stream(s): ${failedList}. Continuing with upload...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Combine real stream IDs with newly created stream IDs
      const allStreamIds = [...streamSelection.streamIds, ...createdStreamIds];

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (allStreamIds.length > 0) {
        formData.append('streamIds', JSON.stringify(allStreamIds));
      }

      // Upload
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Success! Close dialog and refresh current page
      onOpenChange(false);
      
      // Dispatch custom event to notify other components of new upload
      window.dispatchEvent(new CustomEvent('asset-uploaded', { detail: { asset: data.asset } }));
      
      // Also refresh server components
      router.refresh();
    } catch (err) {
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

        {/* File Selected State */}
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

              {/* Post Metadata Form (shared component) */}
              <PostMetadataForm
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                streamSelection={streamSelection}
                disabled={isLoading}
                variant="upload"
              />

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
