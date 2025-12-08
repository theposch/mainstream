import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

// GET /api/drops - List drops with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'draft' | 'published' | null (all)
    const tab = searchParams.get("tab"); // 'all' | 'weekly' | 'drafts'
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("drops")
      .select(`
        *,
        creator:users!created_by(id, username, display_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply tab-based filters
    if (tab === "weekly") {
      query = query.eq("is_weekly", true).eq("status", "published");
    } else if (tab === "drafts") {
      if (!user) {
        return NextResponse.json({ drops: [] });
      }
      query = query.eq("status", "draft").eq("created_by", user.id);
    } else if (status) {
      query = query.eq("status", status);
    }

    const { data: drops, error } = await query;

    if (error) {
      console.error("[Drops API] Error fetching drops:", error);
      return NextResponse.json(
        { error: "Failed to fetch drops" },
        { status: 500 }
      );
    }

    // Get post counts for each drop
    const dropIds = drops?.map((d) => d.id) || [];
    let postCounts: Record<string, number> = {};
    
    if (dropIds.length > 0) {
      const { data: counts } = await supabase
        .from("drop_posts")
        .select("drop_id")
        .in("drop_id", dropIds);
      
      if (counts) {
        postCounts = counts.reduce((acc, item) => {
          acc[item.drop_id] = (acc[item.drop_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Enrich drops with post counts
    const enrichedDrops = drops?.map((drop) => ({
      ...drop,
      post_count: postCounts[drop.id] || 0,
    }));

    return NextResponse.json({ drops: enrichedDrops });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/drops - Create a new drop
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      date_range_start,
      date_range_end,
      filter_stream_ids,
      filter_user_ids,
      is_weekly = false,
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!date_range_start || !date_range_end) {
      return NextResponse.json(
        { error: "Date range is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create the drop (always use blocks mode)
    const insertData: Record<string, unknown> = {
      title: title.trim(),
      status: "draft",
      created_by: user.id,
      date_range_start,
      date_range_end,
      filter_stream_ids: filter_stream_ids?.length ? filter_stream_ids : null,
      filter_user_ids: filter_user_ids?.length ? filter_user_ids : null,
      is_weekly,
      use_blocks: true,
    };
    
    // Try with use_blocks first, fall back without it if column doesn't exist
    let drop;
    let dropError;
    
    const result1 = await supabase
      .from("drops")
      .insert(insertData)
      .select()
      .single();
    
    if (result1.error?.message?.includes("use_blocks")) {
      // Column doesn't exist, try without it
      const { use_blocks: _, ...insertDataWithoutBlocks } = insertData;
      const result2 = await supabase
        .from("drops")
        .insert(insertDataWithoutBlocks)
        .select()
        .single();
      drop = result2.data;
      dropError = result2.error;
    } else {
      drop = result1.data;
      dropError = result1.error;
    }

    if (dropError) {
      console.error("[Drops API] Error creating drop:", dropError);
      return NextResponse.json(
        { error: "Failed to create drop" },
        { status: 500 }
      );
    }

    // Query assets matching the criteria WITH their streams
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
    let assetStreamMap: Record<string, { streamId: string; streamName: string }[]> = {};
    let streamNames: Record<string, string> = {};
    
    if (filteredAssetIds.length > 0) {
      const { data: assetStreams } = await supabase
        .from("asset_streams")
        .select(`
          asset_id,
          stream:streams(id, name)
        `)
        .in("asset_id", filteredAssetIds);

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
    // When filter_stream_ids is provided, group by the first matching filtered stream
    // When no filter, group by primary stream (first stream association)
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
    // When filter_stream_ids is provided, maintain their order
    const streamOrder = filter_stream_ids?.length 
      ? filter_stream_ids.filter(id => assetsByStream[id]) // Only include streams with assets
      : Object.keys(assetsByStream); // Default order
    
    // Add any streams not in filter (shouldn't happen, but just in case)
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
        console.error("[Drops API] Error adding blocks to drop:", blocksError);
        // Delete the drop to avoid inconsistent state
        await supabase.from("drops").delete().eq("id", drop.id);
        return NextResponse.json(
          { error: "Failed to create drop content blocks" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      drop,
      post_count: filteredAssetIds.length,
    });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

