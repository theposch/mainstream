"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface ManageMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
  };
  members: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    role: string;
  }>;
  canManageMembers?: boolean;
  onRemoveMember?: (memberId: string) => void;
  onAddMember?: (userId: string) => void;
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  team,
  members,
  canManageMembers = false,
  onRemoveMember,
  onAddMember,
}: ManageMembersDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  // TODO: Backend Integration
  // - GET /api/users/search?q={query} - Search users to add to team
  // - POST /api/teams/:teamId/members - Add member to team
  // - DELETE /api/teams/:teamId/members/:userId - Remove member from team
  // - GET /api/teams/:teamId/members - Get full member list with roles

  const handleRemoveMember = (memberId: string) => {
    // TODO: Implement remove member API call
    // if (!canManageMembers) return;
    // 
    // Optimistic update:
    // setMembers(members.filter(m => m.id !== memberId));
    // 
    // API call:
    // try {
    //   await fetch(`/api/teams/${team.id}/members/${memberId}`, {
    //     method: 'DELETE'
    //   });
    // } catch (error) {
    //   // Roll back on error
    //   // Restore member to list
    //   showError('Failed to remove member');
    // }
    
    if (onRemoveMember) {
      onRemoveMember(memberId);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // TODO: Implement user search
    // - Debounce search query (500ms)
    // - Call GET /api/users/search?q={query}
    // - Show results dropdown below input
    // - Allow clicking user to add them to team
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-border">
          <DialogTitle className="text-3xl font-bold tracking-tight">
            Manage Team Members
          </DialogTitle>
          <p className="text-base text-muted-foreground mt-3">
            Add or remove members from <span className="font-semibold text-foreground">{team.name}</span>.
          </p>
        </DialogHeader>

        {/* Search Input */}
        {canManageMembers && (
          <div className="px-8 pt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-12 h-12 bg-secondary/50 border-border rounded-xl text-base"
              />
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Current Members ({members.length})
            </h3>
            
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-all group border border-transparent hover:border-border/50"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 ring-2 ring-background">
                      <AvatarImage src={member.avatarUrl} alt={member.username} />
                      <AvatarFallback className="font-semibold text-base">
                        {member.displayName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-base">
                        {member.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{member.username}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider ${
                        member.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>

                  {canManageMembers && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                      className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                      title="Remove member"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-border flex justify-end">
          <Button
            variant="cosmos"
            onClick={() => onOpenChange(false)}
            className="h-11 px-8 font-semibold"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

