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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Hash, Users, Clock, Calendar } from "lucide-react";
import { StreamPicker } from "@/components/streams/stream-picker";
import { UserPicker } from "@/components/users/user-picker";
import type { ScheduleFrequency, DateRangeMode } from "@/lib/types/database";

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scheduleId: string, dropId?: string) => void;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const FREQUENCIES: { value: ScheduleFrequency; label: string; description: string }[] = [
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "biweekly", label: "Biweekly", description: "Every two weeks" },
  { value: "monthly", label: "Monthly", description: "Once a month" },
  { value: "custom", label: "Custom", description: "Custom interval" },
];

export function CreateSeriesDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSeriesDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("Weekly Design Update");
  const [frequency, setFrequency] = React.useState<ScheduleFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = React.useState("1"); // Monday
  const [dayOfMonth, setDayOfMonth] = React.useState("1");
  const [customIntervalDays, setCustomIntervalDays] = React.useState("7");
  const [generationTime, setGenerationTime] = React.useState("09:00");
  const [timezone] = React.useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [dateRangeMode, setDateRangeMode] = React.useState<DateRangeMode>("last_n_days");
  const [dateRangeDays, setDateRangeDays] = React.useState("7");
  const [selectedStreamIds, setSelectedStreamIds] = React.useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [generateNow, setGenerateNow] = React.useState(true);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName("Weekly Design Update");
      setFrequency("weekly");
      setDayOfWeek("1");
      setDayOfMonth("1");
      setCustomIntervalDays("7");
      setGenerationTime("09:00");
      setDateRangeMode("last_n_days");
      setDateRangeDays("7");
      setSelectedStreamIds([]);
      setSelectedUserIds([]);
      setGenerateNow(true);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          frequency,
          day_of_week: frequency === "weekly" || frequency === "biweekly" ? parseInt(dayOfWeek) : null,
          day_of_month: frequency === "monthly" ? parseInt(dayOfMonth) : null,
          custom_interval_days: frequency === "custom" ? parseInt(customIntervalDays) : null,
          generation_time: `${generationTime}:00`,
          timezone,
          stream_ids: selectedStreamIds,
          user_ids: selectedUserIds,
          date_range_mode: dateRangeMode,
          date_range_days: parseInt(dateRangeDays),
          generate_now: generateNow,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create series");
      }

      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess(data.schedule.id, data.drop?.id);
      }
      
      // Navigate to the series tab or the new drop editor
      if (data.drop) {
        router.push(`/drops/${data.drop.id}/edit`);
      } else {
        router.push(`/drops?tab=${data.schedule.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create series");
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyDescription = () => {
    switch (frequency) {
      case "weekly":
        return `Every ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} at ${generationTime}`;
      case "biweekly":
        return `Every other ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} at ${generationTime}`;
      case "monthly":
        return `On the ${dayOfMonth}${getOrdinalSuffix(parseInt(dayOfMonth))} of each month at ${generationTime}`;
      case "custom":
        return `Every ${customIntervalDays} days at ${generationTime}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Series</DialogTitle>
          <DialogDescription>
            Series are recurring drops that automatically generate drafts on a schedule.
            You&apos;ll be notified when each one is ready to review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Series Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly Design Update"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This becomes the tab title and default drop title
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-4">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="frequency" className="text-xs">Frequency</Label>
                <Select value={frequency} onValueChange={(v: string) => setFrequency(v as ScheduleFrequency)}>
                  <SelectTrigger id="frequency" disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day selector based on frequency */}
              {(frequency === "weekly" || frequency === "biweekly") && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek" className="text-xs">Day</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="dayOfWeek" disabled={isLoading}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === "monthly" && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth" className="text-xs">Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger id="dayOfMonth" disabled={isLoading}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_MONTH.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customInterval" className="text-xs">Days</Label>
                  <Input
                    id="customInterval"
                    type="number"
                    min="1"
                    max="365"
                    value={customIntervalDays}
                    onChange={(e) => setCustomIntervalDays(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time" className="text-xs">Time</Label>
              <Input
                id="time"
                type="time"
                value={generationTime}
                onChange={(e) => setGenerationTime(e.target.value)}
                disabled={isLoading}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                {timezone}
              </p>
            </div>

            {/* Schedule summary */}
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                {getFrequencyDescription()}
              </p>
            </div>
          </div>

          {/* Content Filters */}
          <div className="space-y-4">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Include posts
            </Label>

            {/* Date range mode */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Select value={dateRangeMode} onValueChange={(v: string) => setDateRangeMode(v as DateRangeMode)}>
                  <SelectTrigger className="w-[180px]" disabled={isLoading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_n_days">Last N days</SelectItem>
                    <SelectItem value="since_last">Since last drop</SelectItem>
                  </SelectContent>
                </Select>

                {dateRangeMode === "last_n_days" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={dateRangeDays}
                      onChange={(e) => setDateRangeDays(e.target.value)}
                      disabled={isLoading}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>
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

          {/* Generate Now Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generateNow"
              checked={generateNow}
              onCheckedChange={(checked: boolean | "indeterminate") => setGenerateNow(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="generateNow"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Generate first draft now
            </label>
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
                "Create Series"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

