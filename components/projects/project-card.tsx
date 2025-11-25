"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Project } from "@/lib/mock-data/projects";
import { Lock, Globe, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project & {
    assetsCount?: number;
    recentPosts?: Array<{
      id: string;
      url: string;
      title: string;
    }>;
  };
}

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const assetsCount = project.assetsCount ?? 0;

  return (
    <Link href={`/project/${project.id}`} className="group block space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-secondary border border-border group-hover:border-input transition-colors">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt={project.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : project.recentPosts && project.recentPosts.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            {project.recentPosts.slice(0, 4).map((post) => (
              <div key={post.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image
                  src={post.url}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
            No Cover
          </div>
        )}
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="cosmos-ghost" size="icon" className="bg-background/50 backdrop-blur-md">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white truncate pr-2">{project.name}</h3>
          {project.isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {assetsCount} {assetsCount === 1 ? "asset" : "assets"}
        </p>
      </div>
    </Link>
  );
});

