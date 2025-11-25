"use client";

import * as React from "react";
import { StreamResource } from "@/lib/mock-data/streams";
import { ExternalLink, FileText, Layout, Trello, BookOpen, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StreamResourcesListProps {
  resources: StreamResource[];
  editable?: boolean;
  onAdd?: () => void;
  onEdit?: (resource: StreamResource) => void;
  onRemove?: (resourceId: string) => void;
}

const ResourceTypeIcon: Record<StreamResource['resourceType'], React.ComponentType<{ className?: string }>> = {
  figma: Layout,
  jira: Trello,
  notion: BookOpen,
  prd: FileText,
  other: LinkIcon,
};

export function StreamResourcesList({
  resources,
  editable = false,
  onAdd,
  onEdit,
  onRemove,
}: StreamResourcesListProps) {
  if (resources.length === 0 && !editable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Pinned Resources</h3>
        {editable && onAdd && (
          <Button variant="cosmos-ghost" size="sm" onClick={onAdd}>
            Add Resource
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground/60">No pinned resources yet</p>
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => {
            const Icon = ResourceTypeIcon[resource.resourceType];
            return (
              <Link
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-background/50">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {resource.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new URL(resource.url).hostname}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

