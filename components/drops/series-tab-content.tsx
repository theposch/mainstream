"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Settings,
  Loader2,
  FileText,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { EditSeriesDialog } from "./edit-series-dialog";
import type { DropSchedule, Drop } from "@/lib/types/database";

interface SeriesTabContentProps {
  schedule: DropSchedule;
  currentDraft: Pick<Drop, "id" | "title" | "status" | "created_at"> | null;
  supersededDrafts: Array<Pick<Drop, "id" | "title" | "status" | "created_at" | "is_superseded">>;
  recentPublished: Array<Pick<Drop, "id" | "title" | "status" | "published_at" | "created_at">>;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SeriesTabContent({
  schedule: initialSchedule,
  currentDraft: initialCurrentDraft,
  supersededDrafts: initialSupersededDrafts,
  recentPublished,
}: SeriesTabContentProps) {
  const router = useRouter();
  const [schedule, setSchedule] = React.useState(initialSchedule);
  const [currentDraft, setCurrentDraft] = React.useState(initialCurrentDraft);
  const [supersededDrafts, setSupersededDrafts] = React.useState(initialSupersededDrafts);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isPausing, setIsPausing] = React.useState(false);
  const [isResuming, setIsResuming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Sync with server data
  React.useEffect(() => {
    setSchedule(initialSchedule);
    setCurrentDraft(initialCurrentDraft);
    setSupersededDrafts(initialSupersededDrafts);
  }, [initialSchedule, initialCurrentDraft, initialSupersededDrafts]);

  const handleGenerateNow = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/generate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate drop");
      }

      // Navigate to the new drop editor
      router.push(`/drops/${data.drop.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate drop");
      setIsGenerating(false);
    }
  };

  const handlePause = async () => {
    setIsPausing(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/pause`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to pause schedule");
      }

      setSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause schedule");
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/resume`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resume schedule");
      }

      setSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume schedule");
    } finally {
      setIsResuming(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete series");
      }

      router.push("/drops");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete series");
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getScheduleDescription = () => {
    const time = schedule.generation_time.slice(0, 5); // HH:MM
    switch (schedule.frequency) {
      case "weekly":
        return `Every ${DAYS_OF_WEEK[schedule.day_of_week ?? 1]} at ${time}`;
      case "biweekly":
        return `Every other ${DAYS_OF_WEEK[schedule.day_of_week ?? 1]} at ${time}`;
      case "monthly":
        return `On the ${schedule.day_of_month}${getOrdinalSuffix(schedule.day_of_month ?? 1)} of each month at ${time}`;
      case "custom":
        return `Every ${schedule.custom_interval_days} days at ${time}`;
    }
  };

  const isUpcomingSoon = schedule.next_run_at && 
    new Date(schedule.next_run_at).getTime() - Date.now() < 24 * 60 * 60 * 1000; // Within 24 hours

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{schedule.name}</h2>
            <Badge variant={schedule.status === "active" ? "default" : "secondary"}>
              {schedule.status === "active" ? "Active" : "Paused"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {getScheduleDescription()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Next generation:</span>
              {schedule.status === "active" && schedule.next_run_at ? (
                <span className="font-medium">
                  {format(new Date(schedule.next_run_at), "MMM d, yyyy 'at' h:mm a")}
                  <span className="text-muted-foreground ml-1">
                    ({formatDistanceToNow(new Date(schedule.next_run_at), { addSuffix: true })})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Paused</span>
              )}
            </div>
          </div>

          {schedule.last_run_at && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last generated:</span>
              <span>
                {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleGenerateNow}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Now
                </>
              )}
            </Button>

            {schedule.status === "active" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={isPausing}
              >
                {isPausing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                disabled={isResuming}
              >
                {isResuming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Resume
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Draft Warning */}
      {currentDraft && isUpcomingSoon && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-500">Draft not yet published</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your current draft hasn&apos;t been published yet and a new one will be generated soon.
              The current draft will be moved to the superseded list.
            </p>
          </div>
        </div>
      )}

      {/* Current Draft */}
      {currentDraft && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Current Draft
            </CardTitle>
            <CardDescription>
              Created {formatDistanceToNow(new Date(currentDraft.created_at), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="font-medium">{currentDraft.title}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/drops/${currentDraft.id}/edit`}>
                    Open Editor
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Superseded Drafts */}
      {supersededDrafts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">
              Previous Drafts (Unpublished)
            </CardTitle>
            <CardDescription>
              These drafts were replaced by newer generations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {supersededDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <span className="text-sm">{draft.title}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/drops/${draft.id}/edit`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Published */}
      {recentPublished.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPublished.map((drop) => (
                <div
                  key={drop.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium">{drop.title}</span>
                    <p className="text-xs text-muted-foreground">
                      Published {drop.published_at && formatDistanceToNow(new Date(drop.published_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/drops/${drop.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <EditSeriesDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        schedule={schedule}
        onSuccess={(updated) => {
          setSchedule(updated);
          setEditDialogOpen(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{schedule.name}&rdquo;? This will stop all future
              scheduled generations. Existing drops will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

