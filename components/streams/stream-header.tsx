"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Globe, Plus, MoreHorizontal, Share, Archive, Trash2, Check, Loader2, Link as LinkIcon, X, ChevronDown } from "lucide-react";
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

interface StreamHeaderProps {
  stream: any;  // Stream from database
  owner: any;   // User or Team from database
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
    loading: bookmarksLoading,
  } = useStreamBookmarks(stream.id);

  // Memoized bookmark display logic
  const { visibleBookmarks, overflowBookmarks, hasOverflow } = React.useMemo(() => {
    const MAX_VISIBLE = 5;
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

      // Success - redirect to streams page
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
    // TODO: Show toast notification
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

  // Check if current user can delete a bookmark (creator or stream owner)
  const canDeleteBookmark = React.useCallback((createdById: string) => {
    if (!currentUser) return false;
    const isCreator = createdById === currentUser.id;
    const isStreamOwner = stream.owner_type === 'user' && stream.owner_id === currentUser.id;
    return isCreator || isStreamOwner;
  }, [currentUser, stream.owner_type, stream.owner_id]);

  // Memoize canDelete computation
  const canDelete = React.useMemo(() => 
    currentUser && stream.owner_type === 'user' && stream.owner_id === currentUser.id,
    [currentUser, stream.owner_type, stream.owner_id]
  );
  
  return (
    <div className="flex flex-col gap-6 mb-10">
      {/* Main Header Content */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            <span className="text-muted-foreground">#</span> {stream.name}
          </h1>
          
          {/* Stream Meta - Under title */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {/* Visibility Badge */}
            <div className="flex items-center gap-1.5">
              {stream.is_private ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              <span>{stream.is_private ? 'Private' : 'Public'}</span>
            </div>
            
            {/* Contributors with hover tooltip */}
            {contributorCount > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <div className="relative group/contributors">
                  <span className="cursor-default hover:text-foreground transition-colors">
                    {contributorCount} {contributorCount === 1 ? 'Contributor' : 'Contributors'}
                  </span>
                  
                  {/* Hover tooltip */}
                  {contributors.length > 0 && (
                    <div className="absolute left-0 top-full mt-2 opacity-0 invisible group-hover/contributors:opacity-100 group-hover/contributors:visible transition-all duration-200 z-50">
                      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
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
              </>
            )}
            
            {/* Asset Count (Shots) */}
            {assetCount > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span>{assetCount} {assetCount === 1 ? 'Shot' : 'Shots'}</span>
              </>
            )}
            
            {/* Archived Badge */}
        {stream.status === 'archived' && (
          <>
                <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1.5 text-orange-500">
                  <Archive className="h-3.5 w-3.5" />
              <span>Archived</span>
            </div>
          </>
        )}
      </div>

          {stream.description && (
            <p className="text-lg text-zinc-400 leading-relaxed">
              {stream.description}
            </p>
          )}

          {/* Bookmarks Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Visible Bookmarks */}
            {visibleBookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/bookmark inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <img
                  src={getFaviconUrl(bookmark.url)}
                  alt=""
                  className="w-4 h-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span>{bookmark.title || extractDomain(bookmark.url)}</span>
                {canDeleteBookmark(bookmark.created_by) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteBookmark(bookmark.id);
                    }}
                    className="ml-1 opacity-0 group-hover/bookmark:opacity-100 hover:text-destructive transition-opacity"
                    aria-label="Delete bookmark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </a>
            ))}

            {/* Overflow Dropdown */}
            {hasOverflow && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <span>+{overflowBookmarks.length} more</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {overflowBookmarks.map((bookmark) => (
                    <DropdownMenuItem
                      key={bookmark.id}
                      asChild
                      className="flex items-center justify-between"
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
                          className="w-4 h-4"
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
                            className="hover:text-destructive"
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-border hover:border-muted-foreground text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Bookmark</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
            {/* Stream Followers - Real data from API */}
            {(followers.length > 0 || followerCount > 0) && (
              <div className="mr-4">
                <StreamFollowers 
                  followers={followers} 
                  max={3} 
                  totalCount={followerCount}
                  size="md"
                />
                    </div>
            )}
            
            {/* Follow/Unfollow Button */}
            <Button 
              variant={isFollowing ? "secondary" : "secondary"}
              size="default"
              onClick={handleFollow}
              disabled={followLoading}
              className={isFollowing ? "bg-secondary hover:bg-secondary/80" : ""}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isFollowing ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            
            {/* Add Asset to Stream */}
            <Button 
              variant="default" 
              size="default"
              onClick={handleOpenUploadDialog}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
            </Button>
            
            {/* Stream Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
            </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[110]">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="h-4 w-4" />
                  Share Stream
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleOpenDeleteDialog}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Stream
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the stream. Assets in this stream will remain in your feed but won't be associated with this stream anymore.
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

      {/* Upload Dialog with pre-selected stream */}
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
  );
});
