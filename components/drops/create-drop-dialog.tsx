"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

interface CreateDropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get default date range (last 7 days)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

// Format date for display
function formatDateForTitle(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CreateDropDialog({ open, onOpenChange }: CreateDropDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const defaultDates = React.useMemo(() => getDefaultDateRange(), []);
  
  const [title, setTitle] = React.useState(`Weekly Drop · ${formatDateForTitle(defaultDates.end)}`);
  const [dateStart, setDateStart] = React.useState(defaultDates.start);
  const [dateEnd, setDateEnd] = React.useState(defaultDates.end);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      const dates = getDefaultDateRange();
      setTitle(`Weekly Drop · ${formatDateForTitle(dates.end)}`);
      setDateStart(dates.start);
      setDateEnd(dates.end);
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

    if (new Date(dateStart) > new Date(dateEnd)) {
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
          date_range_start: new Date(dateStart).toISOString(),
          date_range_end: new Date(dateEnd + "T23:59:59").toISOString(),
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
            <Label className="text-zinc-400">Include posts</Label>
            
            {/* Date range */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Calendar className="h-4 w-4" />
                <span>Created between...</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <span className="text-zinc-500">→</span>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Stream filter (placeholder - can be expanded) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Hash className="h-4 w-4" />
                <span>Posted in...</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-zinc-400 font-normal"
                disabled={isLoading}
              >
                All streams
              </Button>
            </div>

            {/* User filter (placeholder - can be expanded) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>Posted by...</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-zinc-400 font-normal"
                disabled={isLoading}
              >
                All teammates
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
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

