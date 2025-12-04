"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropView } from "@/components/drops/drop-view";
import { DropPublishDialog } from "@/components/drops/drop-publish-dialog";
import type { Drop, Asset, User, Stream, DropPostDisplayMode } from "@/lib/types/database";

interface DropPost extends Asset {
  position: number;
  streams?: Stream[];
  display_mode?: DropPostDisplayMode;
  crop_position_x?: number;
  crop_position_y?: number;
}

interface DropEditorClientProps {
  drop: Drop;
  initialPosts: DropPost[];
  initialContributors: User[];
}

export function DropEditorClient({
  drop,
  initialPosts,
  initialContributors,
}: DropEditorClientProps) {
  const router = useRouter();
  const [posts, setPosts] = React.useState(initialPosts);
  const [contributors, setContributors] = React.useState(initialContributors);
  const [title, setTitle] = React.useState(drop.title);
  const [description, setDescription] = React.useState(drop.description || "");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);

  // Update contributors when posts change
  React.useEffect(() => {
    const contributorMap = new Map();
    posts.forEach((post) => {
      if (post.uploader && !contributorMap.has(post.uploader.id)) {
        contributorMap.set(post.uploader.id, post.uploader);
      }
    });
    setContributors(Array.from(contributorMap.values()));
  }, [posts]);

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/drops/${drop.id}/generate`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok && data.description) {
        setDescription(data.description);
        // Auto-save
        await saveDrop({ description: data.description });
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDrop = async (updates: { title?: string; description?: string }) => {
    setIsSaving(true);
    try {
      await fetch(`/api/drops/${drop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to save drop:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePost = async (assetId: string) => {
    // Optimistic update
    setPosts((prev) => prev.filter((p) => p.id !== assetId));
    
    try {
      await fetch(`/api/drops/${drop.id}/posts/${assetId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to remove post:", error);
      // Revert on error
      setPosts(initialPosts);
    }
  };

  const handleDisplayModeChange = async (assetId: string, mode: DropPostDisplayMode) => {
    // Optimistic update
    setPosts((prev) => 
      prev.map((p) => 
        p.id === assetId ? { ...p, display_mode: mode } : p
      )
    );
    
    try {
      await fetch(`/api/drops/${drop.id}/posts/${assetId}/display-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_mode: mode }),
      });
    } catch (error) {
      console.error("Failed to update display mode:", error);
    }
  };

  const handleCropPositionChange = async (assetId: string, x: number, y: number) => {
    // Optimistic update
    setPosts((prev) => 
      prev.map((p) => 
        p.id === assetId ? { ...p, crop_position_x: x, crop_position_y: y } : p
      )
    );
    
    try {
      await fetch(`/api/drops/${drop.id}/posts/${assetId}/display-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop_position_x: x, crop_position_y: y }),
      });
    } catch (error) {
      console.error("Failed to update crop position:", error);
    }
  };

  // Debounced save for inline editing
  const titleSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const descSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleTitleChangeInline = (newTitle: string) => {
    setTitle(newTitle);
    
    // Debounce save
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    titleSaveTimeoutRef.current = setTimeout(() => {
      if (newTitle !== drop.title && newTitle.trim()) {
        saveDrop({ title: newTitle });
      }
    }, 1000);
  };
  
  const handleDescriptionChangeInline = (newDescription: string) => {
    setDescription(newDescription);
    
    // Debounce save
    if (descSaveTimeoutRef.current) {
      clearTimeout(descSaveTimeoutRef.current);
    }
    descSaveTimeoutRef.current = setTimeout(() => {
      if (newDescription !== drop.description) {
        saveDrop({ description: newDescription });
      }
    }, 1000);
  };
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      if (descSaveTimeoutRef.current) {
        clearTimeout(descSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/drops?tab=drafts"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
              DRAFT
            </span>
            <Button
              onClick={() => setPublishDialogOpen(true)}
              disabled={posts.length === 0}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="max-w-3xl mx-auto py-10 px-4">
        {/* Drop with inline title and description editor */}
        <DropView
          title={title}
          description={description}
          dateRangeStart={drop.date_range_start}
          dateRangeEnd={drop.date_range_end}
          posts={posts}
          contributors={contributors}
          isEditing={true}
          onRemovePost={handleRemovePost}
          onTitleChange={handleTitleChangeInline}
          onDescriptionChange={handleDescriptionChangeInline}
          onGenerateDescription={handleGenerateDescription}
          isGeneratingDescription={isGenerating}
          onDisplayModeChange={handleDisplayModeChange}
          onCropPositionChange={handleCropPositionChange}
        />
        {isSaving && (
          <p className="text-xs text-zinc-500 text-center mt-2">Saving...</p>
        )}

        {/* Filter bar */}
        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Include posts from:</span>
            <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">
              All streams
            </span>
            <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">
              All teammates
            </span>
            <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded">
              {new Date(drop.date_range_start).toLocaleDateString()} → {new Date(drop.date_range_end).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Publish dialog */}
      <DropPublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        dropId={drop.id}
        dropTitle={title}
      />
    </div>
  );
}

