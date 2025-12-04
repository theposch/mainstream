import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drops/[id] - Get a single drop with all details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await getCurrentUser();

    // Fetch the drop
    const { data: drop, error: dropError } = await supabase
      .from("drops")
      .select(`
        *,
        creator:users!created_by(id, username, display_name, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (dropError || !drop) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    // Check access: published drops are public, drafts only visible to creator
    if (drop.status === "draft" && drop.created_by !== user?.id) {
      return NextResponse.json(
        { error: "Not authorized to view this draft" },
        { status: 403 }
      );
    }

    // Fetch posts with asset details
    const { data: dropPosts } = await supabase
      .from("drop_posts")
      .select(`
        position,
        asset:assets(
          id,
          title,
          description,
          url,
          thumbnail_url,
          asset_type,
          embed_provider,
          created_at,
          uploader:users!uploader_id(id, username, display_name, avatar_url)
        )
      `)
      .eq("drop_id", id)
      .order("position", { ascending: true });

    // Flatten posts and get streams for each
    const posts = dropPosts?.map((dp) => ({
      ...dp.asset,
      position: dp.position,
    })).filter(Boolean) || [];

    // Get streams for all posts
    const postIds = posts.map((p) => p.id);
    let postStreams: Record<string, any[]> = {};
    
    if (postIds.length > 0) {
      const { data: assetStreams } = await supabase
        .from("asset_streams")
        .select(`
          asset_id,
          stream:streams(id, name)
        `)
        .in("asset_id", postIds);

      if (assetStreams) {
        assetStreams.forEach((as) => {
          if (!postStreams[as.asset_id]) {
            postStreams[as.asset_id] = [];
          }
          if (as.stream) {
            postStreams[as.asset_id].push(as.stream);
          }
        });
      }
    }

    // Enrich posts with streams
    const enrichedPosts = posts.map((post) => ({
      ...post,
      streams: postStreams[post.id] || [],
    }));

    // Get unique contributors
    const contributorMap = new Map();
    posts.forEach((post) => {
      if (post.uploader && !contributorMap.has(post.uploader.id)) {
        contributorMap.set(post.uploader.id, post.uploader);
      }
    });
    const contributors = Array.from(contributorMap.values());

    return NextResponse.json({
      drop: {
        ...drop,
        posts: enrichedPosts,
        contributors,
        post_count: posts.length,
      },
    });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/drops/[id] - Update a drop
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Check ownership
    const { data: existing } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to edit this drop" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: drop, error } = await supabase
      .from("drops")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Drops API] Error updating drop:", error);
      return NextResponse.json(
        { error: "Failed to update drop" },
        { status: 500 }
      );
    }

    return NextResponse.json({ drop });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/drops/[id] - Delete a drop
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Check ownership
    const { data: existing } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this drop" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("drops")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Drops API] Error deleting drop:", error);
      return NextResponse.json(
        { error: "Failed to delete drop" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

