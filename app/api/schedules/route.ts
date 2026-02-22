/**
 * Drop Schedules API
 * 
 * GET /api/schedules - List user's schedules
 * POST /api/schedules - Create a new schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { calculateNextRun, VALIDATION, isValidTimezone } from "@/lib/utils/schedule-helpers";
import {
  buildAssetStreamMap,
  groupAssetsByStream,
  buildDropBlocks,
} from "@/lib/utils/drop-content";

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
    
    // Validate date_range_mode
    if (date_range_mode && !['last_n_days', 'since_last'].includes(date_range_mode)) {
      return NextResponse.json({ error: "Invalid date_range_mode value" }, { status: 400 });
    }
    
    // Validate timezone
    if (timezone && !isValidTimezone(timezone)) {
      return NextResponse.json({ error: "Invalid timezone value" }, { status: 400 });
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

        // Build stream associations and group assets — uses shared utility
        const { assetStreamMap, streamNames } = await buildAssetStreamMap(adminClient, filteredAssetIds);
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

        if (blocks.length > 0) {
          const { error: blocksError } = await adminClient.from("drop_blocks").insert(blocks);
          
          if (blocksError) {
            console.error("Error adding blocks to drop:", blocksError);
            // Delete the drop to avoid inconsistent state
            await adminClient.from("drops").delete().eq("id", drop.id);
            return NextResponse.json(
              { error: "Failed to create drop content blocks" },
              { status: 500 }
            );
          }
        }
        
        postCount = filteredAssetIds.length;
        
        // Update last_run_at and recalculate next_run_at on the schedule
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
        
        const { error: scheduleUpdateError } = await adminClient
          .from("drop_schedules")
          .update({ 
            last_run_at: newLastRunAt.toISOString(),
            next_run_at: newNextRunAt.toISOString(),
          })
          .eq("id", schedule.id);
        
        if (scheduleUpdateError) {
          console.error("Error updating schedule timing:", scheduleUpdateError);
          return NextResponse.json(
            { error: "Failed to update schedule timing after generation" },
            { status: 500 }
          );
        }
        
        // Return response with updated schedule timestamps
        return NextResponse.json({
          schedule: {
            ...schedule,
            last_run_at: newLastRunAt.toISOString(),
            next_run_at: newNextRunAt.toISOString(),
          },
          drop: firstDrop,
          post_count: postCount,
        }, { status: 201 });
      }
    }
    
    // No generation happened - return original schedule
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

