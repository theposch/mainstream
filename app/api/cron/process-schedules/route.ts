/**
 * Process Scheduled Drops - Internal Cron Endpoint
 * 
 * POST /api/cron/process-schedules
 * 
 * This endpoint processes all due schedules and generates draft drops with content.
 * It should be called by:
 * - pg_cron via pg_net (self-hosted)
 * - External cron service (Vercel cron, GitHub Actions, etc.)
 * 
 * Security: Always requires CRON_SECRET header - endpoint is disabled if not configured
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { calculateNextRun } from "@/lib/utils/schedule-helpers";
import type { DropSchedule } from "@/lib/types/database";

// Only POST - GET should not trigger side effects (REST best practice)
export async function POST(request: NextRequest) {
  // Always require CRON_SECRET - endpoint is disabled if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[POST /api/cron/process-schedules] CRON_SECRET not configured - endpoint disabled");
    return NextResponse.json({ error: "Endpoint not configured" }, { status: 503 });
  }
  
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const supabase = await createAdminClient();
  const processedSchedules: string[] = [];
  const errors: string[] = [];
  
  try {
    // Find all active schedules that are due
    const now = new Date().toISOString();
    const { data: dueSchedules, error: fetchError } = await supabase
      .from("drop_schedules")
      .select("*")
      .eq("status", "active")
      .not("next_run_at", "is", null)
      .lte("next_run_at", now);
    
    if (fetchError) {
      console.error("Error fetching due schedules:", fetchError);
      return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
    }
    
    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({ 
        message: "No schedules due", 
        processed: 0 
      });
    }
    
    // Process each due schedule
    for (const schedule of dueSchedules) {
      try {
        await processSchedule(supabase, schedule);
        processedSchedules.push(schedule.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${schedule.name}: ${errorMsg}`);
        console.error(`Error processing schedule ${schedule.id}:`, err);
      }
    }
    
    return NextResponse.json({
      message: "Schedules processed",
      processed: processedSchedules.length,
      processedIds: processedSchedules,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error("Error in process-schedules:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function processSchedule(supabase: SupabaseClient, schedule: DropSchedule) {
  // Race condition protection: Immediately claim this schedule by setting next_run_at to null
  // This prevents other cron instances from processing it simultaneously
  const { error: claimError, data: claimResult } = await supabase
    .from("drop_schedules")
    .update({ next_run_at: null })
    .eq("id", schedule.id)
    .eq("next_run_at", schedule.next_run_at) // Only update if next_run_at hasn't changed
    .select("id")
    .single();
  
  if (claimError || !claimResult) {
    // Another instance already claimed this schedule, skip it
    console.log(`[processSchedule] Schedule ${schedule.id} already claimed by another instance, skipping`);
    return;
  }
  
  // Calculate date range for content
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
  
  // Delete existing draft for this schedule (only 1 draft per series)
  // The drop_blocks will be cascade deleted due to foreign key
  const { error: deleteError } = await supabase
    .from("drops")
    .delete()
    .eq("schedule_id", schedule.id)
    .eq("status", "draft");
  
  if (deleteError) {
    console.warn('[processSchedule] Error deleting old draft:', deleteError);
    // Continue anyway, not critical - we can still create the new draft
  }
  
  // Create new draft drop
  const { data: drop, error: createError } = await supabase
    .from("drops")
    .insert({
      title: schedule.name,
      schedule_id: schedule.id,
      created_by: schedule.created_by,
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
    throw new Error(`Failed to create drop: ${createError?.message || 'No data returned'}`);
  }
  
  // ============================================
  // Query assets and create blocks
  // ============================================
  
  let assetsQuery = supabase
    .from("assets")
    .select("id")
    .gte("created_at", date_range_start)
    .lte("created_at", date_range_end)
    .order("created_at", { ascending: false });

  if (filter_user_ids?.length) {
    assetsQuery = assetsQuery.in("uploader_id", filter_user_ids);
  }

  const { data: assets } = await assetsQuery;
  let filteredAssetIds = assets?.map((a: { id: string }) => a.id) || [];
  
  if (filter_stream_ids?.length && filteredAssetIds.length > 0) {
    const { data: streamAssets } = await supabase
      .from("asset_streams")
      .select("asset_id")
      .in("stream_id", filter_stream_ids)
      .in("asset_id", filteredAssetIds);
    
    filteredAssetIds = [...new Set(streamAssets?.map((sa: { asset_id: string }) => sa.asset_id) || [])];
  }

  // Get stream associations for grouping
  const assetStreamMap: Record<string, { streamId: string; streamName: string }[]> = {};
  const streamNames: Record<string, string> = {};
  
  if (filteredAssetIds.length > 0) {
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`asset_id, stream:streams(id, name)`)
      .in("asset_id", filteredAssetIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join type inference issue
    assetStreams?.forEach((as: any) => {
      if (!assetStreamMap[as.asset_id]) {
        assetStreamMap[as.asset_id] = [];
      }
      if (as.stream) {
        assetStreamMap[as.asset_id].push({
          streamId: as.stream.id,
          streamName: as.stream.name,
        });
        streamNames[as.stream.id] = as.stream.name;
      }
    });
  }

  // Group assets by stream
  const assetsByStream: Record<string, string[]> = {};
  const uncategorized: string[] = [];
  
  filteredAssetIds.forEach((assetId: string) => {
    const streams = assetStreamMap[assetId];
    if (streams && streams.length > 0) {
      let groupingStream = streams[0];
      if (filter_stream_ids?.length) {
        for (const filteredId of filter_stream_ids) {
          const match = streams.find(s => s.streamId === filteredId);
          if (match) {
            groupingStream = match;
            break;
          }
        }
      }
      if (!assetsByStream[groupingStream.streamId]) {
        assetsByStream[groupingStream.streamId] = [];
      }
      assetsByStream[groupingStream.streamId].push(assetId);
    } else {
      uncategorized.push(assetId);
    }
  });

  // Create blocks
  const blocks: Array<{
    drop_id: string;
    type: string;
    content?: string;
    heading_level?: number;
    asset_id?: string;
    position: number;
  }> = [];
  
  let position = 0;
  const streamOrder = filter_stream_ids?.length 
    ? filter_stream_ids.filter((id: string) => assetsByStream[id])
    : Object.keys(assetsByStream);
  
  for (const streamId of Object.keys(assetsByStream)) {
    if (!streamOrder.includes(streamId)) {
      streamOrder.push(streamId);
    }
  }
  
  for (const streamId of streamOrder) {
    const assetIds = assetsByStream[streamId];
    if (!assetIds || assetIds.length === 0) continue;
    
    blocks.push({
      drop_id: drop.id,
      type: "heading",
      content: streamNames[streamId],
      heading_level: 2,
      position: position++,
    });

    for (const assetId of assetIds) {
      blocks.push({
        drop_id: drop.id,
        type: "post",
        asset_id: assetId,
        position: position++,
      });
    }
  }

  if (uncategorized.length > 0) {
    blocks.push({
      drop_id: drop.id,
      type: "heading",
      content: "Other",
      heading_level: 2,
      position: position++,
    });

    for (const assetId of uncategorized) {
      blocks.push({
        drop_id: drop.id,
        type: "post",
        asset_id: assetId,
        position: position++,
      });
    }
  }

  if (blocks.length > 0) {
    const { error: blocksError } = await supabase
      .from("drop_blocks")
      .insert(blocks);

    if (blocksError) {
      // Delete the drop to avoid inconsistent state
      await supabase.from("drops").delete().eq("id", drop.id);
      throw new Error(`Failed to create blocks: ${blocksError.message}`);
    }
  }
  
  // Create notification
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      type: "scheduled_drop_ready",
      recipient_id: schedule.created_by,
      actor_id: schedule.created_by,
      resource_type: "drop",
      resource_id: drop.id,
      content: `Your ${schedule.name} is ready to review`,
    });
  
  if (notificationError) {
    console.warn('[processSchedule] Failed to create notification:', notificationError);
    // Continue anyway - drop was created successfully
  }
  
  // Update schedule: last_run_at and calculate next_run_at
  // Pass lastRunAt for biweekly tracking to ensure correct 2-week spacing
  const nextRunAt = calculateNextRun(
    schedule.frequency,
    schedule.day_of_week,
    schedule.day_of_month,
    schedule.custom_interval_days,
    schedule.generation_time,
    schedule.timezone,
    schedule.last_run_at ? new Date(schedule.last_run_at) : undefined
  );
  
  const { error: updateError } = await supabase
    .from("drop_schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt.toISOString(),
    })
    .eq("id", schedule.id);
  
  if (updateError) {
    // This is more serious - schedule won't advance to next run
    console.error('[processSchedule] Failed to update schedule:', updateError);
    throw new Error(`Failed to update schedule: ${updateError.message}`);
  }
}

