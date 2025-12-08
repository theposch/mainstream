"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DeleteDropDialog } from "./delete-drop-dialog";
import type { Drop, User } from "@/lib/types/database";

interface DropCardProps {
  drop: Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
  };
  currentUserId?: string;
  onDelete?: (dropId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const DropCard = React.memo(function DropCard({ 
  drop, 
  currentUserId,
  onDelete,
}: DropCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  
  const href = drop.status === "draft" 
    ? `/drops/${drop.id}/edit` 
    : `/drops/${drop.id}`;

  // Show menu only for drafts owned by current user
  const canDelete = drop.status === "draft" && 
    currentUserId && 
    drop.created_by === currentUserId;

  const handleMenuClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDeleteClick = React.useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleted = React.useCallback(() => {
    onDelete?.(drop.id);
  }, [onDelete, drop.id]);

  return (
    <>
      <Link
        href={href}
        className="group block bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors relative"
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
                {drop.title}
              </h3>
              {drop.status === "draft" && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                  Draft
                </span>
              )}
            </div>
            
            {/* More options menu - only for deletable drafts */}
            {canDelete && (
              <div onClick={handleMenuClick}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          {/* Preview text */}
          {drop.description && (
            <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
              {drop.description}
            </p>
          )}
          
          {/* Meta info */}
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
            {drop.creator && (
              <div className="flex items-center gap-1.5">
                {drop.creator.avatar_url && (
                  <Image
                    src={drop.creator.avatar_url}
                    alt={drop.creator.display_name}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )}
                <span>{drop.creator.display_name}</span>
              </div>
            )}
            <span>•</span>
            <span>{formatDate(drop.created_at)}</span>
            {drop.post_count !== undefined && (
              <>
                <span>•</span>
                <span>{drop.post_count} post{drop.post_count !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Preview images grid */}
        {drop.preview_images && drop.preview_images.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex gap-1.5">
              {drop.preview_images.slice(0, 3).map((url, index) => (
                <div
                  key={index}
                  className="relative flex-1 aspect-[4/3] bg-zinc-800 rounded-lg overflow-hidden"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Delete confirmation dialog */}
      <DeleteDropDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        dropId={drop.id}
        dropTitle={drop.title}
        onDeleted={handleDeleted}
      />
    </>
  );
});
