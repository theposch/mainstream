"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Hash, Users } from "lucide-react";
import { StreamPicker } from "@/components/streams/stream-picker";
import { UserPicker } from "@/components/users/user-picker";
import { DatePicker } from "@/components/ui/date-picker";

interface CreateDropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get default date range (last 7 days)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  
  return { start, end };
}

// Format date for display in title
function formatDateForTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Format date for API storage - preserves local date by using UTC with same date components
// This avoids timezone shifts when converting local dates to ISO strings
function formatDateForStorage(date: Date, endOfDay: boolean = false): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (endOfDay) {
    return `${year}-${month}-${day}T23:59:59.999Z`;
  }
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

export function CreateDropDialog({ open, onOpenChange }: CreateDropDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const defaultDates = React.useMemo(() => getDefaultDateRange(), []);
  
  const [title, setTitle] = React.useState(`Weekly Drop · ${formatDateForTitle(defaultDates.end)}`);
  const [dateStart, setDateStart] = React.useState<Date | undefined>(defaultDates.start);
  const [dateEnd, setDateEnd] = React.useState<Date | undefined>(defaultDates.end);
  const [selectedStreamIds, setSelectedStreamIds] = React.useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      const dates = getDefaultDateRange();
      setTitle(`Weekly Drop · ${formatDateForTitle(dates.end)}`);
      setDateStart(dates.start);
      setDateEnd(dates.end);
      setSelectedStreamIds([]);
      setSelectedUserIds([]);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!dateStart || !dateEnd) {
      setError("Date range is required");
      return;
    }

    if (dateStart > dateEnd) {
      setError("Start date must be before end date");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          // Use timezone-safe formatting to preserve the local date intent
          date_range_start: formatDateForStorage(dateStart),
          date_range_end: formatDateForStorage(dateEnd, true),
          filter_stream_ids: selectedStreamIds.length > 0 ? selectedStreamIds : null,
          filter_user_ids: selectedUserIds.length > 0 ? selectedUserIds : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create drop");
      }

      onOpenChange(false);
      router.push(`/drops/${data.drop.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create drop");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create a new Drop</DialogTitle>
          <DialogDescription>
            Drops are our one-click way to make a newsletter-style summary of
            the work shared by your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly Drop · December 4, 2025"
              disabled={isLoading}
            />
          </div>

          {/* Include posts section */}
          <div className="space-y-4">
            <Label className="text-muted-foreground">Include posts</Label>
            
            {/* Date range */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created between...</span>
              </div>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={dateStart}
                  onDateChange={setDateStart}
                  placeholder="Start date"
                  disabled={isLoading}
                  className="flex-1"
                  popoverClassName="z-[60]"
                />
                <span className="text-muted-foreground">→</span>
                <DatePicker
                  date={dateEnd}
                  onDateChange={setDateEnd}
                  placeholder="End date"
                  disabled={isLoading}
                  className="flex-1"
                  popoverClassName="z-[60]"
                />
              </div>
              {dateStart && dateEnd && (
                <p className="text-xs text-muted-foreground">
                  Showing posts from {format(dateStart, "MMM d, yyyy")} to {format(dateEnd, "MMM d, yyyy")}
                </p>
              )}
            </div>

            {/* Stream filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Posted in...</span>
              </div>
              <StreamPicker
                selectedStreamIds={selectedStreamIds}
                onSelectStreams={setSelectedStreamIds}
                disabled={isLoading}
                variant="compact"
                maxStreams={10}
                popoverClassName="z-[60]"
              />
            </div>

            {/* User filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Posted by...</span>
              </div>
              <UserPicker
                selectedUserIds={selectedUserIds}
                onSelectUsers={setSelectedUserIds}
                disabled={isLoading}
                variant="compact"
                maxUsers={10}
                popoverClassName="z-[60]"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
