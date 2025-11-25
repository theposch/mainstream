"use client";

import * as React from "react";
import { ProjectCard } from "./project-card";
import { Project } from "@/lib/mock-data/projects";

export interface ProjectGridData extends Project {
  assetsCount: number;
  recentPosts: Array<{
    id: string;
    url: string;
    title: string;
  }>;
}

interface ProjectsGridProps {
  projects: ProjectGridData[];
}

export const ProjectsGrid = React.memo(function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-muted-foreground">No projects found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Projects will appear here once they're created.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
});

