import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { DropPostDisplayMode } from "@/lib/types/database";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

// PATCH /api/drops/[id]/posts/[postId]/display-mode - Update display mode for a post in a drop
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: dropId, postId: assetId } = await params;
    const body = await request.json();
    const { display_mode } = body as { display_mode: DropPostDisplayMode };

    // Validate display_mode
    if (!['auto', 'fit', 'cover'].includes(display_mode)) {
      return NextResponse.json(
        { error: "Invalid display_mode. Must be 'auto', 'fit', or 'cover'" },
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

    // Update display_mode
    const { error: updateError } = await supabase
      .from("drop_posts")
      .update({ display_mode })
      .eq("drop_id", dropId)
      .eq("asset_id", assetId);

    if (updateError) {
      console.error("Failed to update display mode:", updateError);
      return NextResponse.json(
        { error: "Failed to update display mode" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, display_mode });
  } catch (error) {
    console.error("Error updating display mode:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

