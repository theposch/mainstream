/**
 * Resume Schedule API
 * 
 * POST /api/schedules/[id]/resume - Resume a paused schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ScheduleFrequency } from "@/lib/types/database";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Helper to calculate next run time
function calculateNextRun(
  frequency: ScheduleFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  customIntervalDays: number | undefined,
  generationTime: string,
  timezone: string
): Date {
  const now = new Date();
  const [hours, minutes] = generationTime.split(':').map(Number);
  let nextRun = new Date(now);
  
  switch (frequency) {
    case 'weekly': {
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1;
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(now.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
    }
    case 'biweekly': {
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1;
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(now.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 14);
      }
      break;
    }
    case 'monthly': {
      const targetDay = Math.min(dayOfMonth ?? 1, 28);
      nextRun.setDate(targetDay);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
    }
    case 'custom': {
      const days = customIntervalDays ?? 7;
      nextRun.setDate(now.getDate() + days);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
    }
  }
  
  return nextRun;
}

/**
 * POST /api/schedules/[id]/resume
 * Resume a paused schedule (set status to 'active', calculate next_run_at)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  // Use getCurrentUser for authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Use admin client to bypass RLS
  const supabase = await createAdminClient();
  
  // Fetch existing schedule
  const { data: existingSchedule, error: fetchError } = await supabase
    .from("drop_schedules")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError || !existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  
  // Verify ownership
  if (existingSchedule.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Check if already active
  if (existingSchedule.status === 'active') {
    return NextResponse.json({ error: "Schedule is already active" }, { status: 400 });
  }
  
  // Calculate next run time
  const nextRunAt = calculateNextRun(
    existingSchedule.frequency,
    existingSchedule.day_of_week,
    existingSchedule.day_of_month,
    existingSchedule.custom_interval_days,
    existingSchedule.generation_time,
    existingSchedule.timezone
  );
  
  // Resume the schedule
  const { data: schedule, error: updateError } = await supabase
    .from("drop_schedules")
    .update({
      status: 'active',
      next_run_at: nextRunAt.toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  
  if (updateError) {
    console.error("Error resuming schedule:", updateError);
    return NextResponse.json({ error: "Failed to resume schedule" }, { status: 500 });
  }
  
  return NextResponse.json(schedule);
}

