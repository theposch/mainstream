/**
 * Pause Schedule API
 * 
 * POST /api/schedules/[id]/pause - Pause a schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/schedules/[id]/pause
 * Pause a schedule (set status to 'paused', clear next_run_at)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Fetch existing schedule
  const { data: existingSchedule, error: fetchError } = await supabase
    .from("drop_schedules")
    .select("created_by, status")
    .eq("id", id)
    .single();
  
  if (fetchError || !existingSchedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  
  // Verify ownership
  if (existingSchedule.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Check if already paused
  if (existingSchedule.status === 'paused') {
    return NextResponse.json({ error: "Schedule is already paused" }, { status: 400 });
  }
  
  // Pause the schedule
  const { data: schedule, error: updateError } = await supabase
    .from("drop_schedules")
    .update({
      status: 'paused',
      next_run_at: null,
    })
    .eq("id", id)
    .select()
    .single();
  
  if (updateError) {
    console.error("Error pausing schedule:", updateError);
    return NextResponse.json({ error: "Failed to pause schedule" }, { status: 500 });
  }
  
  return NextResponse.json(schedule);
}

