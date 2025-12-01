"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  User, 
  Bell, 
  Lock, 
  Link2, 
  Camera, 
  Save,
  Loader2,
  Github,
  Twitter,
  Mail,
  Globe
} from "lucide-react";
import { useUser } from "@/lib/auth/use-user";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "account" | "notifications" | "privacy" | "connected";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("account");
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Account settings state
  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");

  // Initialize form with user data
  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
    }
  }, [user]);

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

  const tabs: TabConfig[] = [
    { id: "account", label: "Account", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "connected", label: "Connected Accounts", icon: Link2 },
  ];

  const handleSave = async () => {
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          username,
          email,
          bio
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      
      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        // Refresh the page to update user data throughout the app
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSuccessMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                  <AvatarFallback className="text-2xl">
                    {user?.username?.substring(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Change avatar"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">Profile Photo</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Click to upload a new avatar. JPG, PNG or GIF. Max size 2MB.
                </p>
                <Button variant="outline" size="sm" className="text-xs">
                  Upload New Photo
                </Button>
              </div>
            </div>

            {/* Account Fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                    className="bg-background border-border pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your profile URL: cosmos.so/u/{username}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="bg-background border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={160}
                  rows={3}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/160 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                    className="bg-background border-border"
                  />
                </div>

              </div>
            </div>
          </div>
        );

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
              Connect your accounts to easily share your work across platforms
            </p>

            <ConnectedAccountItem
              icon={Github}
              name="GitHub"
              description="Connect your GitHub account"
              connected={false}
            />

            <ConnectedAccountItem
              icon={Twitter}
              name="Twitter"
              description="Connect your Twitter account"
              connected={false}
            />

            <ConnectedAccountItem
              icon={Mail}
              name="Google"
              description="Connect your Google account"
              connected={true}
              accountInfo={user?.email}
            />

            <ConnectedAccountItem
              icon={Globe}
              name="Figma"
              description="Connect your Figma account"
              connected={false}
            />
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
            Manage your account settings and preferences
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

        {/* Success Message */}
        {successMessage && (
          <div 
            className="mx-6 mb-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-500"
            role="alert"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-0 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
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

