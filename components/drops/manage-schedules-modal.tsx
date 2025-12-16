"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Settings,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CreateSeriesDialog } from "./create-series-dialog";
import { EditSeriesDialog } from "./edit-series-dialog";
import { DAYS_OF_WEEK_NAMES, getOrdinalSuffix } from "@/lib/utils/schedule-helpers";
import type { DropSchedule } from "@/lib/types/database";

interface ManageSchedulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: DropSchedule[];
  onSchedulesChange?: () => void;
}

export function ManageSchedulesModal({
  open,
  onOpenChange,
  schedules: initialSchedules,
  onSchedulesChange,
}: ManageSchedulesModalProps) {
  const router = useRouter();
  const [schedules, setSchedules] = React.useState(initialSchedules);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<DropSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = React.useState<DropSchedule | null>(null);
  const [loadingStates, setLoadingStates] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);

  // Sync with parent
  React.useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const setLoading = (id: string, action: string | null) => {
    setLoadingStates(prev => {
      if (action === null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: action };
    });
  };

  const handleGenerateNow = async (schedule: DropSchedule) => {
    setLoading(schedule.id, "generating");
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/generate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate drop");
      }

      // Validate response before closing modal
      if (!data.drop?.id) {
        throw new Error("Failed to generate drop: Invalid response");
      }

      // Close modal and navigate to the new drop
      onOpenChange(false);
      router.push(`/drops/${data.drop.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate drop");
      setLoading(schedule.id, null);
    }
  };

  const handlePause = async (schedule: DropSchedule) => {
    setLoading(schedule.id, "pausing");
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/pause`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to pause schedule");
      }

      setSchedules(prev => prev.map(s => s.id === schedule.id ? data : s));
      onSchedulesChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause schedule");
    } finally {
      setLoading(schedule.id, null);
    }
  };

  const handleResume = async (schedule: DropSchedule) => {
    setLoading(schedule.id, "resuming");
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${schedule.id}/resume`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resume schedule");
      }

      setSchedules(prev => prev.map(s => s.id === schedule.id ? data : s));
      onSchedulesChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume schedule");
    } finally {
      setLoading(schedule.id, null);
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    
    // Capture ID before any state changes
    const scheduleId = deletingSchedule.id;
    
    setLoading(scheduleId, "deleting");
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete series");
      }

      // Update state in correct order to prevent brief clickable window:
      // 1. First remove from list (optimistic)
      // 2. Clear loading state
      // 3. Close dialog LAST
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      setLoading(scheduleId, null);
      setDeletingSchedule(null);
      onSchedulesChange?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete series");
      setLoading(scheduleId, null);
    }
  };

  const handleEditSuccess = (updated: DropSchedule) => {
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingSchedule(null);
    onSchedulesChange?.();
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    onSchedulesChange?.();
    router.refresh();
  };

  const getScheduleDescription = (schedule: DropSchedule) => {
    const time = schedule.generation_time.slice(0, 5);
    switch (schedule.frequency) {
      case "weekly":
        return `Every ${DAYS_OF_WEEK_NAMES[schedule.day_of_week ?? 1]} at ${time}`;
      case "biweekly":
        return `Every other ${DAYS_OF_WEEK_NAMES[schedule.day_of_week ?? 1]} at ${time}`;
      case "monthly":
        return `${schedule.day_of_month}${getOrdinalSuffix(schedule.day_of_month ?? 1)} of each month at ${time}`;
      case "custom":
        return `Every ${schedule.custom_interval_days} days at ${time}`;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Manage Scheduled Drops
            </DialogTitle>
            <DialogDescription>
              Create and manage your recurring drop schedules
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No scheduled drops yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Create a schedule to automatically generate drops on a recurring basis
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const loading = loadingStates[schedule.id];
                  
                  return (
                    <div
                      key={schedule.id}
                      className="rounded-lg border border-border bg-card/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{schedule.name}</h3>
                            <Badge 
                              variant={schedule.status === "active" ? "default" : "secondary"}
                              className="shrink-0"
                            >
                              {schedule.status === "active" ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{getScheduleDescription(schedule)}</span>
                            </div>
                            {schedule.status === "active" && schedule.next_run_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  Next: {format(new Date(schedule.next_run_at), "MMM d")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateNow(schedule)}
                            disabled={!!loading}
                            title="Generate now"
                          >
                            {loading === "generating" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>

                          {schedule.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePause(schedule)}
                              disabled={!!loading}
                              title="Pause"
                            >
                              {loading === "pausing" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pause className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResume(schedule)}
                              disabled={!!loading}
                              title="Resume"
                            >
                              {loading === "resuming" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSchedule(schedule)}
                            disabled={!!loading}
                            title="Edit"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingSchedule(schedule)}
                            disabled={!!loading}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            {loading === "deleting" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Scheduled Drop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <CreateSeriesDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      {editingSchedule && (
        <EditSeriesDialog
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          schedule={editingSchedule}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingSchedule} 
        onOpenChange={(open) => !open && setDeletingSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingSchedule?.name}&rdquo;? 
              This will stop all future scheduled generations. Existing drops will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingStates[deletingSchedule?.id || ""]}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!loadingStates[deletingSchedule?.id || ""]}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingStates[deletingSchedule?.id || ""] === "deleting" ? (
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
    </>
  );
}

