"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Loader2,
  Slack,
  CheckCircle2,
  AlertCircle,
  Unlink,
  ExternalLink,
  Send,
  Key,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SlackChannel } from "@/lib/utils/slack";

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
  credentials_configured: boolean;
  credentials_from_env: boolean;
  app_config: { client_id: string; updated_at?: string } | null;
  connected: boolean;
  integration: SlackIntegrationInfo | null;
}

// ─── Step card ──────────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  description,
  complete,
  locked,
  children,
}: {
  step: number;
  title: string;
  description: string;
  complete: boolean;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-5 space-y-4 transition-colors ${
        locked
          ? "border-border/40 opacity-50"
          : complete
          ? "border-green-500/30"
          : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            complete
              ? "bg-green-500/20 text-green-400"
              : locked
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-sm ${
              locked ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {!locked && children && <div className="pl-10">{children}</div>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SlackTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Status state
  const [status, setStatus] = React.useState<SlackStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Credentials form state
  const [showCredForm, setShowCredForm] = React.useState(false);
  const [clientId, setClientId] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState("");
  const [savingCreds, setSavingCreds] = React.useState(false);
  const [deletingCreds, setDeletingCreds] = React.useState(false);

  // Workspace disconnect
  const [disconnecting, setDisconnecting] = React.useState(false);

  // Test message state
  const [testChannel, setTestChannel] = React.useState("");
  const [channels, setChannels] = React.useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = React.useState(false);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [testResult, setTestResult] = React.useState<string | null>(null);

  // Manifest copy state
  const [copiedManifest, setCopiedManifest] = React.useState(false);

  const generateManifest = React.useCallback((): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    return JSON.stringify(
      {
        _metadata: { major_version: 1, minor_version: 1 },
        display_information: {
          name: "Mainstream",
          description: "Design asset collaboration and notifications",
          background_color: "#09090b",
        },
        features: {
          bot_user: {
            display_name: "Mainstream",
            always_online: false,
          },
        },
        oauth_config: {
          redirect_urls: [`${origin}/api/admin/slack/callback`],
          scopes: {
            bot: ["chat:write", "channels:read", "groups:read"],
          },
        },
        settings: {
          org_deploy_enabled: false,
          socket_mode_enabled: false,
          token_rotation_enabled: false,
        },
      },
      null,
      2
    );
  }, []);

  const handleCopyManifest = React.useCallback(() => {
    navigator.clipboard.writeText(generateManifest()).then(() => {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    });
  }, [generateManifest]);

  // Read OAuth redirect results from URL
  React.useEffect(() => {
    const slackError = searchParams.get("slack_error");
    const slackConnected = searchParams.get("slack_connected");

    if (slackError) {
      setError(`Slack connection failed: ${decodeURIComponent(slackError)}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("slack_error");
      url.searchParams.delete("tab");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    } else if (slackConnected === "1") {
      setSuccessMsg("Slack workspace connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("slack_connected");
      url.searchParams.delete("tab");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  }, [searchParams, router]);

  const loadChannels = React.useCallback(async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/admin/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  const fetchStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slack");
      if (!res.ok) throw new Error("Failed to fetch Slack status");
      const data: SlackStatusResponse = await res.json();
      setStatus(data);
      if (data.connected) {
        loadChannels();
      }
    } catch {
      setError("Failed to load Slack integration status.");
    } finally {
      setLoading(false);
    }
  }, [loadChannels]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Credentials handlers ──────────────────────────────────────────────────

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/slack/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save credentials");
      setSuccessMsg("Credentials saved successfully.");
      setShowCredForm(false);
      setClientId("");
      setClientSecret("");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSavingCreds(false);
    }
  };

  const handleDeleteCredentials = async () => {
    if (!confirm("Remove saved credentials? You will need to re-enter them to reconnect.")) return;
    setDeletingCreds(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/slack/config", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove credentials");
      setSuccessMsg("Credentials removed.");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove credentials");
    } finally {
      setDeletingCreds(false);
    }
  };

  // ── Workspace handlers ────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Slack? This will stop all Slack notifications from Mainstream.")) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/slack", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setSuccessMsg("Slack workspace disconnected.");
      setChannels([]);
      setTestChannel("");
      setTestResult(null);
      await fetchStatus();
    } catch {
      setError("Failed to disconnect Slack. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Test message ──────────────────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!testChannel) return;
    setSendingTest(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: testChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send test message");
      setTestResult("Test message sent! Check your Slack channel.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test message");
    } finally {
      setSendingTest(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const step1Complete = status?.credentials_configured ?? false;
  const step2Complete = status?.connected ?? false;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Slack Integration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a Slack workspace to receive notifications when drops are published,
          assets are uploaded, and scheduled drops are ready to review.
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            className="text-green-400/60 hover:text-green-400"
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            className="text-red-400/60 hover:text-red-400"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Step 1: App credentials ─────────────────────────────────────── */}
      <StepCard
        step={1}
        title="Create a Slack App & enter credentials"
        description="Create a Slack App at api.slack.com/apps, add OAuth scopes, and paste your credentials below."
        complete={step1Complete}
      >
        {status?.credentials_from_env ? (
          /* Locked via env vars */
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Credentials are set via environment variables and cannot be edited here.
            </span>
          </div>
        ) : step1Complete && !showCredForm ? (
          /* Saved — show summary + update/remove actions */
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <span className="text-xs text-muted-foreground block mb-0.5">Client ID</span>
              <span className="font-mono">{status?.app_config?.client_id}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClientId(status?.app_config?.client_id ?? "");
                  setClientSecret("");
                  setShowCredForm(true);
                }}
              >
                <Key className="mr-1.5 h-3.5 w-3.5" />
                Update credentials
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                onClick={handleDeleteCredentials}
                disabled={deletingCreds}
              >
                {deletingCreds ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Remove
              </Button>
            </div>
          </div>
        ) : (
          /* Guided setup: manifest → Slack → paste credentials */
          <form onSubmit={handleSaveCredentials} className="space-y-5">

            {/* Sub-step 1: Generate manifest */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <p className="text-sm font-medium text-foreground">
                  Copy your app manifest
                </p>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                The manifest pre-configures all required OAuth scopes and your redirect URL automatically.
              </p>

              {/* Manifest preview */}
              <div className="rounded-md border border-border overflow-hidden pl-7">
                <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-mono text-muted-foreground">
                    slack-app-manifest.json
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyManifest}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedManifest ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="px-3 py-2.5 text-xs font-mono text-muted-foreground overflow-x-auto max-h-40 leading-relaxed">
                  {generateManifest()}
                </pre>
              </div>

              <div className="flex gap-2 pl-7">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyManifest}
                  className="gap-2"
                >
                  {copiedManifest ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedManifest ? "Copied!" : "Copy manifest"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
                  <a
                    href="https://api.slack.com/apps?new_app=1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Slack
                  </a>
                </Button>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Sub-step 2: Create in Slack */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                <p className="text-sm font-medium text-foreground">
                  Create the app in Slack
                </p>
              </div>
              <ol className="pl-7 space-y-1 text-xs text-muted-foreground list-decimal list-inside">
                <li>
                  Click <span className="font-medium text-foreground">Create New App</span>
                </li>
                <li>
                  Choose <span className="font-medium text-foreground">From an app manifest</span>
                </li>
                <li>Select your workspace and paste the manifest</li>
                <li>
                  Review the settings and click{" "}
                  <span className="font-medium text-foreground">Create</span>
                </li>
                <li>
                  Go to <span className="font-medium text-foreground">Basic Information</span> and
                  copy your <span className="font-medium text-foreground">Client ID</span> and{" "}
                  <span className="font-medium text-foreground">Client Secret</span>
                </li>
              </ol>
            </div>

            <div className="border-t border-border" />

            {/* Sub-step 3: Paste credentials */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                <p className="text-sm font-medium text-foreground">
                  Paste your credentials here
                </p>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label htmlFor="slack-client-id" className="text-sm">
                  Client ID
                </Label>
                <Input
                  id="slack-client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="1234567890.987654321"
                  disabled={savingCreds}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5 pl-7">
                <Label htmlFor="slack-client-secret" className="text-sm">
                  Client Secret
                </Label>
                <Input
                  id="slack-client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  disabled={savingCreds}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground pl-0">
                  Stored with AES-256 encryption. The secret is never exposed after saving.
                </p>
              </div>

              <div className="flex gap-2 pl-7">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingCreds || !clientId.trim() || !clientSecret.trim()}
                >
                  {savingCreds ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Save credentials
                </Button>
                {showCredForm && step1Complete && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCredForm(false);
                      setClientId("");
                      setClientSecret("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </StepCard>

      {/* ── Step 2: Connect workspace ────────────────────────────────────── */}
      <StepCard
        step={2}
        title="Connect your Slack workspace"
        description="Authorize Mainstream to post messages to your workspace via Slack OAuth."
        complete={step2Complete}
        locked={!step1Complete}
      >
        {step2Complete && status?.integration ? (
          /* Connected workspace summary */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status.integration.workspace_icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={status.integration.workspace_icon}
                  alt={status.integration.workspace_name}
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#611f69]">
                  <Slack className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">
                  {status.integration.workspace_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected{" "}
                  {new Date(status.integration.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" · "}
                  <span className="font-mono">{status.integration.workspace_id}</span>
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-green-400 shrink-0">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Active
              </span>
            </div>
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
              Disconnect workspace
            </Button>
          </div>
        ) : step1Complete ? (
          /* Connect button */
          <Button asChild size="sm" className="gap-2">
            <a href="/api/admin/slack/connect">
              <ExternalLink className="h-4 w-4" />
              Connect Slack Workspace
            </a>
          </Button>
        ) : null}
      </StepCard>

      {/* ── Step 3: Send a test message ──────────────────────────────────── */}
      {step2Complete && (
        <StepCard
          step={3}
          title="Send a test message"
          description="Verify your integration is working by posting a test message to a channel."
          complete={false}
        >
          {testResult && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400 mb-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {testResult}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Channel</Label>
              {loadingChannels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading channels…
                </div>
              ) : channels.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>No channels available. Make sure the bot is added to at least one channel.</span>
                  <button
                    onClick={loadChannels}
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              ) : (
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value)}
                  disabled={sendingTest}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a channel…</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                      {ch.is_private ? " 🔒" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={!testChannel || sendingTest || loadingChannels}
              className="gap-2 shrink-0"
            >
              {sendingTest ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send test
            </Button>
          </div>
        </StepCard>
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
