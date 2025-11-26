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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, AlertCircle } from "lucide-react";
import { StreamPicker } from "@/components/streams/stream-picker";

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

      // Success!
      console.log('[UploadDialog] Closing dialog and refreshing...');
      onOpenChange(false);
      
      // Force a hard reload to show the new upload immediately
      console.log('[UploadDialog] Forcing page reload...');
      window.location.href = '/home';
      
      console.log('[UploadDialog] ✨ Complete! Page reloading...');
      
      // Optional: Navigate to the uploaded asset
      // router.push(`/assets/${data.asset.id}`);
    } catch (err) {
      console.error('[UploadDialog] ❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>
            Upload a single image file. Drag and drop or click to browse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Drag and Drop Zone */}
            {!file && (
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
            )}

            {/* Preview and Form */}
            {file && preview && (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Title Field */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter image title"
                    required
                  />
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for your image"
                    rows={3}
                  />
                </div>

                {/* Stream Picker */}
                <div className="space-y-2">
                  <Label htmlFor="streams">
                    Streams <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <StreamPicker
                    selectedStreamIds={streamIds}
                    onSelectStreams={setStreamIds}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tag this image with one or more streams to organize your work
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

