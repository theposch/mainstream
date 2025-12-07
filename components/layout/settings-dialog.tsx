"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Bell, 
  Link2, 
  Loader2,
  Github,
  Twitter,
  Check,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Mail,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { useUser } from "@/lib/auth/use-user";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "account" | "notifications" | "connected";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("account");

  // Account settings state
  const [newEmail, setNewEmail] = React.useState("");
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [emailSuccess, setEmailSuccess] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = React.useState({
    in_app_enabled: true,
    likes_enabled: true,
    comments_enabled: true,
    follows_enabled: true,
    mentions_enabled: true,
  });
  const [notificationLoading, setNotificationLoading] = React.useState(false);
  const [notificationSaving, setNotificationSaving] = React.useState(false);

  // Figma integration state
  const [figmaToken, setFigmaToken] = React.useState("");
  const [figmaConnected, setFigmaConnected] = React.useState(false);
  const [figmaTokenPreview, setFigmaTokenPreview] = React.useState<string | null>(null);
  const [figmaConnectedAt, setFigmaConnectedAt] = React.useState<string | null>(null);
  const [figmaLoading, setFigmaLoading] = React.useState(false);
  const [figmaError, setFigmaError] = React.useState<string | null>(null);
  const [figmaSuccess, setFigmaSuccess] = React.useState<string | null>(null);
  const [showFigmaInput, setShowFigmaInput] = React.useState(false);

  // Reset form state when dialog opens
  React.useEffect(() => {
    if (open) {
      setNewEmail("");
      setEmailSuccess(null);
      setEmailError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(null);
      setPasswordError(null);
      setDeletePassword("");
      setDeleteConfirmation("");
      setDeleteError(null);
      setShowDeleteConfirm(false);
    }
  }, [open]);

  // Track pending save to debounce rapid clicks
  const pendingSaveRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = React.useRef<Record<string, boolean>>({});
  // Track original values before optimistic updates for proper revert
  const originalValuesRef = React.useRef<Record<string, boolean>>({});
  // Track if a save is currently in progress to handle concurrent changes
  const saveInProgressRef = React.useRef(false);

  // Memoized fetch function
  const fetchNotificationSettings = React.useCallback(async () => {
    setNotificationLoading(true);
    try {
      const response = await fetch('/api/users/me/notification-settings');
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          in_app_enabled: data.in_app_enabled ?? true,
          likes_enabled: data.likes_enabled ?? true,
          comments_enabled: data.comments_enabled ?? true,
          follows_enabled: data.follows_enabled ?? true,
          mentions_enabled: data.mentions_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  // Fetch notification settings when dialog opens
  React.useEffect(() => {
    if (open && user) {
      fetchNotificationSettings();
    }
  }, [open, user, fetchNotificationSettings]);

  // Debounced save function - batches rapid changes
  const saveNotificationSettings = React.useCallback(async (
    updates: Record<string, boolean>,
    originalValues: Record<string, boolean>
  ) => {
    saveInProgressRef.current = true;
    setNotificationSaving(true);
    
    try {
      const response = await fetch('/api/users/me/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        // Revert to original values (not just flipping the attempted values)
        setNotificationSettings(prev => {
          const reverted = { ...prev };
          for (const key of Object.keys(updates)) {
            if (key in originalValues) {
              reverted[key as keyof typeof prev] = originalValues[key];
            }
          }
          return reverted;
        });
        console.error('Failed to save notification settings');
      }
    } catch (error) {
      // Revert to original values on error
      setNotificationSettings(prev => {
        const reverted = { ...prev };
        for (const key of Object.keys(updates)) {
          if (key in originalValues) {
            reverted[key as keyof typeof prev] = originalValues[key];
          }
        }
        return reverted;
      });
      console.error('Failed to save notification settings:', error);
    } finally {
      setNotificationSaving(false);
      saveInProgressRef.current = false;
      
      // Check if new changes accumulated while saving - trigger another save
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        const newUpdates = { ...pendingUpdatesRef.current };
        const newOriginals = { ...originalValuesRef.current };
        pendingUpdatesRef.current = {};
        originalValuesRef.current = {};
        saveNotificationSettings(newUpdates, newOriginals);
      }
    }
  }, []);

  const updateNotificationSetting = React.useCallback((key: keyof typeof notificationSettings, value: boolean) => {
    // Store original value before first optimistic update for this key
    // (only if not already stored from a previous pending change)
    setNotificationSettings(prev => {
      if (!(key in originalValuesRef.current)) {
        originalValuesRef.current[key] = prev[key];
      }
      return { ...prev, [key]: value };
    });
    
    // Batch this update with any pending updates
    pendingUpdatesRef.current[key] = value;
    
    // If save is in progress, just queue the update (it will be picked up when save completes)
    if (saveInProgressRef.current) {
      return;
    }
    
    // Clear any existing debounce timer
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
    }
    
    // Debounce: wait 300ms before sending to server
    pendingSaveRef.current = setTimeout(() => {
      const updates = { ...pendingUpdatesRef.current };
      const originals = { ...originalValuesRef.current };
      if (Object.keys(updates).length > 0) {
        pendingUpdatesRef.current = {};
        originalValuesRef.current = {};
        saveNotificationSettings(updates, originals);
      }
      pendingSaveRef.current = null;
    }, 300);
  }, [saveNotificationSettings]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
      }
    };
  }, []);

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

  // Email change handler
  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      setEmailError('Please enter a new email address');
      return;
    }

    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await fetch('/api/users/me/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailError(data.error || 'Failed to update email');
        return;
      }

      setEmailSuccess(data.message);
      setNewEmail("");
    } catch (error) {
      setEmailError('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || 'Failed to update password');
        return;
      }

      setPasswordSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/users/me/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        return;
      }

      // Redirect to login page after successful deletion
      onOpenChange(false);
      router.push('/auth/login');
    } catch (error) {
      setDeleteError('Failed to delete account');
    } finally {
      setDeleteLoading(false);
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
    { id: "account", label: "Account", icon: ShieldAlert },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "connected", label: "Connected Accounts", icon: Link2 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-8">
            {/* Change Email Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Change Email</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Current email: <span className="text-foreground">{user?.email}</span>
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-xs">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="bg-background border-border"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleEmailChange}
                  disabled={emailLoading || !newEmail.trim()}
                >
                  {emailLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Update Email
                </Button>
                {emailSuccess && (
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-500 flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    {emailSuccess}
                  </div>
                )}
                {emailError && (
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Change Password Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-xs">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-background border-border"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                  {passwordLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Update Password
                </Button>
                {passwordSuccess && (
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-500 flex items-center gap-2">
                    <Check className="h-3 w-3" />
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Delete Account Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Delete Account</h3>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-xs text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="delete-password" className="text-xs">Enter your password</Label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm" className="text-xs">
                        Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        type="text"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE"
                        className="bg-background border-border font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || !deletePassword || deleteConfirmation !== 'DELETE'}
                      >
                        {deleteLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Permanently Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword("");
                          setDeleteConfirmation("");
                          setDeleteError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {deleteError && (
                      <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        {deleteError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            {notificationLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Master Toggle */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">In-App Notifications</h3>
                  
                  <ToggleItem
                    label="Enable notifications"
                    description="Receive in-app notifications for activity"
                    checked={notificationSettings.in_app_enabled}
                    onChange={(checked) => updateNotificationSetting('in_app_enabled', checked)}
                    disabled={notificationSaving}
                  />
                </div>

                {/* Activity Notifications - only show if master toggle is on */}
                {notificationSettings.in_app_enabled && (
                  <div className="border-t border-border pt-4 mt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Activity Types</h3>
                    
                    <ToggleItem
                      label="Likes"
                      description="When someone likes your work or comments"
                      checked={notificationSettings.likes_enabled}
                      onChange={(checked) => updateNotificationSetting('likes_enabled', checked)}
                      disabled={notificationSaving}
                    />

                    <ToggleItem
                      label="Comments"
                      description="When someone comments on your work or replies"
                      checked={notificationSettings.comments_enabled}
                      onChange={(checked) => updateNotificationSetting('comments_enabled', checked)}
                      disabled={notificationSaving}
                    />

                    <ToggleItem
                      label="Follows"
                      description="When someone follows you or your streams"
                      checked={notificationSettings.follows_enabled}
                      onChange={(checked) => updateNotificationSetting('follows_enabled', checked)}
                      disabled={notificationSaving}
                    />

                    <ToggleItem
                      label="Mentions"
                      description="When someone mentions you in a comment"
                      checked={notificationSettings.mentions_enabled}
                      onChange={(checked) => updateNotificationSetting('mentions_enabled', checked)}
                      disabled={notificationSaving}
                    />
                  </div>
                )}

                {/* Saving indicator */}
                {notificationSaving && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </p>
                )}
              </>
            )}
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
      <DialogContent className="bg-popover border-border sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-foreground text-xl">
            Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage your account, notifications, and privacy preferences
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-border px-6 flex-shrink-0">
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
                    "focus:outline-none focus-visible:outline-none",
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
          className="p-6 overflow-y-auto flex-1 min-h-0"
          role="tabpanel"
          id={`${activeTab}-panel`}
        >
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border flex-shrink-0 bg-popover">
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
  disabled?: boolean;
}

function ToggleItem({ label, description, checked, onChange, disabled }: ToggleItemProps) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border border-border bg-background p-4",
      disabled && "opacity-60"
    )}>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed",
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
