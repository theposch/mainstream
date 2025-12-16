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
  
  if (createError) {
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

  // Get stream associations for filtered assets to group them
  const assetStreamMap: Record<string, { streamId: string; streamName: string }[]> = {};
  const streamNames: Record<string, string> = {};
  
  if (filteredAssetIds.length > 0) {
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`
        asset_id,
        stream:streams(id, name)
      `)
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
  
  filteredAssetIds.forEach((assetId) => {
    const streams = assetStreamMap[assetId];
    if (streams && streams.length > 0) {
      let groupingStream;
      
      if (filter_stream_ids?.length) {
        // Find first filtered stream this asset belongs to (in filter order)
        for (const filteredId of filter_stream_ids) {
          const match = streams.find(s => s.streamId === filteredId);
          if (match) {
            groupingStream = match;
            break;
          }
        }
      }
      
      // Fall back to primary stream if no filter or no match found
      if (!groupingStream) {
        groupingStream = streams[0];
      }
      
      if (!assetsByStream[groupingStream.streamId]) {
        assetsByStream[groupingStream.streamId] = [];
      }
      assetsByStream[groupingStream.streamId].push(assetId);
    } else {
      uncategorized.push(assetId);
    }
  });

  // Create blocks: heading for each stream, then posts under it
  const blocks: Array<{
    drop_id: string;
    type: string;
    content?: string;
    heading_level?: number;
    asset_id?: string;
    position: number;
  }> = [];
  
  let position = 0;

  // Add blocks for each stream group
  const streamOrder = filter_stream_ids?.length 
    ? filter_stream_ids.filter((streamId: string) => assetsByStream[streamId])
    : Object.keys(assetsByStream);
  
  // Add any streams not in filter
  for (const streamId of Object.keys(assetsByStream)) {
    if (!streamOrder.includes(streamId)) {
      streamOrder.push(streamId);
    }
  }
  
  for (const streamId of streamOrder) {
    const assetIds = assetsByStream[streamId];
    if (!assetIds || assetIds.length === 0) continue;
    
    // Add heading for the stream
    blocks.push({
      drop_id: drop.id,
      type: "heading",
      content: streamNames[streamId],
      heading_level: 2,
      position: position++,
    });

    // Add post blocks for assets in this stream
    for (const assetId of assetIds) {
      blocks.push({
        drop_id: drop.id,
        type: "post",
        asset_id: assetId,
        position: position++,
      });
    }
  }

  // Add uncategorized assets at the end
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
  
  // Update last_run_at (but keep next_run_at unchanged for manual triggers)
  await supabase
    .from("drop_schedules")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", id);
  
  return NextResponse.json({
    drop,
    schedule,
    post_count: filteredAssetIds.length,
  }, { status: 201 });
}

