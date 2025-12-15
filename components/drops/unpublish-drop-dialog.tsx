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

interface UnpublishDropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropId: string;
  dropTitle: string;
  onUnpublished: () => void;
}

export const UnpublishDropDialog = React.memo(function UnpublishDropDialog({
  open,
  onOpenChange,
  dropId,
  dropTitle,
  onUnpublished,
}: UnpublishDropDialogProps) {
  const [isUnpublishing, setIsUnpublishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset error when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const handleUnpublish = React.useCallback(async () => {
    setIsUnpublishing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/drops/${dropId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unpublish drop");
      }

      onUnpublished();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to unpublish drop:", err);
      setError(err instanceof Error ? err.message : "Failed to unpublish drop. Please try again.");
    } finally {
      setIsUnpublishing(false);
    }
  }, [dropId, onUnpublished, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unpublish this drop?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{dropTitle}&rdquo; will be moved back to drafts. Team members who already received the email notification can still access this page until you publish again or delete.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Error feedback */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUnpublishing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnpublish}
            disabled={isUnpublishing}
          >
            {isUnpublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unpublishing...
              </>
            ) : (
              "Unpublish"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

