/**
 * Generate Drop Now API
 * 
 * POST /api/schedules/[id]/generate - Generate a draft drop immediately
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/schedules/[id]/generate
 * Generate a draft drop immediately (early trigger / "Generate Now" button)
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
  
  // Fetch the schedule
  const { data: schedule, error: fetchError } = await supabase
    .from("drop_schedules")
    .select("*")
    .eq("id", id)
    .single();
  
  if (fetchError || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  
  // Verify ownership
  if (schedule.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Calculate date range
  const dateEnd = new Date();
  let dateStart: Date;
  
  if (schedule.date_range_mode === 'last_n_days') {
    dateStart = new Date(dateEnd.getTime() - (schedule.date_range_days || 7) * 24 * 60 * 60 * 1000);
  } else {
    // 'since_last' mode: from last run, or 7 days if never run
    if (schedule.last_run_at) {
      dateStart = new Date(schedule.last_run_at);
    } else {
      dateStart = new Date(dateEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
  
  // Mark existing drafts for this schedule as superseded
  const { error: supersedError } = await supabase
    .from("drops")
    .update({ is_superseded: true })
    .eq("schedule_id", id)
    .eq("status", "draft")
    .eq("is_superseded", false);
  
  if (supersedError) {
    console.error("Error superseding old drafts:", supersedError);
    // Continue anyway, not critical
  }
  
  // Create new draft drop
  const { data: drop, error: createError } = await supabase
    .from("drops")
    .insert({
      title: schedule.name,
      schedule_id: schedule.id,
      created_by: user.id,
      status: "draft",
      use_blocks: true,
      date_range_start: dateStart.toISOString(),
      date_range_end: dateEnd.toISOString(),
      filter_stream_ids: schedule.stream_ids?.length > 0 ? schedule.stream_ids : null,
      filter_user_ids: schedule.user_ids?.length > 0 ? schedule.user_ids : null,
    })
    .select()
    .single();
  
  if (createError) {
    console.error("Error creating drop:", createError);
    return NextResponse.json({ error: "Failed to create drop" }, { status: 500 });
  }
  
  // Create notification
  await supabase
    .from("notifications")
    .insert({
      type: "scheduled_drop_ready",
      recipient_id: user.id,
      actor_id: user.id,
      resource_type: "drop",
      resource_id: drop.id,
      content: `Your ${schedule.name} is ready to review`,
    });
  
  // Update last_run_at (but keep next_run_at unchanged for manual triggers)
  await supabase
    .from("drop_schedules")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", id);
  
  return NextResponse.json({
    drop,
    schedule,
  }, { status: 201 });
}

