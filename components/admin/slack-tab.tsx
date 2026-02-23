"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Slack, CheckCircle2, AlertCircle, Unlink, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlackIntegrationInfo {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_icon?: string | null;
  bot_user_id: string;
  installed_by?: string | null;
  created_at: string;
}

interface SlackStatusResponse {
  app_configured: boolean;
  connected: boolean;
  integration: SlackIntegrationInfo | null;
}

export function SlackTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = React.useState<SlackStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Read OAuth redirect results from URL
  React.useEffect(() => {
    const slackError = searchParams.get("slack_error");
    const slackConnected = searchParams.get("slack_connected");

    if (slackError) {
      setError(`Slack connection failed: ${decodeURIComponent(slackError)}`);
      // Remove query param from URL without full reload
      const url = new URL(window.location.href);
      url.searchParams.delete("slack_error");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    } else if (slackConnected === "1") {
      setSuccessMsg("Slack workspace connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("slack_connected");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [searchParams, router]);

  const fetchStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slack");
      if (!res.ok) throw new Error("Failed to fetch Slack status");
      const data: SlackStatusResponse = await res.json();
      setStatus(data);
    } catch {
      setError("Failed to load Slack integration status.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Slack? This will stop all Slack notifications.")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/slack", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setSuccessMsg("Slack workspace disconnected.");
      await fetchStatus();
    } catch {
      setError("Failed to disconnect Slack. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Slack Integration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a Slack workspace to receive notifications when drops are published,
          assets are uploaded, and scheduled drops are ready.
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!status?.app_configured ? (
        /* App credentials not set */
        <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Slack className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Slack credentials not configured</p>
              <p className="text-sm text-muted-foreground">
                Set <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">SLACK_CLIENT_ID</code> and{" "}
                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">SLACK_CLIENT_SECRET</code>{" "}
                environment variables to enable Slack integration.
              </p>
            </div>
          </div>
        </div>
      ) : status.connected && status.integration ? (
        /* Connected */
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.integration.workspace_icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={status.integration.workspace_icon}
                  alt={status.integration.workspace_name}
                  className="h-10 w-10 rounded-lg"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#611f69]">
                  <Slack className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  {status.integration.workspace_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected{" "}
                  {new Date(status.integration.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Connected
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Workspace ID:{" "}
              <span className="font-mono text-xs">{status.integration.workspace_id}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlink className="mr-1.5 h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        /* Not connected */
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#611f69]">
              <Slack className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground">Connect to Slack</p>
              <p className="text-sm text-muted-foreground">
                Authorize Mainstream to post messages to your workspace.
              </p>
            </div>
          </div>

          <Button asChild className="gap-2">
            <a href="/api/admin/slack/connect">
              <ExternalLink className="h-4 w-4" />
              Connect Slack Workspace
            </a>
          </Button>
        </div>
      )}

      {/* Feature list */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What Slack notifications do
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">•</span>
            Post to a channel when a Drop is published
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">•</span>
            Notify a channel when a scheduled drop is ready to review
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">•</span>
            Alert a stream&apos;s channel when a new asset is uploaded
          </li>
        </ul>
      </div>
    </div>
  );
}
