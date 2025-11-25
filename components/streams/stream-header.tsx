"use client";

import { Stream } from "@/lib/mock-data/streams";
import { Team } from "@/lib/mock-data/teams";
import { User } from "@/lib/mock-data/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, Globe, Plus, MoreHorizontal, Share, Hash, Archive } from "lucide-react";
import Link from "next/link";

interface StreamHeaderProps {
  stream: Stream;
  owner: User | Team;
}

export function StreamHeader({ stream, owner }: StreamHeaderProps) {
  const isTeam = stream.ownerType === 'team';
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
          <Hash className="h-3 w-3" />
          <span className="text-foreground">Stream</span>
        </div>
        <span className="text-zinc-600">/</span>
        <div className="flex items-center gap-1.5">
           {stream.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
           <span className="text-foreground">{stream.isPrivate ? 'Private' : 'Public'}</span>
        </div>
        {stream.status === 'archived' && (
          <>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-1.5 text-orange-500">
              <Archive className="h-3 w-3" />
              <span>Archived</span>
            </div>
          </>
        )}
      </div>

      {/* Main Header Content */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            {stream.name}
          </h1>
          {stream.description && (
            <p className="text-lg text-zinc-400 leading-relaxed">
              {stream.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
            {/* Stream Members/Followers */}
            <div className="flex -space-x-2 mr-4">
                {[1,2,3].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                       M{i}
                    </div>
                ))}
                 <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer">
                       +5
                </div>
            </div>
            
            {/* Follow/Unfollow Button */}
            <Button variant="cosmos-secondary" size="default">
                <Plus className="h-4 w-4 mr-2" />
                Follow
            </Button>
            
            {/* Share Stream */}
            <Button variant="cosmos-secondary" size="default">
                <Share className="h-4 w-4 mr-2" />
                Share
            </Button>
            
            {/* Add Asset to Stream */}
            <Button variant="cosmos" size="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
            </Button>
            
            {/* Stream Settings */}
             <Button variant="cosmos-ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
}

