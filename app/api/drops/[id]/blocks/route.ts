import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { DropBlockType } from "@/lib/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drops/[id]/blocks - Get all blocks for a drop
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId } = await params;
    const supabase = await createClient();

    // Get blocks with asset data
    const { data: blocks, error } = await supabase
      .from("drop_blocks")
      .select(`
        *,
        asset:assets (
          *,
          uploader:users (*),
          streams (*)
        )
      `)
      .eq("drop_id", dropId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to fetch blocks:", error);
      return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
    }

    return NextResponse.json({ blocks: blocks || [] });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/drops/[id]/blocks - Create a new block
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId } = await params;
    const body = await request.json();
    const { type, content, heading_level, asset_id, position } = body as {
      type: DropBlockType;
      content?: string;
      heading_level?: number;
      asset_id?: string;
      position?: number;
    };

    // Validate type
    if (!['text', 'heading', 'post', 'featured_post', 'divider', 'quote'].includes(type)) {
      return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop, error: dropError } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (dropError || !drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current max position if not provided
    let blockPosition = position;
    if (blockPosition === undefined) {
      const { data: maxPosResult } = await supabase
        .from("drop_blocks")
        .select("position")
        .eq("drop_id", dropId)
        .order("position", { ascending: false })
        .limit(1)
        .single();
      
      blockPosition = (maxPosResult?.position ?? -1) + 1;
    } else {
      // Shift existing blocks down if inserting at a specific position
      await supabase.rpc("shift_drop_blocks_down", {
        p_drop_id: dropId,
        p_from_position: blockPosition,
      }).then(() => {}).catch(() => {
        // RPC might not exist yet, try manual update
        return supabase
          .from("drop_blocks")
          .update({ position: supabase.rpc("increment_position") })
          .eq("drop_id", dropId)
          .gte("position", blockPosition);
      });
    }

    // Create the block
    const { data: block, error: createError } = await supabase
      .from("drop_blocks")
      .insert({
        drop_id: dropId,
        type,
        content,
        heading_level,
        asset_id,
        position: blockPosition,
      })
      .select(`
        *,
        asset:assets (
          *,
          uploader:users (*),
          streams (*)
        )
      `)
      .single();

    if (createError) {
      console.error("Failed to create block:", createError);
      return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
    }

    // Mark drop as using blocks
    await supabase
      .from("drops")
      .update({ use_blocks: true })
      .eq("id", dropId);

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Error creating block:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/drops/[id]/blocks - Reorder all blocks
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId } = await params;
    const body = await request.json();
    const { block_ids } = body as { block_ids: string[] };

    if (!Array.isArray(block_ids)) {
      return NextResponse.json({ error: "block_ids must be an array" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop, error: dropError } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (dropError || !drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update positions for each block
    const updates = block_ids.map((blockId, index) => 
      supabase
        .from("drop_blocks")
        .update({ position: index })
        .eq("id", blockId)
        .eq("drop_id", dropId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering blocks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

