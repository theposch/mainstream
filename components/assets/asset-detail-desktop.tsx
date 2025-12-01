"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAssetComments } from "@/lib/hooks/use-asset-comments";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { StreamBadge } from "@/components/streams/stream-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KEYS, ANIMATION_DURATION, ANIMATION_EASING, IMAGE_SIZES } from "@/lib/constants";
import { X, Heart, MessageCircle, Share2, Download, MoreHorizontal, ArrowLeft, ChevronRight, Reply, Trash2 } from "lucide-react";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

interface AssetDetailDesktopProps {
  asset: any; // Asset from database (snake_case)
}

export function AssetDetailDesktop({ asset }: AssetDetailDesktopProps) {
  const router = useRouter();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const commentsSectionRef = React.useRef<HTMLDivElement>(null);
  
  // Use real hooks for comments and likes
  const { comments, addComment, updateComment, deleteComment, loading: commentsLoading } = useAssetComments(asset.id);
  const { isLiked, likeCount, toggleLike } = useAssetLike(asset.id);
  
  // Local UI state for comment interactions
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
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
  
  // Get uploader and streams from asset object (already joined in server query)
  const uploader = asset.uploader;
  
  // Get streams for this asset
  const [assetStreams, setAssetStreams] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    const fetchStreams = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('asset_streams')
        .select('streams(*)')
        .eq('asset_id', asset.id);
      
      if (data) {
        setAssetStreams(data.map(rel => rel.streams).filter(Boolean));
      }
    };
    fetchStreams();
  }, [asset.id]);
  
  const visibleStreams = assetStreams.slice(0, 3);
  const overflowCount = Math.max(0, assetStreams.length - 3);

  // Navigation between assets (simplified for now - can be enhanced with context)
  const hasPrevious = false;
  const hasNext = false;
  const previousAsset: any = null;
  const nextAsset: any = null;
  
  // Comment interaction handlers
  const handleAddComment = React.useCallback(async (content: string) => {
    setIsSubmitting(true);
    await addComment(content, replyingToId || undefined);
    setReplyingToId(null);
    setIsSubmitting(false);
  }, [addComment, replyingToId]);

  const handleEditComment = React.useCallback(async (commentId: string, newContent: string) => {
    await updateComment(commentId, newContent);
    setEditingCommentId(null);
  }, [updateComment]);

  const handleDeleteComment = React.useCallback(async (commentId: string) => {
    await deleteComment(commentId);
  }, [deleteComment]);

  const handleLikeComment = React.useCallback((commentId: string) => {
    // Comment likes are now handled by useCommentLike hook in CommentItem component
    console.log('Like comment:', commentId);
  }, []);

  const handleAssetLike = React.useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const replyingToUser = React.useMemo(() => {
    if (!replyingToId) return null;
    const comment = comments.find(c => c.id === replyingToId);
    return comment?.user || null;
  }, [replyingToId, comments]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        if (e.key === KEYS.escape) return;
        if (e.key === KEYS.arrowLeft || e.key === KEYS.arrowRight) return;
      }

      switch(e.key) {
        case KEYS.escape:
          router.push('/home');
          break;
        case KEYS.arrowLeft:
          if (previousAsset) {
            e.preventDefault();
            router.push(`/e/${previousAsset.id}`);
          }
          break;
        case KEYS.arrowRight:
          if (nextAsset) {
            e.preventDefault();
            router.push(`/e/${nextAsset.id}`);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [router, previousAsset, nextAsset]);

  // Preload adjacent images
  React.useEffect(() => {
    if (previousAsset?.url) {
      const img = new window.Image();
      img.src = previousAsset.url;
    }
    if (nextAsset?.url) {
      const img = new window.Image();
      img.src = nextAsset.url;
    }
  }, [previousAsset, nextAsset]);

  // Focus management
  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== KEYS.tab || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousFocus?.focus();
    };
  }, []);

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete asset');
      }

      // Success - redirect to home
      router.push('/home');
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete asset');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/e/${asset.id}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.title || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading asset:', error);
    }
  };

  const canDelete = currentUser && currentUser.id === asset.uploader_id;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[100] bg-black flex flex-row overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Asset detail view"
      tabIndex={-1}
    >
      {/* Close Button */}
      <Link 
        href="/home" 
        className="absolute top-4 left-4 z-50 p-2 bg-background/50 hover:bg-accent rounded-full text-foreground transition-colors backdrop-blur-md"
        aria-label="Close asset detail"
        title="Close (ESC)"
      >
        <X className="h-6 w-6" aria-hidden="true" />
      </Link>

      {/* Left: Media View */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
        <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={asset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.fast, ease: ANIMATION_EASING.easeInOut }}
              className="relative w-full h-full"
            >
              <Image
                src={asset.url}
                alt={asset.title}
                fill
                className="object-contain"
                sizes={IMAGE_SIZES.full}
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Sidebar Info */}
      <div className="w-[400px] lg:w-[480px] bg-black border-l border-zinc-900 flex flex-col h-full overflow-hidden shrink-0">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={asset.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.fast, ease: ANIMATION_EASING.easeInOut }}
              className="p-6 space-y-8 pb-20"
            >
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                      <Button variant="secondary" size="icon-lg" onClick={handleShare}>
                          <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="icon-lg" onClick={handleDownload}>
                          <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon-lg">
                          <MoreHorizontal className="h-4 w-4" />
                      </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[110]">
                          <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleDownload}>
                            <Download className="h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Asset
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                  <Button variant="default" size="default">
                      Save
                  </Button>
              </div>

              {/* Stream Badges */}
              {assetStreams.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap -mt-4">
                  {visibleStreams.map((stream) => (
                    <StreamBadge key={stream.id} stream={stream} clickable={true} />
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-xs text-white/70 px-2 py-1 bg-white/10 backdrop-blur-md rounded-md">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              )}

              {/* Title & Uploader */}
              <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white leading-tight">{asset.title}</h1>
                  
                  <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={uploader?.avatar_url} />
                          <AvatarFallback>{uploader?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{uploader?.display_name || 'Unknown User'}</span>
                          <span className="text-xs text-muted-foreground">Added {new Date(asset.created_at).toLocaleDateString()}</span>
                      </div>
                      <Button variant="secondary" size="sm" className="ml-auto">
                          Follow
                      </Button>
                  </div>
              </div>

              {/* Interactions */}
              <div className="flex gap-6 border-y border-zinc-900 py-4">
                  <button 
                    onClick={handleAssetLike}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                  >
                      <Heart className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "group-hover:text-white"}`} />
                      <span className={`text-sm font-medium ${isLiked ? "text-red-500" : ""}`}>{likeCount}</span>
                  </button>
                  <button 
                    onClick={scrollToComments}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                      </span>
                  </button>
              </div>

               {/* Streams */}
               {assetStreams.length > 0 && (
               <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Streams</h3>
                  <div className="flex flex-wrap gap-2">
                      {assetStreams.map((stream) => (
                        <StreamBadge key={stream.id} stream={stream} clickable={true} className="text-sm" />
                      ))}
                       </div>
                  </div>
               )}

              {/* Comments List */}
              <div ref={commentsSectionRef} id="comments-section" className="space-y-6 pt-2">
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-6">
                     <h3 className="text-sm font-semibold text-white">Comments ({comments.length})</h3>
                  </div>
                  
                  <CommentList 
                    comments={comments}
                    currentUser={currentUser}
                    onReply={setReplyingToId}
                    onEdit={handleEditComment}
                    onStartEdit={setEditingCommentId}
                    onDelete={handleDeleteComment}
                    onLike={handleLikeComment}
                    editingCommentId={editingCommentId}
                    onCancelEdit={() => setEditingCommentId(null)}
                  />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Comment Input */}
        <div className="p-4 bg-black border-t border-zinc-900 z-10 shrink-0">
           {replyingToId && replyingToUser && (
             <div className="flex items-center justify-between bg-zinc-900/50 rounded-t-lg px-3 py-1.5 mb-2 text-xs border border-zinc-800">
               <span className="text-zinc-400 flex items-center gap-1">
                 <Reply className="h-3 w-3" />
                 Replying to <span className="font-medium text-zinc-300">@{replyingToUser.username || 'unknown'}</span>
               </span>
               <button 
                 onClick={() => setReplyingToId(null)}
                 className="text-zinc-500 hover:text-white p-0.5"
               >
                 <X className="h-3 w-3" />
               </button>
             </div>
           )}
           <CommentInput 
              currentUser={currentUser}
              onSubmit={handleAddComment}
              isSubmitting={isSubmitting}
              placeholder={replyingToId ? "Write a reply..." : "Add a comment..."}
              autoFocus={!!replyingToId}
              onCancel={replyingToId ? () => setReplyingToId(null) : undefined}
           />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the asset and all associated comments and likes.
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

    </div>
  );
}

