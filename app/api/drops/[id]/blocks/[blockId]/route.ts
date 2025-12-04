import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

// PATCH /api/drops/[id]/blocks/[blockId] - Update a block
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId, blockId } = await params;
    const body = await request.json();
    const { content, heading_level, display_mode, crop_position_x, crop_position_y, gallery_layout, gallery_featured_index } = body;

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

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (content !== undefined) updates.content = content;
    if (heading_level !== undefined) updates.heading_level = heading_level;
    if (display_mode !== undefined) updates.display_mode = display_mode;
    if (crop_position_x !== undefined) updates.crop_position_x = crop_position_x;
    if (crop_position_y !== undefined) updates.crop_position_y = crop_position_y;
    if (gallery_layout !== undefined) updates.gallery_layout = gallery_layout;
    if (gallery_featured_index !== undefined) updates.gallery_featured_index = gallery_featured_index;

    // Update the block
    const { data: block, error: updateError } = await supabase
      .from("drop_blocks")
      .update(updates)
      .eq("id", blockId)
      .eq("drop_id", dropId)
      .select(`
        *,
        asset:assets (
          *,
          uploader:users!uploader_id (*)
        )
      `)
      .single();

    if (updateError) {
      console.error("Failed to update block:", updateError);
      return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
    }

    return NextResponse.json({ block });
  } catch (error) {
    console.error("Error updating block:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/drops/[id]/blocks/[blockId] - Delete a block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId, blockId } = await params;
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

    // Get the block's position before deleting
    const { data: blockToDelete } = await supabase
      .from("drop_blocks")
      .select("position")
      .eq("id", blockId)
      .single();

    // Delete the block
    const { error: deleteError } = await supabase
      .from("drop_blocks")
      .delete()
      .eq("id", blockId)
      .eq("drop_id", dropId);

    if (deleteError) {
      console.error("Failed to delete block:", deleteError);
      return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
    }

    // Shift remaining blocks up to fill the gap
    if (blockToDelete) {
      const { data: blocksToShift } = await supabase
        .from("drop_blocks")
        .select("id, position")
        .eq("drop_id", dropId)
        .gt("position", blockToDelete.position)
        .order("position", { ascending: true });
      
      if (blocksToShift) {
        for (const block of blocksToShift) {
          await supabase
            .from("drop_blocks")
            .update({ position: block.position - 1 })
            .eq("id", block.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

