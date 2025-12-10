"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// Dynamic import for StreamDialog - only loaded when opened
const StreamDialog = dynamic(
  () => import("@/components/layout/stream-dialog").then((mod) => mod.StreamDialog),
  { ssr: false }
);
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Layers,
  Lock,
  Globe,
  Users,
  Image as ImageIcon,
  ArrowRight,
  Plus,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface StreamOwner {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Stream {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_private: boolean;
  status: string;
  created_at: string;
  owner: StreamOwner | null;
  asset_count: number;
  member_count: number;
}

interface StreamsResponse {
  streams: Stream[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StreamsTab() {
  const [streams, setStreams] = React.useState<Stream[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingStream, setEditingStream] = React.useState<Stream | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteStream, setDeleteStream] = React.useState<Stream | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = React.useState(false);
  const [mergeTarget, setMergeTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Use ref for search to avoid dependency issues in fetchStreams
  const searchRef = React.useRef(search);
  searchRef.current = search;
  
  // Use ref for page to allow manual fetch calls
  const pageRef = React.useRef(page);
  pageRef.current = page;

  const fetchStreams = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageRef.current.toString(),
        limit: "20",
      });
      if (searchRef.current) params.set("search", searchRef.current);

      const response = await fetch(`/api/admin/streams?${params}`);
      if (!response.ok) throw new Error("Failed to fetch streams");

      const data: StreamsResponse = await response.json();
      setStreams(data.streams);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load streams");
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - uses refs

  // Track if this is the initial mount
  const isInitialMount = React.useRef(true);
  // Track if page change is from search (to skip immediate fetch)
  const isSearchTriggeredPageChange = React.useRef(false);

  // Initial fetch on mount
  React.useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  // Cleanup timeout on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  // Refetch when page changes (immediate, no debounce needed)
  // Skip initial mount and search-triggered page changes
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Skip if this page change was triggered by search (debounce handles that)
    if (isSearchTriggeredPageChange.current) {
      isSearchTriggeredPageChange.current = false;
      return;
    }
    fetchStreams();
  }, [page, fetchStreams]);

  // Debounced search - only triggers fetch after user stops typing
  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Mark that we're about to change page due to search
    isSearchTriggeredPageChange.current = true;
    setPage(1); // Reset to page 1 on search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchStreams(); // Actually call fetch after debounce
    }, 300);
  };

  const handleEditClick = (stream: Stream) => {
    setEditingStream(stream);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (stream: Stream) => {
    setDeleteStream(stream);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search and Create */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search streams..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {total} stream{total !== 1 ? "s" : ""}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Stream
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && streams.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No streams found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try a different search term" : "No streams have been created yet"}
          </p>
        </div>
      )}

      {/* Streams Table */}
      {!loading && !error && streams.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-center">Assets</th>
                <th className="py-3 px-4 text-center">Members</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {streams.map((stream) => (
                <StreamRow
                  key={stream.id}
                  stream={stream}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog - reuse existing StreamDialog component */}
      <StreamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        onSuccess={() => fetchStreams()}
      />

      {/* Edit Dialog */}
      <EditStreamDialog
        stream={editingStream}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchStreams}
        onMergeRequired={(target) => {
          setMergeTarget(target);
          setEditDialogOpen(false);
          setMergeDialogOpen(true);
        }}
      />

      {/* Merge Dialog */}
      <MergeStreamDialog
        sourceStream={editingStream}
        targetStream={mergeTarget}
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        onSuccess={() => {
          setEditingStream(null);
          setMergeTarget(null);
          fetchStreams();
        }}
      />

      {/* Delete Dialog */}
      <DeleteStreamDialog
        stream={deleteStream}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchStreams}
      />
    </div>
  );
}

// ============================================================================
// STREAM ROW
// ============================================================================

function StreamRow({
  stream,
  onEdit,
  onDelete,
}: {
  stream: Stream;
  onEdit: (stream: Stream) => void;
  onDelete: (stream: Stream) => void;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Stream Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded bg-muted text-muted-foreground">
            {stream.is_private ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
          </div>
          <div>
            <Link
              href={`/stream/${stream.name}`}
              className="font-medium text-foreground hover:underline"
            >
              #{stream.name}
            </Link>
            {stream.is_private && (
              <Badge variant="outline" className="ml-2 text-xs">
                Private
              </Badge>
            )}
          </div>
        </div>
      </td>

      {/* Owner */}
      <td className="py-3 px-4">
        {stream.owner ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={stream.owner.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {stream.owner.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{stream.owner.display_name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Team</span>
        )}
      </td>

      {/* Assets */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          {stream.asset_count}
        </div>
      </td>

      {/* Members */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {stream.member_count}
        </div>
      </td>

      {/* Created */}
      <td className="py-3 px-4">
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(stream.created_at), { addSuffix: true })}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(stream)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(stream)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ============================================================================
// EDIT STREAM DIALOG
// ============================================================================

function EditStreamDialog({
  stream,
  open,
  onOpenChange,
  onSuccess,
  onMergeRequired,
}: {
  stream: Stream | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onMergeRequired: (target: { id: string; name: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (stream) {
      setName(stream.name);
      setError(null);
    }
  }, [stream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stream || !name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NAME_CONFLICT" && data.existingStream) {
          // Name conflict - trigger merge dialog
          onMergeRequired(data.existingStream);
          return;
        }
        throw new Error(data.error || "Failed to rename stream");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename stream");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Stream</DialogTitle>
          <DialogDescription>
            Change the name of this stream. Names must be lowercase with hyphens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stream-name">Stream name</Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">#</span>
                <Input
                  id="stream-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="stream-name"
                  className="flex-1"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MERGE STREAM DIALOG
// ============================================================================

function MergeStreamDialog({
  sourceStream,
  targetStream,
  open,
  onOpenChange,
  onSuccess,
}: {
  sourceStream: Stream | null;
  targetStream: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleMerge = async () => {
    if (!sourceStream || !targetStream) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/streams/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: sourceStream.id,
          targetId: targetStream.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to merge streams");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge streams");
    } finally {
      setLoading(false);
    }
  };

  if (!sourceStream || !targetStream) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>#{targetStream.name} already exists</DialogTitle>
          <DialogDescription>
            Do you want to move all posts from <strong>#{sourceStream.name}</strong> to{" "}
            <strong>#{targetStream.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
            <span>
              All posts in <strong>#{sourceStream.name}</strong> will be moved to{" "}
              <strong>#{targetStream.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
            <span>
              Members of <strong>#{sourceStream.name}</strong> will be added to{" "}
              <strong>#{targetStream.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
            <span>
              <strong>#{sourceStream.name}</strong> will be deleted
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move posts to #{targetStream.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// DELETE STREAM DIALOG
// ============================================================================

function DeleteStreamDialog({
  stream,
  open,
  onOpenChange,
  onSuccess,
}: {
  stream: Stream | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [deleteAssets, setDeleteAssets] = React.useState<"keep" | "delete">("keep");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (stream) {
      setDeleteAssets("keep");
      setError(null);
    }
  }, [stream]);

  const handleDelete = async () => {
    if (!stream) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (deleteAssets === "delete") {
        params.set("deleteAssets", "true");
      }

      const response = await fetch(
        `/api/admin/streams/${stream.id}?${params}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete stream");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stream");
    } finally {
      setLoading(false);
    }
  };

  if (!stream) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete #{stream.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This stream has {stream.asset_count} asset{stream.asset_count !== 1 ? "s" : ""} and{" "}
            {stream.member_count} member{stream.member_count !== 1 ? "s" : ""}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium mb-3 block">
            What should happen to the assets?
          </Label>
          <RadioGroup
            value={deleteAssets}
            onValueChange={(v) => setDeleteAssets(v as "keep" | "delete")}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="keep" id="keep" className="mt-1" />
              <div>
                <Label htmlFor="keep" className="font-normal cursor-pointer">
                  Remove from stream only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Assets stay in the library, just unlinked from this stream
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div>
                <Label htmlFor="delete" className="font-normal cursor-pointer text-destructive">
                  Delete assets permanently
                </Label>
                <p className="text-xs text-muted-foreground">
                  This cannot be undone!
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Stream
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

