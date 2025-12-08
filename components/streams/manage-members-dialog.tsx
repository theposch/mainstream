"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  Search, 
  UserPlus, 
  X, 
  Crown,
  Shield,
  User as UserIcon 
} from "lucide-react";
import { useStreamMembers, type StreamMember } from "@/lib/hooks/use-stream-members";
import type { User } from "@/lib/types/database";

interface ManageMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  streamOwnerId: string;
}

interface SearchUser extends Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> {}

export function ManageMembersDialog({ 
  open, 
  onOpenChange, 
  streamId,
  streamOwnerId,
}: ManageMembersDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [addingUserId, setAddingUserId] = React.useState<string | null>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const {
    members,
    memberCount,
    currentUserRole,
    owner,
    addMember,
    removeMember,
    loading,
    actionLoading,
    error,
    refetch,
  } = useStreamMembers(streamId);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
      setAddingUserId(null);
    } else {
      // Refetch members when dialog opens
      refetch();
    }
  }, [open, refetch]);

  // Debounced search with cancellation support
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Track if effect was cleaned up to prevent state updates on unmounted component
    let isCancelled = false;
    const abortController = new AbortController();

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/users?search=${encodeURIComponent(searchQuery)}&limit=10`,
          { signal: abortController.signal }
        );
        
        if (isCancelled) return;
        
        if (response.ok) {
          const data = await response.json();
          // Filter out users who are already members or the owner
          const existingMemberIds = new Set([
            streamOwnerId,
            ...members.map(m => m.user_id)
          ]);
          const filteredUsers = (data.users || []).filter(
            (user: SearchUser) => !existingMemberIds.has(user.id)
          );
          
          if (!isCancelled) {
            setSearchResults(filteredUsers);
          }
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[ManageMembersDialog] Search error:', err);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      abortController.abort();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, members, streamOwnerId]);

  const handleAddMember = async (user: SearchUser) => {
    setAddingUserId(user.id);
    const success = await addMember(user.id, 'member');
    if (success) {
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
      setSearchQuery("");
    }
    setAddingUserId(null);
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(userId);
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3.5 w-3.5 text-amber-500" />;
      case 'admin':
        return <Shield className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
          <DialogDescription>
            Add or remove members who can access this private stream.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search Input */}
          {canManageMembers && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-[200px] overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || user.username} />
                      <AvatarFallback className="text-xs">
                        {(user.display_name || user.username)?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.display_name || user.username}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddMember(user)}
                    disabled={addingUserId === user.id || actionLoading}
                  >
                    {addingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No users found matching &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Current Members */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                Members ({memberCount + 1}) {/* +1 for owner */}
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {/* Stream Owner (always shown first, cannot be removed) */}
                <div className="flex items-center justify-between p-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-amber-500/30">
                      {owner?.avatar_url ? (
                        <AvatarImage 
                          src={owner.avatar_url} 
                          alt={owner.display_name || owner.username} 
                        />
                      ) : null}
                      <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                        {owner 
                          ? (owner.display_name || owner.username)?.substring(0, 2).toUpperCase()
                          : <Crown className="h-4 w-4" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {owner?.display_name || owner?.username || 'Stream Owner'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getRoleIcon('owner')}
                        <span>{getRoleLabel('owner')}</span>
                        {owner?.username && (
                          <>
                            <span>•</span>
                            <span>@{owner.username}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Members */}
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={member.user?.avatar_url || undefined} 
                          alt={member.user?.display_name || member.user?.username} 
                        />
                        <AvatarFallback className="text-xs">
                          {(member.user?.display_name || member.user?.username)?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {member.user?.display_name || member.user?.username}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getRoleIcon(member.role)}
                          <span>{getRoleLabel(member.role)}</span>
                          <span>•</span>
                          <span>@{member.user?.username}</span>
                        </div>
                      </div>
                    </div>
                    {canManageMembers && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={actionLoading}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No members yet. Search for users above to add them.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

