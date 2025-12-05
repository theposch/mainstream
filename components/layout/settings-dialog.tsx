"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Bell, 
  Lock, 
  Link2, 
  Loader2,
  Github,
  Twitter,
  Globe,
  Check,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useUser } from "@/lib/auth/use-user";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "notifications" | "privacy" | "connected";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("notifications");

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [commentNotifications, setCommentNotifications] = React.useState(true);
  const [likeNotifications, setLikeNotifications] = React.useState(true);
  const [followNotifications, setFollowNotifications] = React.useState(true);

  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = React.useState<"public" | "private">("public");
  const [showEmail, setShowEmail] = React.useState(false);
  const [showLikes, setShowLikes] = React.useState(true);
  const [allowIndexing, setAllowIndexing] = React.useState(true);

  // Figma integration state
  const [figmaToken, setFigmaToken] = React.useState("");
  const [figmaConnected, setFigmaConnected] = React.useState(false);
  const [figmaTokenPreview, setFigmaTokenPreview] = React.useState<string | null>(null);
  const [figmaConnectedAt, setFigmaConnectedAt] = React.useState<string | null>(null);
  const [figmaLoading, setFigmaLoading] = React.useState(false);
  const [figmaError, setFigmaError] = React.useState<string | null>(null);
  const [figmaSuccess, setFigmaSuccess] = React.useState<string | null>(null);
  const [showFigmaInput, setShowFigmaInput] = React.useState(false);

  // Fetch Figma integration status
  React.useEffect(() => {
    if (open && user) {
      fetchFigmaStatus();
    }
  }, [open, user]);

  const fetchFigmaStatus = async () => {
    try {
      const response = await fetch('/api/users/me/integrations');
      if (response.ok) {
        const data = await response.json();
        setFigmaConnected(data.integrations?.figma?.connected || false);
        setFigmaTokenPreview(data.integrations?.figma?.tokenPreview || null);
        setFigmaConnectedAt(data.integrations?.figma?.connectedAt || null);
      }
    } catch (error) {
      console.error('Failed to fetch Figma status:', error);
    }
  };

  const handleFigmaConnect = async () => {
    if (!figmaToken.trim()) {
      setFigmaError('Please enter your Figma token');
      return;
    }

    setFigmaLoading(true);
    setFigmaError(null);
    setFigmaSuccess(null);

    try {
      const response = await fetch('/api/users/me/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'figma', token: figmaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFigmaError(data.error || 'Failed to connect Figma');
        return;
      }

      setFigmaConnected(true);
      setFigmaTokenPreview(data.integration?.tokenPreview || null);
      setFigmaConnectedAt(data.integration?.connectedAt || null);
      setFigmaSuccess('Figma connected successfully!');
      setFigmaToken('');
      setShowFigmaInput(false);
    } catch (error) {
      setFigmaError('Failed to connect Figma');
    } finally {
      setFigmaLoading(false);
    }
  };

  const handleFigmaDisconnect = async () => {
    setFigmaLoading(true);
    setFigmaError(null);
    setFigmaSuccess(null);

    try {
      const response = await fetch('/api/users/me/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'figma', token: null }),
      });

      if (!response.ok) {
        const data = await response.json();
        setFigmaError(data.error || 'Failed to disconnect Figma');
        return;
      }

      setFigmaConnected(false);
      setFigmaTokenPreview(null);
      setFigmaConnectedAt(null);
      setFigmaSuccess('Figma disconnected');
    } catch (error) {
      setFigmaError('Failed to disconnect Figma');
    } finally {
      setFigmaLoading(false);
    }
  };

  const tabs: TabConfig[] = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "connected", label: "Connected Accounts", icon: Link2 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "notifications":
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
              
              <ToggleItem
                label="Email notifications"
                description="Receive notifications via email"
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />

              <ToggleItem
                label="Push notifications"
                description="Receive push notifications in your browser"
                checked={pushNotifications}
                onChange={setPushNotifications}
              />
            </div>

            <div className="border-t border-border pt-4 mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Activity Notifications</h3>
              
              <ToggleItem
                label="Comments"
                description="When someone comments on your work"
                checked={commentNotifications}
                onChange={setCommentNotifications}
              />

              <ToggleItem
                label="Likes"
                description="When someone likes your work"
                checked={likeNotifications}
                onChange={setLikeNotifications}
              />

              <ToggleItem
                label="Follows"
                description="When someone follows you"
                checked={followNotifications}
                onChange={setFollowNotifications}
              />
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Profile Privacy</h3>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="profileVisibility"
                    checked={profileVisibility === "public"}
                    onChange={() => setProfileVisibility("public")}
                    className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-ring"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Public</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anyone can view your profile and work
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="profileVisibility"
                    checked={profileVisibility === "private"}
                    onChange={() => setProfileVisibility("private")}
                    className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-ring"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Private</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only you can view your profile
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Visibility Settings</h3>
              
              <ToggleItem
                label="Show email address"
                description="Display your email on your profile"
                checked={showEmail}
                onChange={setShowEmail}
              />

              <ToggleItem
                label="Show liked shots"
                description="Let others see what you've liked"
                checked={showLikes}
                onChange={setShowLikes}
              />

              <ToggleItem
                label="Search engine indexing"
                description="Allow search engines to index your profile"
                checked={allowIndexing}
                onChange={setAllowIndexing}
              />
            </div>
          </div>
        );

      case "connected":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-6">
              Connect your accounts to enable additional features
            </p>

            {/* Figma Integration - Special Treatment */}
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                    <span className="text-lg">🎨</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Figma</p>
                      {figmaConnected && (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {figmaConnected && figmaTokenPreview
                        ? `Token: ${figmaTokenPreview}`
                        : "Enable frame-specific thumbnails for Figma embeds"}
                    </p>
                  </div>
                </div>
                {figmaConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFigmaDisconnect}
                    disabled={figmaLoading}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    {figmaLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowFigmaInput(!showFigmaInput)}
                    disabled={figmaLoading}
                  >
                    Connect
                  </Button>
                )}
              </div>

              {/* Figma Token Input */}
              {showFigmaInput && !figmaConnected && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="figma-token" className="text-xs font-medium">
                      Personal Access Token
                    </Label>
                    <Input
                      id="figma-token"
                      type="password"
                      value={figmaToken}
                      onChange={(e) => setFigmaToken(e.target.value)}
                      placeholder="figd_xxxxxxxxxxxxx"
                      className="bg-background border-border font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate a token from{" "}
                      <a
                        href="https://www.figma.com/developers/api#access-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Figma Settings
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleFigmaConnect}
                      disabled={figmaLoading || !figmaToken.trim()}
                    >
                      {figmaLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Token
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowFigmaInput(false);
                        setFigmaToken('');
                        setFigmaError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Success/Error Messages */}
              {figmaSuccess && (
                <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-500 flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  {figmaSuccess}
                </div>
              )}
              {figmaError && (
                <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {figmaError}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why connect Figma?</p>
              <p>
                When you share a Figma link with a specific frame selected, we can render
                a thumbnail of that exact frame instead of the entire file. Your token
                is stored securely and only used server-side.
              </p>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-4">Other accounts (coming soon)</p>
              
              <ConnectedAccountItem
                icon={Github}
                name="GitHub"
                description="Connect your GitHub account"
                connected={false}
              />

              <div className="mt-3">
                <ConnectedAccountItem
                  icon={Twitter}
                  name="Twitter"
                  description="Connect your Twitter account"
                  connected={false}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-foreground text-xl">
            Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage your notification and privacy preferences
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-1" role="tablist" aria-label="Settings sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative px-4 py-3 text-sm font-medium transition-colors rounded-t-md",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    activeTab === tab.id 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeSettingsTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div 
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 200px)" }}
          role="tabpanel"
          id={`${activeTab}-panel`}
        >
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-0 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Components

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleItem({ label, description, checked, onChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          checked ? "bg-primary" : "bg-muted"
        )}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

interface ConnectedAccountItemProps {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  connected: boolean;
  accountInfo?: string;
}

function ConnectedAccountItem({ 
  icon: Icon, 
  name, 
  description, 
  connected, 
  accountInfo 
}: ConnectedAccountItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">
            {connected && accountInfo ? accountInfo : description}
          </p>
        </div>
      </div>
      <Button
        variant={connected ? "outline" : "default"}
        size="sm"
        className={connected ? "text-destructive hover:bg-destructive/10" : ""}
      >
        {connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
