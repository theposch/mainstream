"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export interface TeamCardData {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  description?: string;
  projectsCount: number;
  membersCount: number;
  postsCount: number;
  recentPosts: Array<{
    id: string;
    url: string;
    title: string;
  }>;
}

interface TeamCardProps {
  team: TeamCardData;
}

export const TeamCard = React.memo(function TeamCard({ team }: TeamCardProps) {
  // TODO: Backend Integration
  // - GET /api/teams/:id/following - Check if current user follows this team
  // - POST /api/teams/:id/follow - Follow team
  // - DELETE /api/teams/:id/follow - Unfollow team
  const [isFollowing, setIsFollowing] = React.useState(false);

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement follow/unfollow API call
    // if (!session) return showLoginDialog();
    // 
    // Optimistic update:
    setIsFollowing(!isFollowing);
    // 
    // API call:
    // const endpoint = isFollowing 
    //   ? `/api/teams/${team.id}/follow`
    //   : `/api/teams/${team.id}/follow`;
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

  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-input hover:shadow-lg">
      {/* Header with Avatar and Follow Button */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/t/${team.slug}`} className="flex items-center gap-4 group/link">
          <Avatar className="h-16 w-16 rounded-full border-2 border-border">
            <AvatarImage src={team.avatarUrl} alt={team.name} />
            <AvatarFallback className="bg-secondary">
              <Users className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg group-hover/link:text-white transition-colors truncate">
              {team.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {team.projectsCount} {team.projectsCount === 1 ? 'project' : 'projects'} • {team.membersCount} {team.membersCount === 1 ? 'Member' : 'Members'} • {team.postsCount} {team.postsCount === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </Link>
        
        <Button 
          variant={isFollowing ? "cosmos-secondary" : "cosmos"}
          size="sm"
          onClick={handleFollowClick}
          className="shrink-0 ml-2"
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      </div>

      {/* Recent Posts Grid */}
      {team.recentPosts.length >= 4 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {team.recentPosts.slice(0, 4).map((post) => (
            <Link 
              key={post.id} 
              href={`/e/${post.id}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-secondary border border-border group-hover:border-input transition-colors"
            >
              <Image
                src={post.url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

