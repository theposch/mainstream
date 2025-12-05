import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

// GET /api/drops/[id]/blocks/[blockId]/gallery - Get gallery images
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId, blockId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("created_by, status")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.status !== "published" && drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch gallery images with asset data
    const { data: images, error } = await supabase
      .from("drop_block_gallery_images")
      .select(`
        id,
        block_id,
        asset_id,
        position,
        created_at,
        asset:assets(
          id,
          title,
          url,
          medium_url,
          thumbnail_url,
          asset_type
        )
      `)
      .eq("block_id", blockId)
      .order("position", { ascending: true });

    if (error) {
      console.error("[Gallery API] Error fetching images:", error);
      return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 });
    }

    return NextResponse.json({ images: images || [] });
  } catch (error) {
    console.error("[Gallery API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/drops/[id]/blocks/[blockId]/gallery - Add images to gallery
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId, blockId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify block exists and is a gallery type
    const { data: block } = await supabase
      .from("drop_blocks")
      .select("type")
      .eq("id", blockId)
      .eq("drop_id", dropId)
      .single();

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    if (block.type !== "image_gallery") {
      return NextResponse.json({ error: "Block is not an image gallery" }, { status: 400 });
    }

    const body = await request.json();
    const { asset_ids } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json({ error: "asset_ids array is required" }, { status: 400 });
    }

    // Get current max position
    const { data: existingImages } = await supabase
      .from("drop_block_gallery_images")
      .select("position")
      .eq("block_id", blockId)
      .order("position", { ascending: false })
      .limit(1);

    const maxPosition = existingImages?.[0]?.position ?? -1;

    // Insert new images
    const newImages = asset_ids.map((asset_id: string, index: number) => ({
      block_id: blockId,
      asset_id,
      position: maxPosition + 1 + index,
    }));

    const { data: insertedImages, error } = await supabase
      .from("drop_block_gallery_images")
      .upsert(newImages, { onConflict: "block_id,asset_id" })
      .select(`
        id,
        block_id,
        asset_id,
        position,
        created_at,
        asset:assets(
          id,
          title,
          url,
          medium_url,
          thumbnail_url,
          asset_type
        )
      `);

    if (error) {
      console.error("[Gallery API] Error adding images:", error);
      return NextResponse.json({ error: "Failed to add images to gallery" }, { status: 500 });
    }

    return NextResponse.json({ images: insertedImages || [] });
  } catch (error) {
    console.error("[Gallery API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/drops/[id]/blocks/[blockId]/gallery - Replace all gallery images (reorder)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId, blockId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { asset_ids } = body;

    if (!asset_ids || !Array.isArray(asset_ids)) {
      return NextResponse.json({ error: "asset_ids array is required" }, { status: 400 });
    }

    // Fetch existing images first so we can restore them if insert fails
    const { data: existingImages, error: fetchError } = await supabase
      .from("drop_block_gallery_images")
      .select("asset_id, position")
      .eq("block_id", blockId)
      .order("position", { ascending: true });

    if (fetchError) {
      console.error("[Gallery API] Error fetching existing images:", fetchError);
      return NextResponse.json({ error: "Failed to read existing gallery images" }, { status: 500 });
    }

    // Delete all existing images
    const { error: deleteError } = await supabase
      .from("drop_block_gallery_images")
      .delete()
      .eq("block_id", blockId);

    if (deleteError) {
      console.error("[Gallery API] Error deleting existing images:", deleteError);
      return NextResponse.json({ error: "Failed to clear existing gallery images" }, { status: 500 });
    }

    // Insert new images in order
    if (asset_ids.length > 0) {
      const newImages = asset_ids.map((asset_id: string, index: number) => ({
        block_id: blockId,
        asset_id,
        position: index,
      }));

      const { error: insertError } = await supabase
        .from("drop_block_gallery_images")
        .insert(newImages);

      if (insertError) {
        console.error("[Gallery API] Error inserting new images:", insertError);
        
        // Attempt to restore the old images to prevent data loss
        if (existingImages && existingImages.length > 0) {
          const restoreImages = existingImages.map((img) => ({
            block_id: blockId,
            asset_id: img.asset_id,
            position: img.position,
          }));
          
          const { error: restoreError } = await supabase
            .from("drop_block_gallery_images")
            .insert(restoreImages);
          
          if (restoreError) {
            console.error("[Gallery API] Failed to restore images after insert failure:", restoreError);
            return NextResponse.json({ 
              error: "Failed to update gallery and could not restore original images" 
            }, { status: 500 });
          }
          
          console.log("[Gallery API] Successfully restored original images after insert failure");
        }
        
        return NextResponse.json({ error: "Failed to update gallery" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Gallery API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/drops/[id]/blocks/[blockId]/gallery - Remove specific image from gallery
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId, blockId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Verify drop ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("created_by")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("asset_id");

    if (!assetId) {
      return NextResponse.json({ error: "asset_id query parameter is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("drop_block_gallery_images")
      .delete()
      .eq("block_id", blockId)
      .eq("asset_id", assetId);

    if (error) {
      console.error("[Gallery API] Error removing image:", error);
      return NextResponse.json({ error: "Failed to remove image from gallery" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Gallery API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

