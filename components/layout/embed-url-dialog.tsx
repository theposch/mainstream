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
import { 
  Loader2, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PostMetadataForm } from "@/components/assets/post-metadata-form";
import { useStreamSelection } from "@/lib/hooks/use-stream-selection";
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

interface EmbedUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a stream when opening from a stream page */
  initialStreamId?: string;
}

export function EmbedUrlDialog({ open, onOpenChange, initialStreamId }: EmbedUrlDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // URL state
  const [url, setUrl] = React.useState("");
  const [provider, setProvider] = React.useState<EmbedProvider | null>(null);
  const [isValidUrl, setIsValidUrl] = React.useState(false);
  
  // Metadata state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  
  // Stream selection
  const streamSelection = useStreamSelection({
    initialStreamIds: initialStreamId ? [initialStreamId] : [],
  });

  // Track if we've already initialized the stream for this dialog session
  const hasInitializedStreamRef = React.useRef(false);

  // Pre-populate stream when initialStreamId is provided
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

  // Detect provider when URL changes
  React.useEffect(() => {
    if (url) {
      const detected = detectProvider(url);
      setProvider(detected);
      setIsValidUrl(isSupportedUrl(url));
      
      // Auto-populate title from URL
      if (!title) {
        if (detected === 'figma') {
          const extractedTitle = getFigmaTitle(url);
          if (extractedTitle) {
            setTitle(extractedTitle);
          }
        } else if (detected === 'loom') {
          const extractedTitle = getLoomTitle(url);
          if (extractedTitle) {
            setTitle(extractedTitle);
          }
        }
      }
      
      // Clear error when user starts typing valid URL
      if (isSupportedUrl(url)) {
        setError(null);
      }
    } else {
      setProvider(null);
      setIsValidUrl(false);
    }
  }, [url]);

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setDescription("");
    setProvider(null);
    setIsValidUrl(false);
    streamSelection.reset();
    setError(null);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl) {
      setError("Please enter a supported URL (Figma, Loom)");
      return;
    }

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

      // Combine stream IDs
      const allStreamIds = [...streamSelection.streamIds, ...createdStreamIds];

      // Create embed asset
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

      // Success!
      onOpenChange(false);
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('asset-uploaded', { detail: { asset: data.asset } }));
      
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create embed');
    } finally {
      setIsLoading(false);
    }
  };

  const providerInfo = provider ? getProviderInfo(provider) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[600px] ${isValidUrl ? 'p-0 gap-0 bg-zinc-950 border-zinc-800' : ''}`}>
        {/* Initial URL Input State */}
        {!isValidUrl && (
          <>
            <DialogHeader>
              <DialogTitle>Add via URL</DialogTitle>
              <DialogDescription>
                Paste a link to embed content from Figma, YouTube, or other supported services.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="embed-url">URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="embed-url"
                    type="url"
                    placeholder="https://figma.com/design/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                
                {/* Provider Detection Hint */}
                {url && !isValidUrl && provider === 'unknown' && (
                  <p className="text-sm text-muted-foreground">
                    Currently supported: <span className="text-foreground">Figma, Loom</span>
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <DialogFooter>
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

        {/* URL Validated State - Show Preview & Metadata Form */}
        {isValidUrl && providerInfo && (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Preview Area */}
            <div className="p-6 pb-0">
              <div className="relative w-full aspect-video rounded-t-xl overflow-hidden bg-zinc-900 border border-zinc-800 border-b-0">
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
                
                {/* Provider Badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
                >
                  {providerInfo.name}
                </Badge>
                
                {/* Open in New Tab */}
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
            <div className="px-6 pt-4 pb-6 space-y-6 bg-zinc-950 rounded-b-xl">
              {/* Success indicator */}
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{providerInfo.name} link detected</span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="embed-title">Title</Label>
                <Input
                  id="embed-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your post a title"
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label htmlFor="embed-description">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="embed-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="bg-zinc-900 border-zinc-800 resize-none"
                  rows={3}
                />
              </div>

              {/* Stream Selection */}
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
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUrl("");
                    setIsValidUrl(false);
                    setProvider(null);
                  }}
                  className="bg-zinc-900 border-zinc-800"
                  disabled={isLoading}
                >
                  Change URL
                </Button>

                <Button 
                  type="submit" 
                  disabled={isLoading || !title.trim()}
                  className="bg-white text-black hover:bg-zinc-200 font-medium"
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

