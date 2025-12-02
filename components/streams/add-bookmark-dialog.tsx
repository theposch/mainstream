"use client";

import * as React from "react";
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
import { Loader2, Link as LinkIcon } from "lucide-react";
import { extractDomain, getFaviconUrl } from "@/lib/hooks/use-stream-bookmarks";

interface AddBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string, title?: string) => Promise<boolean>;
}

export function AddBookmarkDialog({ open, onOpenChange, onSubmit }: AddBookmarkDialogProps) {
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewDomain, setPreviewDomain] = React.useState<string | null>(null);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setUrl("");
      setTitle("");
      setError(null);
      setPreviewDomain(null);
      setIsLoading(false);
    }
  }, [open]);

  // Update preview when URL changes
  React.useEffect(() => {
    if (url) {
      try {
        new URL(url);
        setPreviewDomain(extractDomain(url));
        setError(null);
      } catch {
        setPreviewDomain(null);
        if (url.length > 5) {
          setError("Please enter a valid URL");
        }
      }
    } else {
      setPreviewDomain(null);
      setError(null);
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError("URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await onSubmit(url, title || undefined);
      if (success) {
        onOpenChange(false);
      } else {
        setError("Failed to add bookmark");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bookmark");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
            <DialogDescription>
              Add a link to an external resource like Jira, Figma, or Notion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* URL Input */}
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <div className="relative">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={error ? "border-destructive" : ""}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            {/* Title Input */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="title"
                placeholder={previewDomain || "Enter a custom title"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Preview */}
            {previewDomain && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <img
                  src={getFaviconUrl(url, 32)}
                  alt=""
                  className="w-4 h-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {title || previewDomain}
                </span>
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
            <Button type="submit" disabled={isLoading || !url}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Bookmark
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

