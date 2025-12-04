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
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Users } from "lucide-react";

interface DropPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropId: string;
  dropTitle: string;
}

export function DropPublishDialog({
  open,
  onOpenChange,
  dropId,
  dropTitle,
}: DropPublishDialogProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [notifyTeam, setNotifyTeam] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/drops/${dropId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_team: notifyTeam }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish");
      }

      onOpenChange(false);
      router.push(`/drops/${dropId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish drop");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Publish Drop</DialogTitle>
          <DialogDescription>
            Once published, the rest of your team will be able to see this drop.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Notify teammates toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-zinc-400" />
              <Label htmlFor="notify" className="font-normal">
                Notify teammates
              </Label>
            </div>
            <button
              id="notify"
              type="button"
              role="switch"
              aria-checked={notifyTeam}
              onClick={() => setNotifyTeam(!notifyTeam)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${notifyTeam ? "bg-violet-600" : "bg-zinc-700"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${notifyTeam ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          {/* Recipients */}
          {notifyTeam && (
            <div className="flex items-center gap-2 pl-7">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled
              >
                <Users className="h-4 w-4" />
                Entire team
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Keep editing
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

