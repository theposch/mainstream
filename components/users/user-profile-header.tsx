"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/mock-data/users";
import { Team } from "@/lib/mock-data/teams";
import { Settings } from "lucide-react";

interface UserProfileHeaderProps {
  /** The user whose profile is being displayed */
  user: User;
  /** Optional team the user belongs to */
  team?: Team;
  /** Whether the current user is viewing their own profile */
  isOwnProfile?: boolean;
}

/**
 * User profile header component displaying avatar, name, job title, and team affiliation.
 * Shows an "Edit Profile" button when viewing own profile.
 * 
 * @param user - The user whose profile is being displayed
 * @param team - Optional team the user belongs to
 * @param isOwnProfile - Whether the current user is viewing their own profile
 */
export function UserProfileHeader({
  user,
  team,
  isOwnProfile = false,
}: UserProfileHeaderProps) {
  // Issue #3 Fix: Remove console.log
  const handleSettingsClick = () => {
    // TODO: Implement user settings navigation
    // router.push('/settings') or router.push(`/u/${user.username}/settings`)
  };

  return (
    <div className="py-8">
      {/* User Info Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        {/* Left Side: Avatar + Info */}
        <div className="flex gap-5 items-center flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-24 w-24 rounded-xl border border-border/50 bg-background shadow-md flex-shrink-0">
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            <AvatarFallback className="text-2xl bg-secondary rounded-xl">
              {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Name, Username, Job Title & Team */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="space-y-1.5">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                {user.displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{user.username}
              </p>
              {user.jobTitle && (
                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                  {user.jobTitle}
                </p>
              )}
            </div>

            {/* Team Badge */}
            {team && (
              <Link
                href={`/t/${team.slug}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <Avatar className="h-5 w-5 border border-border/50">
                  <AvatarImage src={team.avatarUrl} alt={team.name} />
                  <AvatarFallback className="text-xs">
                    {team.name?.substring(0, 1).toUpperCase() || 'T'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {team.name}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSettingsClick}
              className="gap-2 h-9 px-4 text-sm font-medium"
            >
              <Settings className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

