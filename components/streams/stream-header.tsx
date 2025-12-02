"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Lock, 
  Globe, 
  Plus, 
  MoreHorizontal, 
  Share, 
  Archive, 
  Trash2, 
  Check, 
  Loader2, 
  X, 
  ChevronDown,
  Users,
  Image as ImageIcon,
  Bookmark
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStreamFollow } from "@/lib/hooks/use-stream-follow";
import { useStreamBookmarks, extractDomain, getFaviconUrl } from "@/lib/hooks/use-stream-bookmarks";
import { StreamFollowers } from "@/components/customized/avatar/avatar-12";
import { UploadDialog } from "@/components/layout/upload-dialog";
import { AddBookmarkDialog } from "@/components/streams/add-bookmark-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreamHeaderProps {
  stream: any;
  owner: any;
}

export const StreamHeader = React.memo(function StreamHeader({ stream, owner }: StreamHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [addBookmarkDialogOpen, setAddBookmarkDialogOpen] = React.useState(false);
  
  // Use stream follow hook
  const { 
    isFollowing, 
    followerCount, 
    followers,
    contributorCount,
    contributors,
    assetCount,
    toggleFollow, 
    loading: followLoading 
  } = useStreamFollow(stream.id);

  // Use stream bookmarks hook
  const {
    bookmarks,
    addBookmark,
    deleteBookmark,
  } = useStreamBookmarks(stream.id);

  // Memoized bookmark display logic
  const { visibleBookmarks, overflowBookmarks, hasOverflow } = React.useMemo(() => {
    const MAX_VISIBLE = 6;
    const visible = bookmarks.slice(0, MAX_VISIBLE);
    const overflow = bookmarks.slice(MAX_VISIBLE);
    return {
      visibleBookmarks: visible,
      overflowBookmarks: overflow,
      hasOverflow: overflow.length > 0,
    };
  }, [bookmarks]);

  // Fetch current user
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchCurrentUser();
  }, []);

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
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4 mb-8">
        {/* ═══════════════════════════════════════════════════════════════════
            ROW 1: Primary Header (Title + Description + Actions)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Left: Stream Identity */}
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-muted-foreground/60 font-normal">#</span>
              <span className="truncate">{stream.name}</span>
            </h1>
            
            {stream.description && (
              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                {stream.description}
              </p>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Follower Avatars */}
            {(followers.length > 0 || followerCount > 0) && (
              <div className="mr-2 hidden sm:block">
                <StreamFollowers 
                  followers={followers} 
                  max={3} 
                  totalCount={followerCount}
                  size="sm"
                />
              </div>
            )}
            
            {/* Follow Button */}
            <Button 
              variant={isFollowing ? "secondary" : "outline"}
              size="sm"
              onClick={handleFollow}
              disabled={followLoading}
              className="h-9"
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Following
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Follow
                </>
              )}
            </Button>
            
            {/* Add Asset Button */}
            <Button 
              variant="default" 
              size="sm"
              onClick={handleOpenUploadDialog}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Create Drop</span>
              <span className="sm:hidden">Add</span>
            </Button>
            
            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="h-4 w-4 mr-2" />
                  Share Stream
                </DropdownMenuItem>
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
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 2: Info Bar (Stats + Bookmarks)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-t border-border/50">
          {/* Left: Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Visibility */}
            <div className="flex items-center gap-1.5">
              {stream.is_private ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              <span>{stream.is_private ? 'Private' : 'Public'}</span>
            </div>
            
            {/* Contributors */}
            <div className="relative group/contributors">
              <div className="flex items-center gap-1.5 cursor-default hover:text-foreground transition-colors">
                <Users className="h-3.5 w-3.5" />
                <span>{contributorCount} {contributorCount === 1 ? 'Contributor' : 'Contributors'}</span>
              </div>
              
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
            </div>
            
            {/* Shots */}
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>{assetCount} {assetCount === 1 ? 'Shot' : 'Shots'}</span>
            </div>
            
            {/* Archived Badge */}
            {stream.status === 'archived' && (
              <div className="flex items-center gap-1.5 text-orange-500">
                <Archive className="h-3.5 w-3.5" />
                <span>Archived</span>
              </div>
            )}
          </div>

          {/* Right: Bookmarks */}
          <div className="flex items-center gap-1">
            {/* Bookmark Icons */}
            {visibleBookmarks.map((bookmark) => (
              <Tooltip key={bookmark.id}>
                <TooltipTrigger asChild>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/bookmark relative flex items-center justify-center w-8 h-8 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <img
                      src={getFaviconUrl(bookmark.url, 32)}
                      alt=""
                      className="w-4 h-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Bookmark className="w-4 h-4 text-muted-foreground hidden" />
                    
                    {/* Delete button on hover */}
                    {canDeleteBookmark(bookmark.created_by) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteBookmark(bookmark.id);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/bookmark:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Delete bookmark"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{bookmark.title || extractDomain(bookmark.url)}</p>
                  <p className="text-xs text-muted-foreground truncate">{bookmark.url}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Overflow Dropdown */}
            {hasOverflow && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary/50 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors">
                    +{overflowBookmarks.length}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenAddBookmarkDialog}
                  className="flex items-center justify-center w-8 h-8 rounded-md border border-dashed border-border hover:border-muted-foreground hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Add bookmark</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

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
      </div>
    </TooltipProvider>
  );
});
