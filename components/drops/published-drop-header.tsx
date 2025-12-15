"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Pencil, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDropDialog } from "./delete-drop-dialog";
import { UnpublishDropDialog } from "./unpublish-drop-dialog";

interface PublishedDropHeaderProps {
  dropId: string;
  dropTitle: string;
}

export function PublishedDropHeader({ dropId, dropTitle }: PublishedDropHeaderProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = React.useState(false);

  const handleDeleted = React.useCallback(() => {
    router.push("/drops");
  }, [router]);

  const handleUnpublished = React.useCallback(() => {
    router.push("/drops?tab=drafts");
  }, [router]);

  return (
    <>
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border supports-[backdrop-filter]:bg-background/50 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto py-2 flex items-center justify-between">
          <Link
            href="/drops"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
              PUBLISHED
            </span>
            
            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/drops/${dropId}/edit`} className="flex items-center">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUnpublishDialogOpen(true)}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unpublish
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteDropDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        dropId={dropId}
        dropTitle={dropTitle}
        dropStatus="published"
        onDeleted={handleDeleted}
      />

      {/* Unpublish confirmation dialog */}
      <UnpublishDropDialog
        open={unpublishDialogOpen}
        onOpenChange={setUnpublishDialogOpen}
        dropId={dropId}
        dropTitle={dropTitle}
        onUnpublished={handleUnpublished}
      />
    </>
  );
}

