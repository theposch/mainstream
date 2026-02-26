/**
 * Generate Drop Now API
 * 
 * POST /api/schedules/[id]/generate - Generate a draft drop immediately
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { calculateNextRun } from "@/lib/utils/schedule-helpers";
import {
  buildAssetStreamMap,
  groupAssetsByStream,
  buildDropBlocks,
} from "@/lib/utils/drop-content";

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
  
  const date_range_start = dateStart.toISOString();
  const date_range_end = dateEnd.toISOString();
  const filter_stream_ids = schedule.stream_ids?.length > 0 ? schedule.stream_ids : null;
  const filter_user_ids = schedule.user_ids?.length > 0 ? schedule.user_ids : null;
  
  // Delete existing draft for this schedule (only 1 auto-generated draft per series)
  // The drop_blocks will be cascade deleted due to foreign key
  const { error: deleteError } = await supabase
    .from("drops")
    .delete()
    .eq("schedule_id", id)
    .eq("status", "draft");
  
  if (deleteError) {
    console.error("Error deleting old draft:", deleteError);
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
      date_range_start,
      date_range_end,
      filter_stream_ids,
      filter_user_ids,
    })
    .select()
    .single();
  
  if (createError || !drop) {
    console.error("Error creating drop:", createError);
    return NextResponse.json({ error: "Failed to create drop" }, { status: 500 });
  }
  
  // ============================================
  // Query assets and create blocks (same as POST /api/drops)
  // ============================================
  
  // Query assets matching the criteria
  let assetsQuery = supabase
    .from("assets")
    .select("id")
    .gte("created_at", date_range_start)
    .lte("created_at", date_range_end)
    .order("created_at", { ascending: false });

  // Filter by uploaders if specified
  if (filter_user_ids?.length) {
    assetsQuery = assetsQuery.in("uploader_id", filter_user_ids);
  }

  const { data: assets } = await assetsQuery;

  // If stream filters are specified, further filter by streams
  let filteredAssetIds = assets?.map((a) => a.id) || [];
  
  if (filter_stream_ids?.length && filteredAssetIds.length > 0) {
    const { data: streamAssets } = await supabase
      .from("asset_streams")
      .select("asset_id")
      .in("stream_id", filter_stream_ids)
      .in("asset_id", filteredAssetIds);
    
    filteredAssetIds = [...new Set(streamAssets?.map((sa) => sa.asset_id) || [])];
  }

  // Build stream associations and group assets — uses shared utility
  const { assetStreamMap, streamNames } = await buildAssetStreamMap(supabase, filteredAssetIds);
  const { assetsByStream, uncategorized } = groupAssetsByStream(
    filteredAssetIds,
    assetStreamMap,
    filter_stream_ids,
  );
  const blocks = buildDropBlocks(
    drop.id,
    assetsByStream,
    uncategorized,
    streamNames,
    filter_stream_ids,
  );

  // Insert all blocks
  if (blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("drop_blocks")
      .insert(blocks);

    if (blocksError) {
      console.error("Error adding blocks to drop:", blocksError);
      // Delete the drop to avoid inconsistent state
      await supabase.from("drops").delete().eq("id", drop.id);
      return NextResponse.json(
        { error: "Failed to create drop content blocks" },
        { status: 500 }
      );
    }
  }
  
  // ============================================
  // Create notification and update schedule
  // ============================================
  
  // Create notification
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      type: "scheduled_drop_ready",
      recipient_id: user.id,
      actor_id: user.id,
      resource_type: "drop",
      resource_id: drop.id,
      content: `Your ${schedule.name} is ready to review`,
    });
  
  if (notificationError) {
    console.warn('[POST /api/schedules/[id]/generate] Failed to create notification:', notificationError);
    // Continue anyway - drop was created successfully
  }
  
  // Update last_run_at and recalculate next_run_at
  // Pass the EXISTING last_run_at (before we update it) for biweekly spacing calculation
  // This ensures consistent behavior with the cron endpoint
  const newLastRunAt = new Date();
  const newNextRunAt = calculateNextRun(
    schedule.frequency,
    schedule.day_of_week,
    schedule.day_of_month,
    schedule.custom_interval_days,
    schedule.generation_time,
    schedule.timezone,
    schedule.last_run_at ? new Date(schedule.last_run_at) : undefined
  );
  
  const { error: scheduleUpdateError } = await supabase
    .from("drop_schedules")
    .update({ 
      last_run_at: newLastRunAt.toISOString(),
      next_run_at: newNextRunAt.toISOString(),
    })
    .eq("id", id);
  
  if (scheduleUpdateError) {
    // This is serious - schedule won't advance to next run correctly
    console.error('[POST /api/schedules/[id]/generate] Failed to update schedule:', scheduleUpdateError);
    // Don't fail the request since the drop was created successfully
    // but log the error for monitoring
  }
  
  // Return updated schedule with fresh timestamps
  return NextResponse.json({
    drop,
    schedule: {
      ...schedule,
      last_run_at: newLastRunAt.toISOString(),
      next_run_at: newNextRunAt.toISOString(),
    },
    post_count: filteredAssetIds.length,
  }, { status: 201 });
}

