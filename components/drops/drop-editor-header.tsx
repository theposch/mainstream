"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cloud,
  Loader2,
  Check,
  AlertCircle,
  Undo2,
  Redo2,
  Eye,
  Pencil,
  Mail,
  MoreHorizontal,
  ArchiveRestore,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface DropEditorHeaderProps {
  dropId: string;
  isPublished: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasUnsavedChanges: boolean;
  postCount: number;
  onPublish: () => void;
  onUpdate: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}

export function DropEditorHeader({
  dropId,
  isPublished,
  showPreview,
  onTogglePreview,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasUnsavedChanges,
  postCount,
  onPublish,
  onUpdate,
  onUnpublish,
  onDelete,
}: DropEditorHeaderProps) {
  const router = useRouter();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setCancelDialogOpen(true);
    } else {
      // No unsaved changes, go directly to view mode
      router.push(`/drops/${dropId}`);
    }
  };

  const handleConfirmCancel = () => {
    setCancelDialogOpen(false);
    router.push(`/drops/${dropId}`);
  };

  return (
    <>
    <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isPublished ? (
              <button
                onClick={handleCancelClick}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            ) : (
              <Link
                href="/drops?tab=drafts"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
            )}

            {/* Save Status Indicator */}
            <SaveStatusIndicator status={saveStatus} />

            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 border-l border-border pl-3">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (⌘Z)"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (⌘⇧Z)"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preview toggle */}
            <button
              onClick={onTogglePreview}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showPreview
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
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

            {/* Email preview */}
            <button
              onClick={() => window.open(`/api/drops/${dropId}/email-preview`, "_blank")}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Preview as email"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>

            {/* Status badge */}
            {isPublished ? (
              <span className="px-2.5 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                PUBLISHED
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                DRAFT
              </span>
            )}

            {/* Primary action button */}
            {isPublished ? (
              <Button
                onClick={onUpdate}
                disabled={!hasUnsavedChanges || saveStatus === "saving"}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            ) : (
              <Button onClick={onPublish} disabled={postCount === 0}>
                Publish
              </Button>
            )}

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isPublished && (
                  <DropdownMenuItem onClick={onUnpublish}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unpublish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isPublished ? "Delete" : "Delete Draft"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Warning banner for published drops */}
      {isPublished && !showPreview && (
        <div className="bg-amber-500/10 supports-[backdrop-filter]:bg-amber-500/5 border-b border-amber-500/20 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-[1920px] mx-auto flex items-center justify-center gap-2 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>
              You&apos;re editing a published drop. Changes won&apos;t be visible
              until you click Update.
            </span>
          </div>
        </div>
      )}
    </div>

    {/* Cancel confirmation dialog for published drops */}
    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to cancel? Your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

// Extracted sub-component for save status
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "idle" && (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>All changes saved</span>
        </>
      )}
      {status === "pending" && (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Editing...</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}

