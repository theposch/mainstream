"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Globe, WifiOff } from "lucide-react";
import { currentUser } from "@/lib/mock-data/users";
import { teams } from "@/lib/mock-data/teams";
import { fetchWithRetry, getUserFriendlyErrorMessage, isOnline, deduplicatedRequest } from "@/lib/utils/api";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  
  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [ownerType, setOwnerType] = React.useState<"user" | "team">("user");
  const [ownerId, setOwnerId] = React.useState(currentUser.id);

  // Get user's teams
  const userTeams = teams.filter(team => team.memberIds.includes(currentUser.id));

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!isOnline());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setOwnerType("user");
      setOwnerId(currentUser.id);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (name.length > 100) {
      setError("Project name must be less than 100 characters");
      return;
    }

    if (description.length > 500) {
      setError("Description must be less than 500 characters");
      return;
    }

    // Check online status
    if (!isOnline()) {
      setError("You're offline. Please check your internet connection and try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Use deduplication to prevent double submissions
      const requestKey = `create-project-${name}-${Date.now()}`;
      
      const data = await deduplicatedRequest(requestKey, async () => {
        const response = await fetchWithRetry(
          "/api/projects",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim() || undefined,
              isPrivate,
              ownerType,
              ownerId,
            }),
          },
          {
            maxRetries: 2,
            retryDelay: 1000,
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to create project");
        }

        return responseData;
      });

      // Success! Close dialog and redirect to new project
      onOpenChange(false);
      router.push(`/project/${data.project.id}`);
      router.refresh(); // Refresh to show new project in lists
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground" id="create-project-title">
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-muted-foreground" id="create-project-description">
              Create a collection to organize your design assets
            </DialogDescription>
          </DialogHeader>
        <form onSubmit={handleSubmit} aria-labelledby="create-project-title" aria-describedby="create-project-description">

          <div className="grid gap-4 py-4">
            {/* Offline Warning */}
            {isOffline && (
              <div 
                className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                <WifiOff className="h-4 w-4" aria-hidden="true" />
                <span>You're offline. Check your connection to create projects.</span>
              </div>
            )}
            {/* Project Name */}
            <div className="grid gap-2">
              <Label htmlFor="project-name" className="text-foreground">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="project-name"
                placeholder="e.g., Mobile App Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="bg-background border-border text-foreground"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="project-description" className="text-foreground">
                Description
              </Label>
              <textarea
                id="project-description"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                aria-describedby="description-count"
              />
              <p 
                className={`text-xs ${description.length > 450 ? 'text-orange-500' : 'text-muted-foreground'}`}
                id="description-count"
                aria-live="polite"
              >
                {description.length}/500 characters
              </p>
            </div>

            {/* Workspace Selection */}
            <div className="grid gap-2">
              <Label htmlFor="workspace" className="text-foreground">
                Workspace
              </Label>
              <select
                id="workspace"
                value={ownerType === "user" ? currentUser.id : ownerId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === currentUser.id) {
                    setOwnerType("user");
                    setOwnerId(currentUser.id);
                  } else {
                    setOwnerType("team");
                    setOwnerId(value);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                <option value={currentUser.id}>Personal</option>
                {userTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                {isPrivate ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isPrivate ? "Private" : "Public"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPrivate
                      ? "Only you and invited members can view"
                      : "Anyone can discover and view"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPrivate ? "bg-primary" : "bg-muted"
                }`}
                role="switch"
                aria-checked={isPrivate}
                aria-label={`Privacy setting: ${isPrivate ? 'Private' : 'Public'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? "translate-x-6" : "translate-x-1"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
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
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

