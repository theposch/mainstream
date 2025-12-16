"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropsGrid } from "./drops-grid";
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

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SeriesTabContent({
  schedule,
  drops,
  currentUserId,
  onDropDeleted,
}: SeriesTabContentProps) {
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

  return (
    <div className="space-y-6">
      {/* Compact Info Bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Badge variant={schedule.status === "active" ? "default" : "secondary"}>
          {schedule.status === "active" ? "Active" : "Paused"}
        </Badge>
        
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{getScheduleDescription()}</span>
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

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
