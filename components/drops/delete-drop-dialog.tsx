"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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

interface DeleteDropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropId: string;
  dropTitle: string;
  onDeleted: () => void;
}

export const DeleteDropDialog = React.memo(function DeleteDropDialog({
  open,
  onOpenChange,
  dropId,
  dropTitle,
  onDeleted,
}: DeleteDropDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset error when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/drops/${dropId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete draft");
      }

      onDeleted();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to delete draft:", err);
      setError(err instanceof Error ? err.message : "Failed to delete draft. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [dropId, onDeleted, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Draft</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{dropTitle}&rdquo;? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Error feedback */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

