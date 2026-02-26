"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Upload, 
  Link as LinkIcon, 
  Loader2, 
  X, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Type,
  Smile,
  AtSign,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { PostMetadataForm } from "@/components/assets/post-metadata-form";
import { useStreamSelection } from "@/lib/hooks/use-stream-selection";
import { triggerSmallConfetti } from "@/lib/utils/confetti";
import {
  detectProvider,
  isSupportedUrl,
  getFigmaTitle,
  getFigmaEmbedUrl,
  getLoomTitle,
  getLoomEmbedUrl,
  getProviderInfo,
  type EmbedProvider,
} from "@/lib/utils/embed-providers";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PostMode = 'initial' | 'file-selected' | 'url-valid';

export function CreateDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<PostMode>('initial');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  
  // File state
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  
  // URL state
  const [url, setUrl] = React.useState("");
  const [provider, setProvider] = React.useState<EmbedProvider | null>(null);
  const [isValidUrl, setIsValidUrl] = React.useState(false);
  
  // Metadata state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  
  // Stream selection
  const streamSelection = useStreamSelection();
  const { reset: resetStreamSelection } = streamSelection;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetForm = React.useCallback(() => {
    setMode('initial');
    setFile(null);
    setPreview(null);
    setUrl("");
    setTitle("");
    setDescription("");
    setProvider(null);
    setIsValidUrl(false);
    resetStreamSelection();
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetStreamSelection]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  // Detect provider when URL changes
  React.useEffect(() => {
    if (url) {
      const detected = detectProvider(url);
      setProvider(detected);
      const valid = isSupportedUrl(url);
      setIsValidUrl(valid);

      if (valid) {
        // Auto-populate title from URL (only if title is empty)
        if (!title) {
          if (detected === 'figma') {
            const extractedTitle = getFigmaTitle(url);
            if (extractedTitle) setTitle(extractedTitle);
          } else if (detected === 'loom') {
            const extractedTitle = getLoomTitle(url);
            if (extractedTitle) setTitle(extractedTitle);
          }
        }
        setError(null);
        setMode('url-valid');
      } else {
        // URL is present but invalid - revert to initial mode
        setProvider(null);
        if (mode === 'url-valid') {
          setMode('initial');
        }
      }
    } else {
      setProvider(null);
      setIsValidUrl(false);
      if (mode === 'url-valid') {
        setMode('initial');
      }
    }
  }, [url, mode, title]);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);

    // Validate file type
    const isImage = selectedFile.type.startsWith('image/');
    const isWebM = selectedFile.type === 'video/webm';
    
    if (!isImage && !isWebM) {
      setError(`${selectedFile.name} is not a valid file. Supported: images and WebM videos.`);
      return;
    }

    // Validate file size
    const maxSize = isWebM ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`${selectedFile.name} is too large (max ${isWebM ? '50MB' : '10MB'})`);
      return;
    }

    setFile(selectedFile);
    setUrl(""); // Clear URL if file is selected
    
    // Auto-populate title from filename
    const filenameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setTitle(filenameWithoutExt);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
        setMode('file-selected');
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
    setMode('initial');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a title");
      return;
    }

    setIsLoading(true);

    try {
      // Create pending streams first
      const { created: createdStreamIds, failed: failedStreamNames } = await streamSelection.createPendingStreams();
      
      if (failedStreamNames.length > 0) {
        const failedList = failedStreamNames.map(n => `#${n}`).join(', ');
        setError(`Warning: Could not create stream(s): ${failedList}. Continuing...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const allStreamIds = [...streamSelection.streamIds, ...createdStreamIds];

      if (mode === 'file-selected' && file) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        if (description.trim()) {
          formData.append('description', description.trim());
        }
        if (allStreamIds.length > 0) {
          formData.append('streamIds', JSON.stringify(allStreamIds));
        }

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error(`Server error (${response.status}): Unable to parse response`);
        }

        if (!response.ok) {
          throw new Error(data.error || data.message || `Upload failed (${response.status})`);
        }

        window.dispatchEvent(new CustomEvent('asset-uploaded', { detail: { asset: data.asset } }));
      } else if (mode === 'url-valid' && isValidUrl) {
        // Create embed
        const response = await fetch('/api/assets/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            title: title.trim(),
            description: description.trim() || undefined,
            streamIds: allStreamIds.length > 0 ? allStreamIds : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create embed');
        }

        window.dispatchEvent(new CustomEvent('asset-uploaded', { detail: { asset: data.asset } }));
      }

      // Success!
      setOpen(false);
      triggerSmallConfetti();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setIsLoading(false);
    }
  };

  const providerInfo = provider ? getProviderInfo(provider) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className={`${mode === 'initial' ? 'sm:max-w-[500px]' : 'sm:max-w-[650px] p-0 gap-0'} bg-background border-border`}>
        
        {/* Initial State - Upload Zone + URL Input */}
        {mode === 'initial' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold">Post</DialogTitle>
              <p className="text-sm text-muted-foreground">Share an image or embed a link</p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }
              `}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/webm"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* URL Input */}
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Paste a Figma, Loom, or YouTube link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Provider hint */}
            {url && !isValidUrl && (
              <p className="text-xs text-muted-foreground">
                Supported: Figma, Loom
              </p>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* File Selected State */}
        {mode === 'file-selected' && file && preview && (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <VisuallyHidden.Root>
              <DialogTitle>Upload Post</DialogTitle>
            </VisuallyHidden.Root>
            {/* Preview Area */}
            <div className="p-6 pb-0">
              <div className="relative w-full aspect-[1.85/1] rounded-t-xl overflow-hidden bg-muted border border-border border-b-0">
                {file?.type === 'video/webm' ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
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
            <div className="px-6 pt-4 pb-6 space-y-6 bg-background rounded-b-xl relative">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

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
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-5 text-muted-foreground">
                  <Type className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
                  <Smile className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
                  <AtSign className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
                  <ImageIcon className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
                  <LinkIcon className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-9 px-3 text-sm"
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
                    className="h-9 px-4 font-medium"
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

        {/* URL Valid State */}
        {mode === 'url-valid' && isValidUrl && providerInfo && (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <VisuallyHidden.Root>
              <DialogTitle>Embed Link</DialogTitle>
            </VisuallyHidden.Root>
            {/* Preview Area */}
            <div className="p-6 pb-0">
              <div className="relative w-full aspect-video rounded-t-xl overflow-hidden bg-muted border border-border border-b-0">
                {provider === 'figma' && (
                  <iframe
                    src={getFigmaEmbedUrl(url)}
                    className="w-full h-full"
                    allowFullScreen
                  />
                )}
                {provider === 'loom' && (
                  <iframe
                    src={getLoomEmbedUrl(url) || ''}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                  />
                )}
                
                <Badge 
                  variant="secondary" 
                  className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
                >
                  {providerInfo.name}
                </Badge>
                
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-6 pt-4 pb-6 space-y-6 bg-background rounded-b-xl">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{providerInfo.name} link detected</span>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="embed-title">Title</Label>
                <Input
                  id="embed-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your post a title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="embed-description">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="embed-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="resize-none"
                  rows={3}
                />
              </div>

              <PostMetadataForm
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                streamSelection={streamSelection}
                disabled={isLoading}
                variant="embed"
                hideTextFields
              />

              {/* Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUrl("");
                    setIsValidUrl(false);
                    setProvider(null);
                    setMode('initial');
                  }}
                  disabled={isLoading}
                >
                  Change URL
                </Button>

                <Button 
                  type="submit" 
                  disabled={isLoading || !title.trim()}
                  className="font-medium"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
