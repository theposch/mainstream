import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

// DELETE /api/drops/[id]/posts/[postId] - Remove a post from a drop
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId, postId: assetId } = await params;
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

    // Remove the post from the drop
    const { error } = await supabase
      .from("drop_posts")
      .delete()
      .eq("drop_id", dropId)
      .eq("asset_id", assetId);

    if (error) {
      console.error("[Drops API] Error removing post:", error);
      return NextResponse.json(
        { error: "Failed to remove post from drop" },
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

