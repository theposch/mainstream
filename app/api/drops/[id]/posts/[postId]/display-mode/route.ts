import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { DropPostDisplayMode } from "@/lib/types/database";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

interface UpdateBody {
  display_mode?: DropPostDisplayMode;
  crop_position_x?: number;
  crop_position_y?: number;
}

// PATCH /api/drops/[id]/posts/[postId]/display-mode - Update display mode and crop position
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId, postId: assetId } = await params;
    const body = await request.json() as UpdateBody;
    const { display_mode, crop_position_x, crop_position_y } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    // Validate and add display_mode if provided
    if (display_mode !== undefined) {
      if (!['auto', 'fit', 'cover'].includes(display_mode)) {
        return NextResponse.json(
          { error: "Invalid display_mode. Must be 'auto', 'fit', or 'cover'" },
          { status: 400 }
        );
      }
      updates.display_mode = display_mode;
    }

    // Validate and add crop positions if provided
    if (crop_position_x !== undefined) {
      if (crop_position_x < 0 || crop_position_x > 100) {
        return NextResponse.json(
          { error: "crop_position_x must be between 0 and 100" },
          { status: 400 }
        );
      }
      updates.crop_position_x = crop_position_x;
    }

    if (crop_position_y !== undefined) {
      if (crop_position_y < 0 || crop_position_y > 100) {
        return NextResponse.json(
          { error: "crop_position_y must be between 0 and 100" },
          { status: 400 }
        );
      }
      updates.crop_position_y = crop_position_y;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
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

    // Update the post settings
    const { error: updateError } = await supabase
      .from("drop_posts")
      .update(updates)
      .eq("drop_id", dropId)
      .eq("asset_id", assetId);

    if (updateError) {
      console.error("Failed to update post settings:", updateError);
      return NextResponse.json(
        { error: "Failed to update post settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error("Error updating post settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

