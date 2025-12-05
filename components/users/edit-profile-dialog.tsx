"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Camera, 
  Save,
  Loader2,
  MapPin,
  Briefcase,
  X,
  Trash2,
} from "lucide-react";
import { useUser } from "@/lib/auth/use-user";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);

  // Initialize form with user data
  React.useEffect(() => {
    if (user && open) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setLocation(user.location || "");
      setJobTitle(user.jobTitle || "");
      setAvatarUrl(user.avatarUrl || "");
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [user, open]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Please use JPG, PNG, GIF, or WebP.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum size is 2MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    setPendingAvatarFile(file);
    setErrorMessage(null);
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to remove avatar');
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
    } catch (error) {
      setErrorMessage('Failed to remove avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!pendingAvatarFile) return null;

    const formData = new FormData();
    formData.append('file', pendingAvatarFile);

    const response = await fetch('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload avatar');
    }

    return data.avatarUrl;
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Upload avatar first if there's a pending file
      let newAvatarUrl = avatarUrl;
      if (pendingAvatarFile) {
        setIsUploadingAvatar(true);
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        }
        setIsUploadingAvatar(false);
      }

      // Update profile (include avatarUrl if it was changed)
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          username,
          bio,
          location,
          jobTitle,
          avatarUrl: newAvatarUrl,
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }
      
      setSuccessMessage("Profile updated successfully!");
      setPendingAvatarFile(null);
      setAvatarPreview(null);
      
      setTimeout(() => {
        setSuccessMessage(null);
        onOpenChange(false);
        // Refresh the page to update user data throughout the app
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsLoading(false);
      setIsUploadingAvatar(false);
    }
  };

  const displayedAvatar = avatarPreview || avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={displayedAvatar} alt={username} />
                <AvatarFallback className="text-2xl bg-secondary">
                  {username?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                aria-label="Change avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">Profile Photo</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Click to upload. JPG, PNG, GIF or WebP. Max 2MB.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {pendingAvatarFile ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {(avatarUrl?.startsWith('/uploads/') || pendingAvatarFile) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Fields */}
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
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="username"
                  className="bg-background border-border pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                mainstream.so/u/{username || 'username'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jobTitle" className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Role / Title
              </Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Product Designer"
                className="bg-background border-border"
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="bg-background border-border"
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/500 characters
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div 
            className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-500"
            role="alert"
          >
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div 
            className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
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

