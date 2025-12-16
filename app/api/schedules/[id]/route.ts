/**
 * Single Schedule API
 * 
 * GET /api/schedules/[id] - Get schedule details with current draft
 * PATCH /api/schedules/[id] - Update schedule settings
 * DELETE /api/schedules/[id] - Delete schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { calculateNextRun, VALIDATION } from "@/lib/utils/schedule-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/schedules/[id]
 * Get schedule details with current draft info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  // Use getCurrentUser for authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Use admin client to bypass RLS
  const supabase = await createAdminClient();
  
  // Fetch the schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from("drop_schedules")
    .select("*")
    .eq("id", id)
    .single();
  
  if (scheduleError || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  
  // Verify ownership
  if (schedule.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Fetch current draft (if any) for this schedule
  // With simplified logic, there's only ever 1 draft per schedule
  const { data: currentDraft } = await supabase
    .from("drops")
    .select("id, title, status, created_at")
    .eq("schedule_id", id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  // Fetch recent published drops for this schedule
  const { data: recentPublished } = await supabase
    .from("drops")
    .select("id, title, status, published_at, created_at")
    .eq("schedule_id", id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);
  
  return NextResponse.json({
    schedule,
    currentDraft,
    recentPublished: recentPublished || [],
  });
}

/**
 * PATCH /api/schedules/[id]
 * Update schedule settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
  
  try {
    const body = await request.json();
    
    // Build update object with only provided fields
    const updates: Record<string, string | number | string[] | null> = {};
    
    // Validate and set name
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      if (trimmedName.length > VALIDATION.NAME_MAX_LENGTH) {
        return NextResponse.json({ error: `Name must be ${VALIDATION.NAME_MAX_LENGTH} characters or less` }, { status: 400 });
      }
      updates.name = trimmedName;
    }
    
    if (body.frequency !== undefined) updates.frequency = body.frequency;
    if (body.day_of_week !== undefined) updates.day_of_week = body.day_of_week;
    if (body.day_of_month !== undefined) updates.day_of_month = body.day_of_month;
    
    // Validate custom_interval_days
    if (body.custom_interval_days !== undefined) {
      updates.custom_interval_days = Math.min(
        Math.max(body.custom_interval_days, VALIDATION.CUSTOM_INTERVAL_MIN),
        VALIDATION.CUSTOM_INTERVAL_MAX
      );
    }
    
    if (body.generation_time !== undefined) updates.generation_time = body.generation_time;
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.stream_ids !== undefined) updates.stream_ids = body.stream_ids;
    if (body.user_ids !== undefined) updates.user_ids = body.user_ids;
    if (body.date_range_mode !== undefined) updates.date_range_mode = body.date_range_mode;
    
    // Validate date_range_days
    if (body.date_range_days !== undefined) {
      updates.date_range_days = Math.min(
        Math.max(body.date_range_days, VALIDATION.DATE_RANGE_DAYS_MIN),
        VALIDATION.DATE_RANGE_DAYS_MAX
      );
    }
    
    // If schedule timing changed, recalculate next_run_at
    if (existingSchedule.status === 'active' && (
      body.frequency !== undefined ||
      body.day_of_week !== undefined ||
      body.day_of_month !== undefined ||
      body.custom_interval_days !== undefined ||
      body.generation_time !== undefined ||
      body.timezone !== undefined
    )) {
      const newFrequency = body.frequency ?? existingSchedule.frequency;
      const newDayOfWeek = body.day_of_week ?? existingSchedule.day_of_week;
      const newDayOfMonth = body.day_of_month ?? existingSchedule.day_of_month;
      const newCustomInterval = body.custom_interval_days ?? existingSchedule.custom_interval_days;
      const newTime = body.generation_time ?? existingSchedule.generation_time;
      const newTimezone = body.timezone ?? existingSchedule.timezone;
      
      updates.next_run_at = calculateNextRun(
        newFrequency,
        newDayOfWeek,
        newDayOfMonth,
        newCustomInterval,
        newTime,
        newTimezone
      ).toISOString();
    }
    
    // Update the schedule
    const { data: schedule, error: updateError } = await supabase
      .from("drop_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating schedule:", updateError);
      return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
    }
    
    return NextResponse.json(schedule);
    
  } catch (error) {
    console.error("Error in PATCH /api/schedules/[id]:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE /api/schedules/[id]
 * Delete a schedule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    .select("created_by")
    .eq("id", id)
    .single();
  
  if (fetchError || !existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  
  // Verify ownership
  if (existingSchedule.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Delete the schedule (drops will have schedule_id set to NULL due to ON DELETE SET NULL)
  const { error: deleteError } = await supabase
    .from("drop_schedules")
    .delete()
    .eq("id", id);
  
  if (deleteError) {
    console.error("Error deleting schedule:", deleteError);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}

