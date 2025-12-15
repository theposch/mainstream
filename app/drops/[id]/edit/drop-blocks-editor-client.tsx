"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Loader2 } from "lucide-react";
import { BlockEditor, DropBlocksView } from "@/components/drops/blocks";
import { DropEditorHeader } from "@/components/drops/drop-editor-header";
import { DropPublishDialog } from "@/components/drops/drop-publish-dialog";
import { DeleteDropDialog } from "@/components/drops/delete-drop-dialog";
import { UnpublishDropDialog } from "@/components/drops/unpublish-drop-dialog";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import type { Drop, DropBlock, Asset, User } from "@/lib/types/database";

interface DropBlocksEditorClientProps {
  drop: Drop;
  initialBlocks: DropBlock[];
  initialContributors: User[];
  availableAssets: Asset[];
}

// Combined editor state for undo/redo
interface EditorState {
  title: string;
  description: string;
  blocks: DropBlock[];
}

export function DropBlocksEditorClient({
  drop,
  initialBlocks,
  initialContributors,
  availableAssets,
}: DropBlocksEditorClientProps) {
  const router = useRouter();
  
  // Use undo/redo hook for ALL editor state (title, description, blocks)
  const {
    state: editorState,
    setState: setEditorState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<EditorState>({
    title: drop.title,
    description: drop.description || "",
    blocks: initialBlocks,
  }, { maxHistorySize: 50 });
  
  // Destructure for convenience
  const { title, description, blocks } = editorState;
  
  // Helper functions to update individual parts of editor state
  // Using refs to avoid stale closures while still allowing undo/redo to work
  const editorStateRef = React.useRef(editorState);
  editorStateRef.current = editorState;
  
  const setTitle = React.useCallback((newTitle: string, skipHistory = false) => {
    setEditorState({ ...editorStateRef.current, title: newTitle }, skipHistory);
  }, [setEditorState]);
  
  const setDescription = React.useCallback((newDescription: string, skipHistory = false) => {
    setEditorState({ ...editorStateRef.current, description: newDescription }, skipHistory);
  }, [setEditorState]);
  
  const setBlocks = React.useCallback((newBlocks: DropBlock[], skipHistory = false) => {
    setEditorState({ ...editorStateRef.current, blocks: newBlocks }, skipHistory);
  }, [setEditorState]);
  
  const [contributors, setContributors] = React.useState(initialContributors);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  
  // Track if the drop is published
  const isPublished = drop.status === 'published';
  
  // Save status tracking: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const savedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Track dirty state for published drops (explicit save mode)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const originalTitleRef = React.useRef(drop.title);
  const originalDescriptionRef = React.useRef(drop.description || "");

  // Warn user about unsaved changes when navigating away
  // For drafts: warn if auto-save is pending
  // For published: warn if there are unsaved changes
  const hasPendingChanges = saveStatus === 'pending' || saveStatus === 'saving';
  useUnsavedChanges(hasPendingChanges || hasUnsavedChanges);

  // Handle successful deletion - redirect to drafts list
  const handleDeleted = React.useCallback(() => {
    router.push("/drops?tab=drafts");
  }, [router]);

  // Handle successful unpublish - redirect to drafts list
  const handleUnpublished = React.useCallback(() => {
    router.push("/drops?tab=drafts");
  }, [router]);

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

  // Debounced saves (only for drafts)
  const titleSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const descSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    if (isPublished) {
      // For published drops, just track changes - no auto-save
      const isDirty = newTitle !== originalTitleRef.current || description !== originalDescriptionRef.current;
      setHasUnsavedChanges(isDirty);
      setSaveStatus(isDirty ? 'pending' : 'idle');
    } else {
      // For drafts, use auto-save
      setSaveStatus('pending');
      
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      titleSaveTimeoutRef.current = setTimeout(() => {
        if (newTitle !== drop.title && newTitle.trim()) {
          saveField("title", newTitle);
        } else {
          setSaveStatus('idle');
        }
      }, 1000);
    }
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    
    if (isPublished) {
      // For published drops, just track changes - no auto-save
      const isDirty = title !== originalTitleRef.current || newDescription !== originalDescriptionRef.current;
      setHasUnsavedChanges(isDirty);
      setSaveStatus(isDirty ? 'pending' : 'idle');
    } else {
      // For drafts, use auto-save
      setSaveStatus('pending');
      
      if (descSaveTimeoutRef.current) {
        clearTimeout(descSaveTimeoutRef.current);
      }
      descSaveTimeoutRef.current = setTimeout(() => {
        if (newDescription !== drop.description) {
          saveField("description", newDescription);
        } else {
          setSaveStatus('idle');
        }
      }, 1000);
    }
  };

  // Save all changes at once (for published drops)
  const handleUpdatePublished = async () => {
    setSaveStatus('saving');
    
    try {
      const updates: Record<string, string> = {};
      if (title !== originalTitleRef.current) {
        updates.title = title;
      }
      if (description !== originalDescriptionRef.current) {
        updates.description = description;
      }
      
      if (Object.keys(updates).length > 0) {
        const response = await fetch(`/api/drops/${drop.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update drop");
        }
        
        // Update refs to new values
        originalTitleRef.current = title;
        originalDescriptionRef.current = description;
      }
      
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Failed to update drop:", error);
      setSaveStatus('error');
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
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
    setSaveStatus('saving');
    
    // Clear any existing "saved" timeout
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }
    
    try {
      const response = await fetch(`/api/drops/${drop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save ${field}`);
      }
      
      setSaveStatus('saved');
      // After 2 seconds, go back to idle
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      setSaveStatus('error');
      // After 3 seconds, reset to idle
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
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
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  // Callback for BlockEditor to report save status
  const handleBlockSaveStatus = React.useCallback((status: 'saving' | 'saved' | 'error') => {
    setSaveStatus(status);
    
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }
    
    if (status === 'saved' || status === 'error') {
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, status === 'error' ? 3000 : 2000);
    }
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <DropEditorHeader
        dropId={drop.id}
        isPublished={isPublished}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        saveStatus={saveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasUnsavedChanges={hasUnsavedChanges}
        postCount={postCount}
        onPublish={() => setPublishDialogOpen(true)}
        onUpdate={handleUpdatePublished}
        onUnpublish={() => setUnpublishDialogOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {showPreview ? (
        /* Preview mode */
        <div className="max-w-3xl mx-auto py-10 px-4">
          <DropBlocksView
            title={title}
            description={description}
            blocks={blocks}
            contributors={contributors}
            dateRangeStart={drop.date_range_start}
            dateRangeEnd={drop.date_range_end}
          />
        </div>
      ) : (
        /* Editor mode */
        <div className="max-w-3xl mx-auto py-10 px-4">
          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Mainstream</p>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter title..."
              className="w-full text-3xl font-bold text-foreground bg-transparent border-none text-center outline-none placeholder:text-muted-foreground/50"
            />
            {drop.date_range_start && drop.date_range_end && (
              <p className="text-sm text-muted-foreground mt-2">
                {/* Extract date portion to avoid timezone shifts */}
                {new Date(`${drop.date_range_start.substring(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {new Date(`${drop.date_range_end.substring(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Description field - always visible, can't be removed */}
          <div className="mb-6">
            <div className="border border-border rounded-xl overflow-hidden">
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
                className="w-full min-h-[80px] bg-transparent border-none p-5 text-base leading-relaxed text-muted-foreground placeholder:text-muted-foreground/50 resize-none outline-none text-center"
              />
              <div className="flex justify-end px-4 py-2 border-t border-border/50">
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

          {/* Contributors section - fixed, can't be removed */}
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Overlapping avatars */}
            {contributors.length > 0 && (
              <div className="flex items-center -space-x-3">
                {contributors.slice(0, 5).map((contributor, index) => (
                  <div
                    key={contributor.id}
                    className="relative rounded-full border-2 border-black overflow-hidden"
                    style={{ zIndex: contributors.length - index }}
                  >
                    {contributor.avatar_url ? (
                      <Image
                        src={contributor.avatar_url}
                        alt={contributor.display_name}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted flex items-center justify-center text-foreground text-sm font-medium">
                        {contributor.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {contributors.length > 5 && (
                  <div
                    className="relative w-12 h-12 rounded-full border-2 border-background bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium"
                    style={{ zIndex: 0 }}
                  >
                    +{contributors.length - 5}
                  </div>
                )}
              </div>
            )}
            
            {/* Post count and contributor names */}
            <p className="text-muted-foreground text-sm">
              {postCount > 0 ? (
                <>
                  {postCount} post{postCount !== 1 ? "s" : ""} from{" "}
                  {contributors.length === 0 ? (
                    "no one yet"
                  ) : contributors.length === 1 ? (
                    contributors[0].display_name
                  ) : contributors.length === 2 ? (
                    `${contributors[0].display_name} and ${contributors[1].display_name}`
                  ) : (
                    `${contributors[0].display_name}, ${contributors[1].display_name}, and ${contributors.length - 2} other${contributors.length - 2 > 1 ? "s" : ""}`
                  )}
                </>
              ) : (
                "No posts added yet"
              )}
            </p>
          </div>

          {/* Fixed divider - can't be removed */}
          <hr className="border-border mb-8" />

          {/* Block editor */}
          <BlockEditor
            dropId={drop.id}
            blocks={blocks}
            onBlocksChange={setBlocks}
            availableAssets={availableAssets}
            onSaveStatus={handleBlockSaveStatus}
          />

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
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

      {/* Delete confirmation dialog */}
      <DeleteDropDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        dropId={drop.id}
        dropTitle={title}
        dropStatus={drop.status as 'draft' | 'published'}
        onDeleted={handleDeleted}
      />

      {/* Unpublish confirmation dialog */}
      <UnpublishDropDialog
        open={unpublishDialogOpen}
        onOpenChange={setUnpublishDialogOpen}
        dropId={drop.id}
        dropTitle={title}
        onUnpublished={handleUnpublished}
      />
    </div>
  );
}

