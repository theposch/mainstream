/**
 * Drop Schedules API
 * 
 * GET /api/schedules - List user's schedules
 * POST /api/schedules - Create a new schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { calculateNextRun, VALIDATION } from "@/lib/utils/schedule-helpers";

/**
 * GET /api/schedules
 * List all schedules for the current user
 */
export async function GET(_request: NextRequest) {
  // Use getCurrentUser for authentication (consistent with other endpoints)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Use admin client to bypass RLS
  const supabase = await createAdminClient();
  
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
    if (name.trim().length > VALIDATION.NAME_MAX_LENGTH) {
      return NextResponse.json({ error: `Name must be ${VALIDATION.NAME_MAX_LENGTH} characters or less` }, { status: 400 });
    }
    if (!frequency || !['weekly', 'biweekly', 'monthly', 'custom'].includes(frequency)) {
      return NextResponse.json({ error: "Valid frequency is required" }, { status: 400 });
    }
    
    // Validate date range days
    const validatedDateRangeDays = Math.min(
      Math.max(date_range_days || 7, VALIDATION.DATE_RANGE_DAYS_MIN),
      VALIDATION.DATE_RANGE_DAYS_MAX
    );
    
    // Validate custom interval
    const validatedCustomInterval = frequency === 'custom' 
      ? Math.min(
          Math.max(custom_interval_days || 7, VALIDATION.CUSTOM_INTERVAL_MIN),
          VALIDATION.CUSTOM_INTERVAL_MAX
        )
      : null;
    
    // Calculate next run time
    const nextRunAt = calculateNextRun(
      frequency,
      day_of_week,
      day_of_month,
      validatedCustomInterval ?? undefined,
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
        day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? day_of_week : null,
        day_of_month: frequency === 'monthly' ? day_of_month : null,
        custom_interval_days: validatedCustomInterval,
        generation_time,
        timezone,
        stream_ids,
        user_ids,
        date_range_mode,
        date_range_days: validatedDateRangeDays,
        status: "active",
        next_run_at: nextRunAt.toISOString(),
      })
      .select()
      .single();
    
    if (createError || !schedule) {
      console.error("Error creating schedule:", createError);
      return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
    }
    
    // If generate_now is true, create the first draft immediately with content
    let firstDrop = null;
    let postCount = 0;
    
    if (generate_now) {
      // Calculate date range
      const dateEnd = new Date();
      let dateStart: Date;
      
      if (date_range_mode === 'last_n_days') {
        dateStart = new Date(dateEnd.getTime() - validatedDateRangeDays * 24 * 60 * 60 * 1000);
      } else {
        dateStart = new Date(dateEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      const date_range_start = dateStart.toISOString();
      const date_range_end = dateEnd.toISOString();
      const filter_stream_ids = stream_ids.length > 0 ? stream_ids : null;
      const filter_user_ids = user_ids.length > 0 ? user_ids : null;
      
      // Create the drop
      const { data: drop, error: dropError } = await adminClient
        .from("drops")
        .insert({
          title: name.trim(),
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
      
      if (dropError) {
        console.error("Error creating first drop:", dropError);
        // Don't fail the whole request, schedule was created
      } else {
        firstDrop = drop;
        
        // Query assets and create blocks (same logic as generate endpoint)
        let assetsQuery = adminClient
          .from("assets")
          .select("id")
          .gte("created_at", date_range_start)
          .lte("created_at", date_range_end)
          .order("created_at", { ascending: false });

        if (filter_user_ids?.length) {
          assetsQuery = assetsQuery.in("uploader_id", filter_user_ids);
        }

        const { data: assets } = await assetsQuery;
        let filteredAssetIds = assets?.map((a) => a.id) || [];
        
        if (filter_stream_ids?.length && filteredAssetIds.length > 0) {
          const { data: streamAssets } = await adminClient
            .from("asset_streams")
            .select("asset_id")
            .in("stream_id", filter_stream_ids)
            .in("asset_id", filteredAssetIds);
          
          filteredAssetIds = [...new Set(streamAssets?.map((sa) => sa.asset_id) || [])];
        }

        // Get stream associations for grouping
        const assetStreamMap: Record<string, { streamId: string; streamName: string }[]> = {};
        const streamNames: Record<string, string> = {};
        
        if (filteredAssetIds.length > 0) {
          const { data: assetStreams } = await adminClient
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
        
        filteredAssetIds.forEach((assetId) => {
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
          await adminClient.from("drop_blocks").insert(blocks);
        }
        
        postCount = filteredAssetIds.length;
        
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
      post_count: postCount,
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error in POST /api/schedules:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

