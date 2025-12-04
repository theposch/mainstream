"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockEditor, DropBlocksView } from "@/components/drops/blocks";
import { DropPublishDialog } from "@/components/drops/drop-publish-dialog";
import type { Drop, DropBlock, Asset, User } from "@/lib/types/database";

interface DropBlocksEditorClientProps {
  drop: Drop;
  initialBlocks: DropBlock[];
  initialContributors: User[];
  availableAssets: Asset[];
}

export function DropBlocksEditorClient({
  drop,
  initialBlocks,
  initialContributors,
  availableAssets,
}: DropBlocksEditorClientProps) {
  const [blocks, setBlocks] = React.useState(initialBlocks);
  const [contributors, setContributors] = React.useState(initialContributors);
  const [title, setTitle] = React.useState(drop.title);
  const [description, setDescription] = React.useState(drop.description || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  // Update contributors when blocks change
  React.useEffect(() => {
    const contributorMap = new Map<string, User>();
    blocks.forEach((block) => {
      if (block.asset?.uploader && !contributorMap.has(block.asset.uploader.id)) {
        contributorMap.set(block.asset.uploader.id, block.asset.uploader);
      }
    });
    setContributors(Array.from(contributorMap.values()));
  }, [blocks]);

  // Debounced saves
  const titleSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const descSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    titleSaveTimeoutRef.current = setTimeout(() => {
      if (newTitle !== drop.title && newTitle.trim()) {
        saveField("title", newTitle);
      }
    }, 1000);
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    
    if (descSaveTimeoutRef.current) {
      clearTimeout(descSaveTimeoutRef.current);
    }
    descSaveTimeoutRef.current = setTimeout(() => {
      if (newDescription !== drop.description) {
        saveField("description", newDescription);
      }
    }, 1000);
  };

  // Generate AI description
  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/drops/${drop.id}/generate`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok && data.description) {
        setDescription(data.description);
        // Auto-save the description
        await saveField("description", data.description);
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save a field to the drop
  const saveField = async (field: string, value: string) => {
    setIsSaving(true);
    try {
      await fetch(`/api/drops/${drop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  // Count posts
  const postCount = blocks.filter((b) => b.type === "post" || b.type === "featured_post").length;

  // Cleanup
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
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showPreview 
                  ? "bg-violet-500/20 text-violet-400" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {showPreview ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Preview
                </>
              )}
            </button>
            <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
              DRAFT
            </span>
            <Button
              onClick={() => setPublishDialogOpen(true)}
              disabled={postCount === 0}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      {showPreview ? (
        /* Preview mode */
        <div className="max-w-3xl mx-auto py-10 px-4">
          <DropBlocksView
            title={title}
            description={description}
            blocks={blocks}
            contributors={contributors}
          />
        </div>
      ) : (
        /* Editor mode */
        <div className="max-w-3xl mx-auto py-10 px-4">
          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Mainstream</p>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter title..."
              className="w-full text-3xl font-bold text-white bg-transparent border-none text-center outline-none placeholder:text-zinc-700"
            />
            {isSaving && (
              <p className="text-xs text-zinc-500 mt-2">Saving...</p>
            )}
          </div>

          {/* Description field - always visible, can't be removed */}
          <div className="mb-8">
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <textarea
                value={description}
                onChange={(e) => {
                  handleDescriptionChange(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
                placeholder="Add a description for your drop..."
                className="w-full min-h-[80px] bg-transparent border-none p-5 text-base leading-relaxed text-zinc-300 placeholder:text-zinc-600 resize-none outline-none text-center"
              />
              <div className="flex justify-end px-4 py-2 border-t border-zinc-800/50">
                <button
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || postCount === 0}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Block editor */}
          <BlockEditor
            dropId={drop.id}
            blocks={blocks}
            onBlocksChange={setBlocks}
            availableAssets={availableAssets}
          />

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <p className="mb-2">Your drop is empty</p>
              <p className="text-sm">Click the + button above to add content</p>
            </div>
          )}
        </div>
      )}

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

