"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
// TODO: Replace with real auth and team data
import { currentUser, users } from "@/lib/mock-data/users";
import { teams } from "@/lib/mock-data/teams";

// TODO: Implement workspace context
// This should be a global context that tracks:
// - Current active workspace (personal or team)
// - Current user's available teams
// - Methods to switch workspace
// - Persist selection in localStorage or user preferences

export function WorkspaceSwitcher() {
  const [open, setOpen] = React.useState(false);
  // TODO: Replace with context/state management
  // const { currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<{
    type: "personal" | "team";
    id: string;
    name: string;
    avatar?: string;
  }>({
    type: "personal",
    id: currentUser.id,
    name: currentUser.displayName,
    avatar: currentUser.avatarUrl,
  });

  // TODO: Fetch user's teams from API
  // GET /api/users/me/teams
  // Only show teams where user is a member
  const userTeams = teams.filter(team => 
    team.memberIds.includes(currentUser.id)
  );

  // TODO: Implement workspace switching
  // - Update global context/state
  // - Refetch feed/projects based on new workspace
  // - Update URL if needed (e.g., /t/team-slug or /home)
  // - Persist selection to localStorage
  // - POST /api/users/me/preferences with { activeWorkspaceId }
  const handleSelectWorkspace = (type: "personal" | "team", id: string, name: string, avatar?: string) => {
    setSelectedWorkspace({ type, id, name, avatar });
    setOpen(false);
    // TODO: Trigger workspace change event
    // setCurrentWorkspace({ type, id });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between px-3 h-10 hover:bg-accent border border-transparent hover:border-border transition-all"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={selectedWorkspace.avatar} />
              <AvatarFallback className="text-xs">
                {selectedWorkspace.name?.substring(0, 2).toUpperCase() || 'WS'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{selectedWorkspace.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover border-border" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search workspace..." className="h-9 text-white" />
          <CommandList>
            <CommandEmpty className="text-muted-foreground text-sm py-6 text-center">No workspace found.</CommandEmpty>
            
            {/* Personal Workspace */}
            <CommandGroup heading="Personal">
              <CommandItem
                onSelect={() =>
                  handleSelectWorkspace("personal", currentUser.id, currentUser.displayName, currentUser.avatarUrl)
                }
                className="flex items-center gap-2 px-2 py-2 cursor-pointer"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {currentUser.username?.substring(0, 2).toUpperCase() || 'ME'}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{currentUser.displayName}</span>
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selectedWorkspace.type === "personal" && selectedWorkspace.id === currentUser.id
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
              </CommandItem>
            </CommandGroup>

            {/* Teams */}
            {userTeams.length > 0 && (
              <>
                <CommandSeparator className="bg-zinc-800" />
                <CommandGroup heading="Teams">
                  {userTeams.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() =>
                        handleSelectWorkspace("team", team.id, team.name, team.avatarUrl)
                      }
                      className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                    >
                      <Avatar className="h-7 w-7 rounded-lg shrink-0">
                        <AvatarImage src={team.avatarUrl} />
                        <AvatarFallback className="rounded-lg text-xs">
                          {team.name?.substring(0, 2).toUpperCase() || 'TM'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm">{team.name}</span>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedWorkspace.type === "team" && selectedWorkspace.id === team.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Create Team */}
            <CommandSeparator className="bg-zinc-800" />
            <CommandGroup>
              {/* TODO: Implement create team functionality
                  - Open create team dialog
                  - POST /api/teams with { name, description }
                  - Redirect to new team page or update workspace switcher
                  - Handle validation and errors
              */}
              <CommandItem className="flex items-center gap-2 px-2 py-2 cursor-pointer">
                <div className="h-7 w-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-sm">Create Team</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
