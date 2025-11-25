"use client";

// TODO: Replace with real data from database
import { Project } from "@/lib/mock-data/projects";
import { Team } from "@/lib/mock-data/teams";
import { User } from "@/lib/mock-data/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, Globe, Plus, MoreHorizontal, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProjectHeaderProps {
  project: Project;
  owner: User | Team;
}

export function ProjectHeader({ project, owner }: ProjectHeaderProps) {
  const isTeam = project.ownerType === 'team';
  const ownerLink = isTeam ? `/t/${(owner as Team).slug}` : `/u/${(owner as User).username}`;
  
  // Get owner name - Team has 'name', User has 'displayName'
  const ownerName = isTeam ? (owner as Team).name : (owner as User).displayName;
  const ownerInitial = ownerName?.substring(0, 1).toUpperCase() || 'O';
  
  return (
    <div className="flex flex-col gap-6 mb-10">
      {/* Breadcrumb / Meta */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link 
          href={ownerLink}
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <Avatar className="h-5 w-5">
            <AvatarImage src={owner.avatarUrl} />
            <AvatarFallback>{ownerInitial}</AvatarFallback>
          </Avatar>
          <span>{ownerName}</span>
        </Link>
        <span className="text-zinc-600">/</span>
        <div className="flex items-center gap-1.5">
           {project.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
           <span className="text-foreground">{project.isPrivate ? 'Private' : 'Public'}</span>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-lg text-zinc-400 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
            {/* TODO: Fetch real project members
                - GET /api/projects/:projectId/members
                - Show actual member avatars
                - Make clickable to show full member list
                - Show member roles on hover
            */}
            <div className="flex -space-x-2 mr-4">
                {[1,2,3].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                       U{i}
                    </div>
                ))}
                 <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer">
                       +2
                </div>
            </div>
            
            {/* TODO: Implement real share functionality
                - Generate shareable link
                - Copy to clipboard
                - Share via email/social
                - Control sharing permissions
            */}
            <Button variant="cosmos-secondary" size="default">
                <Share className="h-4 w-4 mr-2" />
                Share
            </Button>
            
            {/* TODO: Implement Add Asset functionality
                - Check if user has permission to add
                - Open upload dialog or file picker
                - POST /api/projects/:projectId/assets
                - Support drag & drop
                - Update UI with new asset
            */}
            <Button variant="cosmos" size="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
            </Button>
            
            {/* TODO: Implement project settings menu
                - Show only if user is owner or has admin permission
                - Options: Edit project, Manage members, Delete project
                - PUT /api/projects/:projectId for updates
                - DELETE /api/projects/:projectId for deletion
            */}
             <Button variant="cosmos-ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
}
