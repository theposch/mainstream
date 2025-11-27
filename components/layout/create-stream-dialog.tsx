"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Globe, WifiOff, Hash, CheckCircle2, XCircle } from "lucide-react";
import { STREAM_VALIDATION } from "@/lib/constants/streams";
import { fetchWithRetry, getUserFriendlyErrorMessage, isOnline, deduplicatedRequest } from "@/lib/utils/api";
import { isValidSlug } from "@/lib/utils/slug";
import { createClient } from "@/lib/supabase/client";

interface CreateStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStreamDialog({ open, onOpenChange }: CreateStreamDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  
  // User and teams state
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [userTeams, setUserTeams] = React.useState<any[]>([]);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  
  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [ownerType, setOwnerType] = React.useState<"user" | "team">("user");
  const [ownerId, setOwnerId] = React.useState("");

  // Slug validation state
  const [validationState, setValidationState] = React.useState<{
    isValid: boolean;
    message: string;
    type: 'success' | 'error' | 'idle';
  }>({ isValid: false, message: '', type: 'idle' });
  const [debouncedName, setDebouncedName] = React.useState("");

  // Fetch current user and teams
  React.useEffect(() => {
    if (!open) return;
    
    const fetchUserAndTeams = async () => {
      setIsLoadingUser(true);
      try {
        // Get authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Fetch user profile
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (userProfile) {
            setCurrentUser(userProfile);
            setOwnerId(userProfile.id);
            
            // Fetch user's teams
            const { data: teamMemberships } = await supabase
              .from('team_members')
              .select('team:teams(*)')
              .eq('user_id', userProfile.id);
            
            if (teamMemberships) {
              const teams = teamMemberships
                .map((m: any) => m.team)
                .filter(Boolean);
              setUserTeams(teams);
            }
          }
        }
      } catch (error) {
        console.error('[CreateStreamDialog] Failed to fetch user/teams:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    fetchUserAndTeams();
  }, [open, supabase]);

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

  // Handle name input change (simple state update)
  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Strip # prefix if user types it
    value = value.replace(/^#/, '');
    
    setName(value);
    
    // Reset validation to idle while typing
    if (!value) {
      setValidationState({ isValid: false, message: '', type: 'idle' });
    } else {
      setValidationState({ isValid: false, message: 'Checking...', type: 'idle' });
    }
  }, []);

  // Debounce name for validation (300ms delay)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name);
    }, 300);

    return () => clearTimeout(timer);
  }, [name]);

  // Validate debounced name
  React.useEffect(() => {
    if (!debouncedName) {
      setValidationState({ isValid: false, message: '', type: 'idle' });
      return;
    }

    if (!isValidSlug(debouncedName)) {
      setValidationState({
        isValid: false,
        message: 'Use lowercase letters, numbers, and hyphens only',
        type: 'error'
      });
      return;
    }

    // Check availability via database
    const checkAvailability = async () => {
      try {
        const { data: existingStream } = await supabase
          .from('streams')
          .select('id')
          .eq('name', debouncedName)
          .maybeSingle();

        if (existingStream) {
          setValidationState({
            isValid: false,
            message: 'Stream name already taken',
            type: 'error'
          });
          return;
        }

        setValidationState({
          isValid: true,
          message: 'Available',
          type: 'success'
        });
      } catch (error) {
        console.error('[CreateStreamDialog] Error checking name availability:', error);
        // Don't block on validation errors
        setValidationState({
          isValid: true,
          message: '',
          type: 'idle'
        });
      }
    };

    checkAvailability();
  }, [debouncedName, supabase]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setOwnerType("user");
      if (currentUser) {
        setOwnerId(currentUser.id);
      }
      setError(null);
      setValidationState({ isValid: false, message: '', type: 'idle' });
    }
  }, [open, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError("Stream name is required");
      return;
    }

    if (trimmedName.length < STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH) {
      setError(`Stream name must be at least ${STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH} characters`);
      return;
    }

    if (trimmedName.length > STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH) {
      setError(`Stream name must be less than ${STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH} characters`);
      return;
    }

    if (description.length > STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH) {
      setError(`Description must be less than ${STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH} characters`);
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
      const requestKey = `create-stream-${trimmedName}-${Date.now()}`;
      
      const data = await deduplicatedRequest(requestKey, async () => {
        const response = await fetchWithRetry(
          "/api/streams",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: trimmedName,
              description: description.trim() || undefined,
              is_private: isPrivate,
              owner_type: ownerType,
              owner_id: ownerId,
              status: 'active',
            }),
          },
          {
            maxRetries: 2,
            retryDelay: 1000,
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || "Failed to create stream");
        }

        return responseData;
      });
      
      // Success! Close dialog and redirect to new stream
      onOpenChange(false);
      router.push(`/stream/${data.stream.name}`);
      router.refresh(); // Refresh to show new stream in lists
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
            <DialogTitle className="text-foreground flex items-center gap-2" id="create-stream-title">
              <Hash className="h-5 w-5" />
              Create New Stream
            </DialogTitle>
            <DialogDescription className="text-muted-foreground" id="create-stream-description">
              Create a stream to organize and tag your design work
            </DialogDescription>
          </DialogHeader>
        <form onSubmit={handleSubmit} aria-labelledby="create-stream-title" aria-describedby="create-stream-description">

          <div className="grid gap-4 py-4">
            {/* Offline Warning */}
            {isOffline && (
              <div 
                className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                <WifiOff className="h-4 w-4" aria-hidden="true" />
                <span>You're offline. Check your connection to create streams.</span>
              </div>
            )}
            {            /* Stream Name */}
            <div className="grid gap-2">
              <Label htmlFor="stream-name" className="text-foreground">
                Stream Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="stream-name"
                  placeholder="e.g., mobile or growth-team"
                  value={name}
                  onChange={handleNameChange}
                  maxLength={STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH}
                  className={`bg-background border-border text-foreground pr-10 ${
                    validationState.type === 'error' ? 'border-destructive focus:ring-destructive' :
                    validationState.type === 'success' ? 'border-green-500 focus:ring-green-500' : ''
                  }`}
                  disabled={isLoading}
                  autoFocus
                />
                {validationState.type !== 'idle' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validationState.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Use lowercase, hyphens (e.g., ios-app)
                </p>
                {validationState.message && (
                  <p className={`text-xs ${validationState.type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
                    {validationState.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="stream-description" className="text-foreground">
                Description
              </Label>
              <textarea
                id="stream-description"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH}
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
                {description.length}/{STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH} characters
              </p>
            </div>

            {/* Workspace Selection */}
            <div className="grid gap-2">
              <Label htmlFor="workspace" className="text-foreground">
                Workspace
              </Label>
              <select
                id="workspace"
                value={ownerType === "user" && currentUser ? currentUser.id : ownerId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (currentUser && value === currentUser.id) {
                    setOwnerType("user");
                    setOwnerId(currentUser.id);
                  } else {
                    setOwnerType("team");
                    setOwnerId(value);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isLoadingUser || !currentUser}
              >
                {currentUser && <option value={currentUser.id}>Personal</option>}
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
              disabled={isLoading || !validationState.isValid}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Stream"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

