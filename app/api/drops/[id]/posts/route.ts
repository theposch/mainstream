import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/drops/[id]/posts - Add posts to a drop
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Check ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to edit this drop" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { asset_ids } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json(
        { error: "asset_ids array is required" },
        { status: 400 }
      );
    }

    // Get current max position
    const { data: existingPosts } = await supabase
      .from("drop_posts")
      .select("position")
      .eq("drop_id", dropId)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition = existingPosts?.[0]?.position ?? -1;

    // Insert new posts
    const newPosts = asset_ids.map((asset_id: string, index: number) => ({
      drop_id: dropId,
      asset_id,
      position: maxPosition + 1 + index,
    }));

    const { data: insertedPosts, error } = await supabase
      .from("drop_posts")
      .upsert(newPosts, { onConflict: "drop_id,asset_id" })
      .select();

    if (error) {
      console.error("[Drops API] Error adding posts:", error);
      return NextResponse.json(
        { error: "Failed to add posts to drop" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      added: insertedPosts?.length || 0,
    });
  } catch (error) {
    console.error("[Drops API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

