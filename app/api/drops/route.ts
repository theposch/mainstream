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
      use_blocks = false,
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

    // Create the drop
    const { data: drop, error: dropError } = await supabase
      .from("drops")
      .insert({
        title: title.trim(),
        status: "draft",
        created_by: user.id,
        date_range_start,
        date_range_end,
        filter_stream_ids: filter_stream_ids?.length ? filter_stream_ids : null,
        filter_user_ids: filter_user_ids?.length ? filter_user_ids : null,
        is_weekly,
        use_blocks,
      })
      .select()
      .single();

    if (dropError) {
      console.error("[Drops API] Error creating drop:", dropError);
      return NextResponse.json(
        { error: "Failed to create drop" },
        { status: 500 }
      );
    }

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

    // Add matching assets to the drop
    if (filteredAssetIds.length > 0) {
      if (use_blocks) {
        // For block-based drops, create post blocks
        const blocks = filteredAssetIds.map((asset_id, index) => ({
          drop_id: drop.id,
          type: "post",
          asset_id,
          position: index,
        }));

        const { error: blocksError } = await supabase
          .from("drop_blocks")
          .insert(blocks);

        if (blocksError) {
          console.error("[Drops API] Error adding blocks to drop:", blocksError);
          // Don't fail the whole operation, drop is created
        }
      } else {
        // For classic drops, create drop_posts entries
        const dropPosts = filteredAssetIds.map((asset_id, index) => ({
          drop_id: drop.id,
          asset_id,
          position: index,
        }));

        const { error: postsError } = await supabase
          .from("drop_posts")
          .insert(dropPosts);

        if (postsError) {
          console.error("[Drops API] Error adding posts to drop:", postsError);
          // Don't fail the whole operation, drop is created
        }
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

