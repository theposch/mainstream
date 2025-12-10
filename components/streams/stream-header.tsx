"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  MoreHorizontal, 
  Share, 
  Archive, 
  Trash2, 
  Check, 
  Loader2, 
  X,
  Users,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStreamFollow, type InitialFollowData } from "@/lib/hooks/use-stream-follow";
import { useStreamBookmarks, extractDomain, getFaviconUrl, type BookmarkWithCreator } from "@/lib/hooks/use-stream-bookmarks";
import { UploadDialog } from "@/components/layout/upload-dialog";
import { AddBookmarkDialog } from "@/components/streams/add-bookmark-dialog";
import { useStreamMembers, type InitialMembersData } from "@/lib/hooks/use-stream-members";

// Dynamic imports for dialogs - only loaded when opened
const ManageMembersDialog = dynamic(
  () => import("@/components/streams/manage-members-dialog").then((mod) => mod.ManageMembersDialog),
  { ssr: false }
);

const StreamDialog = dynamic(
  () => import("@/components/layout/stream-dialog").then((mod) => mod.StreamDialog),
  { ssr: false }
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Stream, User } from "@/lib/types/database";

interface StreamHeaderProps {
  stream: Stream;
  /** Server-prefetched follow data - avoids client-side fetch */
  initialFollowData?: InitialFollowData;
  /** Server-prefetched bookmarks - avoids client-side fetch */
  initialBookmarks?: BookmarkWithCreator[];
  /** Server-prefetched members data - avoids client-side fetch for private streams */
  initialMembersData?: InitialMembersData;
  /** Server-prefetched current user - avoids client-side fetch */
  currentUser?: User | null;
}

export const StreamHeader = React.memo(function StreamHeader({ 
  stream, 
  initialFollowData,
  initialBookmarks,
  initialMembersData,
  currentUser,
}: StreamHeaderProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [addBookmarkDialogOpen, setAddBookmarkDialogOpen] = React.useState(false);
  const [manageMembersDialogOpen, setManageMembersDialogOpen] = React.useState(false);
  const [editStreamDialogOpen, setEditStreamDialogOpen] = React.useState(false);
  
  // Use stream follow hook with server-prefetched initial data
  const { 
    isFollowing, 
    contributorCount,
    contributors,
    assetCount,
    toggleFollow, 
    loading: followLoading 
  } = useStreamFollow(stream.id, initialFollowData);

  // Use stream bookmarks hook with server-prefetched initial data
  const {
    bookmarks,
    addBookmark,
    deleteBookmark,
  } = useStreamBookmarks(stream.id, initialBookmarks);

  // Use stream members hook for private streams
  const {
    memberCount,
    currentUserRole,
  } = useStreamMembers(stream.id, initialMembersData);

  // Track window width for responsive bookmark display
  // Start with null to avoid SSR hydration mismatch, then set on client
  const [maxVisibleBookmarks, setMaxVisibleBookmarks] = React.useState<number | null>(null);
  
  React.useEffect(() => {
    const getMaxVisible = (width: number) => {
      if (width < 640) return 1;      // Mobile
      if (width < 1024) return 4;     // Tablet
      return 6;                        // Desktop
    };
    
    // Set initial value
    setMaxVisibleBookmarks(getMaxVisible(window.innerWidth));
    
    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setMaxVisibleBookmarks(getMaxVisible(window.innerWidth));
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Memoized bookmark display logic
  const { visibleBookmarks, overflowBookmarks, hasOverflow } = React.useMemo(() => {
    // Default to 6 during SSR, actual value set on client
    const max = maxVisibleBookmarks ?? 6;
    const visible = bookmarks.slice(0, max);
    const overflow = bookmarks.slice(max);
    return {
      visibleBookmarks: visible,
      overflowBookmarks: overflow,
      hasOverflow: overflow.length > 0,
    };
  }, [bookmarks, maxVisibleBookmarks]);


  // Memoized callbacks
  const handleDelete = React.useCallback(async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/streams/${stream.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete stream');
      }

      router.push('/streams');
    } catch (error) {
      console.error('Error deleting stream:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete stream');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [isDeleting, stream.id, router]);

  const handleFollow = React.useCallback(async () => {
    await toggleFollow();
  }, [toggleFollow]);

  const handleShare = React.useCallback(() => {
    const url = `${window.location.origin}/stream/${stream.name}`;
    navigator.clipboard.writeText(url);
  }, [stream.name]);

  const handleOpenUploadDialog = React.useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = React.useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleOpenAddBookmarkDialog = React.useCallback(() => {
    setAddBookmarkDialogOpen(true);
  }, []);

  const handleOpenManageMembersDialog = React.useCallback(() => {
    setManageMembersDialogOpen(true);
  }, []);

  const handleOpenEditStreamDialog = React.useCallback(() => {
    setEditStreamDialogOpen(true);
  }, []);

  const handleAddBookmark = React.useCallback(async (url: string, title?: string): Promise<boolean> => {
    const result = await addBookmark(url, title);
    return result !== null;
  }, [addBookmark]);

  const handleDeleteBookmark = React.useCallback(async (bookmarkId: string) => {
    await deleteBookmark(bookmarkId);
  }, [deleteBookmark]);

  const canDeleteBookmark = React.useCallback((createdById: string) => {
    if (!currentUser) return false;
    const isCreator = createdById === currentUser.id;
    const isStreamOwner = stream.owner_type === 'user' && stream.owner_id === currentUser.id;
    return isCreator || isStreamOwner;
  }, [currentUser, stream.owner_type, stream.owner_id]);

  const canDelete = React.useMemo(() => 
    currentUser && stream.owner_type === 'user' && stream.owner_id === currentUser.id,
    [currentUser, stream.owner_type, stream.owner_id]
  );
  
  return (
    <div className="flex flex-col gap-5 mb-8">
      {/* ═══════════════════════════════════════════════════════════════════
          ROW 1: Title + Description + Stats (left) | Actions (right)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left: Stream Identity */}
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            <span className="text-muted-foreground font-normal"># </span>
            {stream.name}
          </h1>
          
          {/* Description */}
          {stream.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {stream.description}
            </p>
          )}
          
          {/* Stats - inline text */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
            <span>{stream.is_private ? 'Private' : 'Public'}</span>
            {/* Member count - only for private streams */}
            {stream.is_private && (
              <>
                <span>•</span>
                <span 
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={handleOpenManageMembersDialog}
                >
                  {memberCount + 1} {memberCount + 1 === 1 ? 'member' : 'members'}
                </span>
              </>
            )}
            <span>•</span>
            <span className="relative group/contributors cursor-default hover:text-foreground transition-colors">
              {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}
              
              {/* Contributors Tooltip */}
              {contributors.length > 0 && (
                <div className="absolute left-0 top-full mt-2 opacity-0 invisible group-hover/contributors:opacity-100 group-hover/contributors:visible transition-all duration-200 z-50">
                  <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
                    <div className="space-y-2">
                      {contributors.slice(0, 8).map((contributor) => (
                        <div key={contributor.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={contributor.avatar_url} alt={contributor.display_name || contributor.username} />
                            <AvatarFallback className="text-[10px] bg-secondary">
                              {(contributor.display_name || contributor.username)?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">
                            {contributor.display_name || contributor.username}
                          </span>
                        </div>
                      ))}
                      {contributorCount > 8 && (
                        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                          +{contributorCount - 8} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </span>
            <span>•</span>
            <span>{assetCount} {assetCount === 1 ? 'post' : 'posts'}</span>
            
            {/* Archived Badge */}
            {stream.status === 'archived' && (
              <>
                <span>•</span>
                <span className="text-orange-500 flex items-center gap-1">
                  <Archive className="h-3 w-3" />
                  Archived
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share Stream
              </DropdownMenuItem>
              {/* Edit Stream - owner only */}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenEditStreamDialog}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Stream
                  </DropdownMenuItem>
                </>
              )}
              {/* Manage Members - only for private streams, owner or admin */}
              {stream.is_private && (currentUserRole === 'owner' || currentUserRole === 'admin' || canDelete) && (
                <DropdownMenuItem onClick={handleOpenManageMembersDialog}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleOpenDeleteDialog}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Stream
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Drop Button */}
          <Button 
            variant="outline" 
            size="default"
            onClick={handleOpenUploadDialog}
          >
            Create Drop
          </Button>
          
          {/* Follow Button */}
          <Button 
            variant={isFollowing ? "secondary" : "default"}
            size="default"
            onClick={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Following
              </>
            ) : (
              'Follow'
            )}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2: Bookmarks (single row, overflow goes to dropdown)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 flex-nowrap">
        {/* Bookmark Chips */}
        {visibleBookmarks.map((bookmark) => (
          <a
            key={bookmark.id}
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/bookmark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm text-foreground transition-colors shrink-0"
          >
            <img
              src={getFaviconUrl(bookmark.url)}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="truncate max-w-[150px]">
              {bookmark.title || extractDomain(bookmark.url)}
            </span>
            {canDeleteBookmark(bookmark.created_by) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteBookmark(bookmark.id);
                }}
                className="ml-0.5 opacity-0 group-hover/bookmark:opacity-100 hover:text-destructive transition-opacity"
                aria-label="Delete bookmark"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </a>
        ))}

        {/* Overflow Dropdown */}
        {hasOverflow && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm text-foreground transition-colors shrink-0">
                +{overflowBookmarks.length} more
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {overflowBookmarks.map((bookmark) => (
                <DropdownMenuItem
                  key={bookmark.id}
                  asChild
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full"
                  >
                    <img
                      src={getFaviconUrl(bookmark.url)}
                      alt=""
                      className="w-4 h-4 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="truncate flex-1">
                      {bookmark.title || extractDomain(bookmark.url)}
                    </span>
                    {canDeleteBookmark(bookmark.created_by) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteBookmark(bookmark.id);
                        }}
                        className="hover:text-destructive shrink-0"
                        aria-label="Delete bookmark"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Add Bookmark Button */}
        <button
          onClick={handleOpenAddBookmarkDialog}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Bookmark</span>
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* ═══════════════════════════════════════════════════════════════════
          Dialogs
          ═══════════════════════════════════════════════════════════════════ */}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the stream. 
              Assets in this stream will remain in your feed but won't be associated with this stream anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <UploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        initialStreamId={stream.id}
      />

      {/* Add Bookmark Dialog */}
      <AddBookmarkDialog
        open={addBookmarkDialogOpen}
        onOpenChange={setAddBookmarkDialogOpen}
        onSubmit={handleAddBookmark}
      />

      {/* Manage Members Dialog - for private streams */}
      {stream.is_private && (
        <ManageMembersDialog
          open={manageMembersDialogOpen}
          onOpenChange={setManageMembersDialogOpen}
          streamId={stream.id}
          streamOwnerId={stream.owner_id}
        />
      )}

      {/* Edit Stream Dialog */}
      <StreamDialog
        open={editStreamDialogOpen}
        onOpenChange={setEditStreamDialogOpen}
        mode="edit"
        stream={stream}
      />
    </div>
  );
});
