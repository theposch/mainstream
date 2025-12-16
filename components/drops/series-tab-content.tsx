"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropsGrid } from "./drops-grid";
import { getScheduleDescription } from "@/lib/utils/schedule-helpers";
import type { DropSchedule, Drop, User } from "@/lib/types/database";

interface SeriesTabContentProps {
  schedule: DropSchedule;
  drops: Array<Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
  }>;
  currentUserId?: string;
  onDropDeleted?: (dropId: string) => void;
}

export function SeriesTabContent({
  schedule,
  drops,
  currentUserId,
  onDropDeleted,
}: SeriesTabContentProps) {
  const scheduleDescription = getScheduleDescription(
    schedule.frequency,
    schedule.day_of_week,
    schedule.day_of_month,
    schedule.custom_interval_days,
    schedule.generation_time
  );

  return (
    <div className="space-y-6">
      {/* Compact Info Bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Badge variant={schedule.status === "active" ? "default" : "secondary"}>
          {schedule.status === "active" ? "Active" : "Paused"}
        </Badge>
        
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{scheduleDescription}</span>
        </div>

        {schedule.status === "active" && schedule.next_run_at && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Next: {format(new Date(schedule.next_run_at), "MMM d")}
              <span className="text-muted-foreground/70 ml-1">
                ({formatDistanceToNow(new Date(schedule.next_run_at), { addSuffix: false })})
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Drops Grid - same as other tabs */}
      <DropsGrid
        drops={drops}
        currentUserId={currentUserId}
        onDropDeleted={onDropDeleted}
      />
    </div>
  );
}
