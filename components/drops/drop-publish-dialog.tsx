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
import { Loader2, Bell, Users, Hash } from "lucide-react";
import { triggerConfetti } from "@/lib/utils/confetti";
import type { SlackChannel } from "@/lib/utils/slack";

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
  dropTitle: _dropTitle,
}: DropPublishDialogProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [notifyTeam, setNotifyTeam] = React.useState(true);
  const [notifySlack, setNotifySlack] = React.useState(false);
  const [slackChannelId, setSlackChannelId] = React.useState("");
  const [slackConnected, setSlackConnected] = React.useState(false);
  const [slackChannels, setSlackChannels] = React.useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check Slack connection when dialog opens
  React.useEffect(() => {
    if (!open) return;
    fetch("/api/slack/status")
      .then((r) => r.json())
      .then((d) => setSlackConnected(!!d.connected))
      .catch(() => setSlackConnected(false));
  }, [open]);

  // Load channels when Slack toggle is turned on
  React.useEffect(() => {
    if (!notifySlack || !slackConnected) return;
    setLoadingChannels(true);
    fetch("/api/slack/channels")
      .then((r) => r.json())
      .then((d) => {
        setSlackChannels(d.channels ?? []);
        if (d.channels?.length && !slackChannelId) {
          setSlackChannelId(d.channels[0].id);
        }
      })
      .catch(() => setSlackChannels([]))
      .finally(() => setLoadingChannels(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifySlack, slackConnected]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/drops/${dropId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_team: notifyTeam,
          notify_slack: notifySlack && slackConnected,
          slack_channel_id: notifySlack && slackConnected ? slackChannelId : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish");
      }

      onOpenChange(false);
      triggerConfetti();
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
              <Bell className="h-4 w-4 text-muted-foreground" />
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
                ${notifyTeam ? "bg-violet-600" : "bg-muted"}
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

          {/* Slack toggle (only shown when connected) */}
          {slackConnected && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="notify-slack" className="font-normal">
                    Post to Slack
                  </Label>
                </div>
                <button
                  id="notify-slack"
                  type="button"
                  role="switch"
                  aria-checked={notifySlack}
                  onClick={() => setNotifySlack(!notifySlack)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${notifySlack ? "bg-violet-600" : "bg-muted"}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${notifySlack ? "translate-x-6" : "translate-x-1"}
                    `}
                  />
                </button>
              </div>

              {notifySlack && (
                <div className="pl-7">
                  {loadingChannels ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading channels…
                    </div>
                  ) : (
                    <select
                      value={slackChannelId}
                      onChange={(e) => setSlackChannelId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {slackChannels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name}
                        </option>
                      ))}
                      {slackChannels.length === 0 && (
                        <option value="">No channels found</option>
                      )}
                    </select>
                  )}
                </div>
              )}
            </>
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
