"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAssetComments } from "@/lib/hooks/use-asset-comments";
import { useAssetLike } from "@/lib/hooks/use-asset-like";
import { useAssetView } from "@/lib/hooks/use-asset-view";
import { useUserFollow } from "@/lib/hooks/use-user-follow";
import { AssetMediaView } from "./asset-detail-media";
import { AssetDetailSidebar } from "./asset-detail-sidebar";
import { EditAssetDialog } from "./edit-asset-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { KEYS } from "@/lib/constants";
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
import type { Asset, User, CommentUser } from "@/lib/types/database";

interface AssetDetailDesktopProps {
  asset: Asset;
  previousAsset?: Asset | null;
  nextAsset?: Asset | null;
  onClose?: () => void;
  onNavigate?: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
}

export function AssetDetailDesktop({
  asset,
  previousAsset = null,
  nextAsset = null,
  onClose,
  onNavigate,
  onDelete,
}: AssetDetailDesktopProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedCommentId = searchParams.get("comment");
  const modalRef = React.useRef<HTMLDivElement>(null);
  const commentsSectionRef = React.useRef<HTMLDivElement>(null);

  const { comments, addComment, updateComment, deleteComment } =
    useAssetComments(asset.id);
  const { isLiked, likeCount, toggleLike } = useAssetLike(
    asset.id,
    asset.isLikedByCurrentUser ?? false,
    asset.likeCount ?? 0
  );

  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [currentAsset, setCurrentAsset] = React.useState<Asset>(asset);
  const [assetStreams, setAssetStreams] = React.useState(asset.streams || []);

  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchCurrentUser();
  }, []);

  React.useEffect(() => {
    setCurrentAsset(asset);
  }, [asset]);

  React.useEffect(() => {
    setAssetStreams(asset.streams || []);
  }, [asset.streams]);

  const uploader = currentAsset.uploader;
  const { isFollowing, toggleFollow, loading: followLoading } = useUserFollow(
    uploader?.username || ""
  );
  const isOwnPost = currentUser?.id === currentAsset.uploader_id;

  const [viewCount, setViewCount] = React.useState(currentAsset.view_count || 0);
  React.useEffect(() => {
    setViewCount(currentAsset.view_count || 0);
  }, [currentAsset.id, currentAsset.view_count]);
  useAssetView(currentAsset.id, !isOwnPost, (newCount) => {
    setViewCount(newCount);
  });

  // Comment handlers
  const handleAddComment = React.useCallback(
    async (content: string) => {
      setIsSubmitting(true);
      await addComment(content, replyingToId || undefined);
      setReplyingToId(null);
      setIsSubmitting(false);
    },
    [addComment, replyingToId]
  );

  const handleEditComment = React.useCallback(
    async (commentId: string, newContent: string) => {
      await updateComment(commentId, newContent);
      setEditingCommentId(null);
    },
    [updateComment]
  );

  const handleDeleteComment = React.useCallback(
    async (commentId: string) => {
      await deleteComment(commentId);
    },
    [deleteComment]
  );

  const handleAssetLike = React.useCallback(async () => {
    await toggleLike();
  }, [toggleLike]);

  const replyingToUser = React.useMemo((): CommentUser | null => {
    if (!replyingToId) return null;
    const comment = comments.find((c) => c.id === replyingToId);
    return comment?.user || null;
  }, [replyingToId, comments]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      ) {
        if (e.key === KEYS.escape) return;
        if (e.key === KEYS.arrowLeft || e.key === KEYS.arrowRight) return;
      }

      switch (e.key) {
        case KEYS.escape:
          if (onClose) onClose();
          else router.push("/home");
          break;
        case KEYS.arrowLeft:
          if (previousAsset) {
            e.preventDefault();
            if (onNavigate) onNavigate(previousAsset.id);
            else router.push(`/e/${previousAsset.id}`);
          }
          break;
        case KEYS.arrowRight:
          if (nextAsset) {
            e.preventDefault();
            if (onNavigate) onNavigate(nextAsset.id);
            else router.push(`/e/${nextAsset.id}`);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [router, previousAsset, nextAsset, onClose, onNavigate]);

  // Adjacent image preloading (respects data-saver and slow connections)
  const previousUrl = previousAsset?.url;
  const nextUrl = nextAsset?.url;
  React.useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g") return;

    const cleanupFunctions: (() => void)[] = [];
    const preloadImage = (url: string) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
      return () => {
        if (link.parentNode) link.parentNode.removeChild(link);
      };
    };

    const schedulePreload = () => {
      if (previousUrl) cleanupFunctions.push(preloadImage(previousUrl));
      if (nextUrl) cleanupFunctions.push(preloadImage(nextUrl));
    };

    if ("requestIdleCallback" in window) {
      const idleId = requestIdleCallback(schedulePreload, { timeout: 2000 });
      return () => {
        cancelIdleCallback(idleId);
        cleanupFunctions.forEach((fn) => fn());
      };
    } else {
      const timeoutId = setTimeout(schedulePreload, 200);
      return () => {
        clearTimeout(timeoutId);
        cleanupFunctions.forEach((fn) => fn());
      };
    }
  }, [previousUrl, nextUrl]);

  // Focus trap
  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== KEYS.tab || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      previousFocus?.focus();
    };
  }, []);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete asset");
      }
      onDelete?.(asset.id);
      if (onClose) onClose();
      else router.push("/home");
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete asset"
      );
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/e/${asset.id}`);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.title || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading asset:", error);
    }
  };

  const handleEditSuccess = React.useCallback((updatedAsset: Partial<Asset>) => {
    setCurrentAsset((prev) => ({
      ...prev,
      title: updatedAsset.title ?? prev.title,
      description: updatedAsset.description ?? prev.description,
    }));
    if (updatedAsset.streams) setAssetStreams(updatedAsset.streams);
  }, []);

  const canDelete = !!(currentUser && currentUser.id === currentAsset.uploader_id);
  const canEdit = canDelete;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[100] bg-background flex flex-row overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Asset detail view"
      tabIndex={-1}
    >
      {/* Close Button */}
      {onClose ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 left-4 z-50 bg-background/50 hover:bg-accent rounded-full text-foreground backdrop-blur-md"
          aria-label="Close asset detail"
          title="Close (ESC)"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </Button>
      ) : (
        <Link
          href="/home"
          className="absolute top-4 left-4 z-50 p-2 bg-background/50 hover:bg-accent rounded-full text-foreground transition-colors backdrop-blur-md"
          aria-label="Close asset detail"
          title="Close (ESC)"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </Link>
      )}

      <AssetMediaView asset={currentAsset} />

      <AssetDetailSidebar
        currentAsset={currentAsset}
        currentUser={currentUser}
        assetStreams={assetStreams}
        isOwnPost={isOwnPost}
        isFollowing={isFollowing}
        followLoading={followLoading}
        viewCount={viewCount}
        isLiked={isLiked}
        likeCount={likeCount}
        comments={comments}
        editingCommentId={editingCommentId}
        replyingToId={replyingToId}
        replyingToUser={replyingToUser}
        isSubmitting={isSubmitting}
        highlightedCommentId={highlightedCommentId}
        canEdit={canEdit}
        canDelete={canDelete}
        commentsSectionRef={commentsSectionRef}
        originalAssetId={asset.id}
        onFollow={toggleFollow}
        onAssetLike={handleAssetLike}
        onScrollToComments={() =>
          commentsSectionRef.current?.scrollIntoView({ behavior: "smooth" })
        }
        onEditClick={() => setShowEditDialog(true)}
        onDeleteClick={() => setShowDeleteDialog(true)}
        onShare={handleShare}
        onDownload={handleDownload}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        onReply={setReplyingToId}
        onStartEdit={setEditingCommentId}
        onCancelEdit={() => setEditingCommentId(null)}
      />

      <EditAssetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        asset={currentAsset}
        currentStreams={assetStreams}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              asset and all associated comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
