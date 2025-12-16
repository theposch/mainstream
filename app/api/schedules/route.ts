/**
 * Drop Schedules API
 * 
 * GET /api/schedules - List user's schedules
 * POST /api/schedules - Create a new schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ScheduleFrequency } from "@/lib/types/database";

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
  
  // Parse generation time (HH:MM:SS or HH:MM)
  const [hours, minutes] = generationTime.split(':').map(Number);
  
  let nextRun = new Date(now);
  
  switch (frequency) {
    case 'weekly': {
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(now.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      // If it's the same day but time has passed, move to next week
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
      const targetDay = Math.min(dayOfMonth ?? 1, 28); // Cap at 28 for safety
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
 * GET /api/schedules
 * List all schedules for the current user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Fetch user's schedules
  const { data: schedules, error } = await supabase
    .from("drop_schedules")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
  
  return NextResponse.json(schedules);
}

/**
 * POST /api/schedules
 * Create a new schedule
 */
export async function POST(request: NextRequest) {
  // Use getCurrentUser for authentication (consistent with other APIs)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    const {
      name,
      frequency,
      day_of_week,
      day_of_month,
      custom_interval_days,
      generation_time = "09:00:00",
      timezone = "America/New_York",
      stream_ids = [],
      user_ids = [],
      date_range_mode = "last_n_days",
      date_range_days = 7,
      generate_now = false, // Option to generate first draft immediately
    } = body;
    
    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!frequency || !['weekly', 'biweekly', 'monthly', 'custom'].includes(frequency)) {
      return NextResponse.json({ error: "Valid frequency is required" }, { status: 400 });
    }
    
    // Calculate next run time
    const nextRunAt = calculateNextRun(
      frequency,
      day_of_week,
      day_of_month,
      custom_interval_days,
      generation_time,
      timezone
    );
    
    // Use admin client to bypass RLS for server-side insert
    const adminClient = await createAdminClient();
    
    // Create the schedule
    const { data: schedule, error: createError } = await adminClient
      .from("drop_schedules")
      .insert({
        created_by: user.id,
        name: name.trim(),
        frequency,
        day_of_week,
        day_of_month,
        custom_interval_days,
        generation_time,
        timezone,
        stream_ids,
        user_ids,
        date_range_mode,
        date_range_days,
        status: "active",
        next_run_at: nextRunAt.toISOString(),
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating schedule:", createError);
      return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
    }
    
    // If generate_now is true, create the first draft immediately
    let firstDrop = null;
    if (generate_now) {
      // Calculate date range
      const dateEnd = new Date();
      let dateStart: Date;
      
      if (date_range_mode === 'last_n_days') {
        dateStart = new Date(dateEnd.getTime() - (date_range_days || 7) * 24 * 60 * 60 * 1000);
      } else {
        dateStart = new Date(dateEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      // Create the drop
      const { data: drop, error: dropError } = await adminClient
        .from("drops")
        .insert({
          title: name.trim(),
          schedule_id: schedule.id,
          created_by: user.id,
          status: "draft",
          use_blocks: true,
          date_range_start: dateStart.toISOString(),
          date_range_end: dateEnd.toISOString(),
          filter_stream_ids: stream_ids.length > 0 ? stream_ids : null,
          filter_user_ids: user_ids.length > 0 ? user_ids : null,
        })
        .select()
        .single();
      
      if (dropError) {
        console.error("Error creating first drop:", dropError);
        // Don't fail the whole request, schedule was created
      } else {
        firstDrop = drop;
        
        // Update last_run_at on the schedule
        await adminClient
          .from("drop_schedules")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", schedule.id);
      }
    }
    
    return NextResponse.json({
      schedule,
      drop: firstDrop,
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error in POST /api/schedules:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

