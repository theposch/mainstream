"use client";

import * as React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Settings, Slack } from "lucide-react";

interface TeamHeaderProps {
  team: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string;
    description?: string;
    coverImageUrl?: string;
  };
  members: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  }>;
  stats: {
    projectsCount: number;
    membersCount: number;
    postsCount: number;
    followersCount?: number;
    likesCount?: number;
  };
  recentPosts?: Array<{
    id: string;
    url: string;
    title: string;
  }>;
  isAdmin?: boolean;
  canManageMembers?: boolean;
  onMembersClick?: () => void;
}

export function TeamHeader({
  team,
  members,
  stats,
  recentPosts,
  isAdmin = false,
  canManageMembers = false,
  onMembersClick,
}: TeamHeaderProps) {
  // TODO: Backend Integration
  // - GET /api/teams/:id/following - Check if current user follows this team
  // - POST /api/teams/:id/follow - Follow team
  // - DELETE /api/teams/:id/follow - Unfollow team
  const [isFollowing, setIsFollowing] = React.useState(false);

  const handleFollowClick = () => {
    // TODO: Implement follow/unfollow API call
    // if (!session) return showLoginDialog();
    // 
    // Optimistic update:
    setIsFollowing(!isFollowing);
    // 
    // API call:
    // const endpoint = `/api/teams/${team.id}/follow`;
    // const method = isFollowing ? 'DELETE' : 'POST';
    // 
    // try {
    //   await fetch(endpoint, { method });
    // } catch (error) {
    //   // Roll back on error
    //   setIsFollowing(!isFollowing);
    //   showError('Failed to update follow status');
    // }
  };

  const handleMessageClick = () => {
    // TODO: Implement messaging functionality
    // - Could open Slack workspace
    // - Or internal messaging system
    // - POST /api/teams/:id/messages
    console.log("Send message to team");
  };

  const handleSettingsClick = () => {
    // TODO: Navigate to team settings page
    // - Only visible if user is admin
    // - Navigate to `/t/${team.slug}/settings`
    console.log("Open team settings");
  };

  const displayedMembers = members.slice(0, 5);
  const remainingCount = Math.max(0, members.length - 5);

  return (
    <div className="py-8">
      {/* Team Info Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        {/* Left Side: Avatar + Info */}
        <div className="flex gap-5 items-center flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-24 w-24 rounded-xl border border-border/50 bg-background shadow-md flex-shrink-0">
            <AvatarImage src={team.avatarUrl} alt={team.name} />
            <AvatarFallback className="text-2xl bg-secondary rounded-xl">
              <Users className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          {/* Name, Description & Members */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="space-y-1.5">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>

            {/* Members - Moved here */}
            {canManageMembers ? (
              <button
                onClick={onMembersClick}
                className="flex items-center gap-2 group"
              >
                <div className="flex -space-x-1.5">
                  {displayedMembers.map((member) => (
                    <Avatar
                      key={member.id}
                      className="h-8 w-8 border-2 border-background ring-1 ring-border/50 group-hover:ring-foreground/20 transition-all duration-200"
                    >
                      <AvatarImage src={member.avatarUrl} alt={member.username} />
                      <AvatarFallback className="text-xs">
                        {member.username.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="h-8 w-8 rounded-full border-2 border-background bg-muted ring-1 ring-border/50 group-hover:ring-foreground/20 transition-all duration-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {remainingCount > 0 ? `+${remainingCount}` : "+"}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {stats.membersCount} {stats.membersCount === 1 ? "member" : "members"}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {displayedMembers.map((member) => (
                    <Avatar
                      key={member.id}
                      className="h-8 w-8 border-2 border-background ring-1 ring-border/50"
                    >
                      <AvatarImage src={member.avatarUrl} alt={member.username} />
                      <AvatarFallback className="text-xs">
                        {member.username.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {remainingCount > 0 && (
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-muted ring-1 ring-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                      +{remainingCount}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.membersCount} {stats.membersCount === 1 ? "member" : "members"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="cosmos"
            onClick={handleMessageClick}
            className="gap-2 h-9 px-4 text-sm font-medium"
          >
            <Slack className="h-3.5 w-3.5" />
            Send a message
          </Button>
          
          <Button
            variant={isFollowing ? "cosmos-secondary" : "outline"}
            onClick={handleFollowClick}
            className="h-9 px-4 text-sm font-medium"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleSettingsClick}
              title="Team settings"
              className="h-9 w-9"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

