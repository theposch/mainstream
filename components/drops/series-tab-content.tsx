"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DropCard } from "./drop-card";
import { ScheduleCountdownCard } from "./schedule-countdown-card";
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
  const router = useRouter();

  const handleScheduleUpdated = () => {
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Countdown Card as first item */}
      <ScheduleCountdownCard
        schedule={schedule}
        onScheduleUpdated={handleScheduleUpdated}
      />
      
      {/* Drop Cards */}
      {drops.map((drop) => (
        <DropCard
          key={drop.id}
          drop={drop}
          currentUserId={currentUserId}
          onDelete={onDropDeleted}
        />
      ))}
    </div>
  );
}
