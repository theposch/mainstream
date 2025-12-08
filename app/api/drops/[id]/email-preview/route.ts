import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { render } from "@react-email/render";
import * as React from "react";
import { EmailDropView } from "@/components/drops/blocks/email-drop-view";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drops/[id]/email-preview - Generate email HTML preview
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return new NextResponse("Authentication required", { status: 401 });
    }

    const supabase = await createClient();

    // Fetch drop
    const { data: drop } = await supabase
      .from("drops")
      .select("*")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return new NextResponse("Drop not found", { status: 404 });
    }

    // Only owner can preview
    if (drop.created_by !== user.id) {
      return new NextResponse("Not authorized", { status: 403 });
    }

    // Check if using blocks
    const useBlocks = drop.use_blocks ?? false;

    let emailHtml: string;
    let contributors: any[] = [];

    if (useBlocks) {
      // Fetch blocks with assets
      const { data: blocks } = await supabase
        .from("drop_blocks")
        .select(`
          *,
          asset:assets(
            id,
            title,
            description,
            url,
            medium_url,
            thumbnail_url,
            asset_type,
            embed_provider,
            created_at,
            uploader:users!uploader_id(id, username, display_name, avatar_url)
          )
        `)
        .eq("drop_id", dropId)
        .order("position", { ascending: true });

      // Fetch gallery images for image_gallery blocks
      const galleryBlockIds = blocks?.filter((b: any) => b.type === "image_gallery").map((b: any) => b.id) || [];
      let galleryImagesMap: Record<string, any[]> = {};
      
      if (galleryBlockIds.length > 0) {
        const { data: galleryImages } = await supabase
          .from("drop_block_gallery_images")
          .select(`
            id,
            block_id,
            asset_id,
            position,
            asset:assets(
              id,
              title,
              url,
              medium_url,
              thumbnail_url,
              asset_type
            )
          `)
          .in("block_id", galleryBlockIds)
          .order("position", { ascending: true });

        // Group by block_id
        galleryImages?.forEach((img: any) => {
          if (!galleryImagesMap[img.block_id]) {
            galleryImagesMap[img.block_id] = [];
          }
          galleryImagesMap[img.block_id].push(img);
        });
      }

      // Enrich blocks with gallery images
      const enrichedBlocks = blocks?.map((block: any) => ({
        ...block,
        gallery_images: block.type === "image_gallery" ? galleryImagesMap[block.id] || [] : undefined,
      })) || [];

      // Get contributors from blocks (including gallery images)
      const contributorMap = new Map();
      enrichedBlocks.forEach((block: any) => {
        if (block.asset?.uploader && !contributorMap.has(block.asset.uploader.id)) {
          contributorMap.set(block.asset.uploader.id, block.asset.uploader);
        }
        // Also get contributors from gallery images
        block.gallery_images?.forEach((img: any) => {
          if (img.asset?.uploader && !contributorMap.has(img.asset.uploader.id)) {
            contributorMap.set(img.asset.uploader.id, img.asset.uploader);
          }
        });
      });
      contributors = Array.from(contributorMap.values());

      // Render blocks view
      emailHtml = await render(
        React.createElement(EmailDropView, {
          title: drop.title,
          description: drop.description,
          blocks: enrichedBlocks,
          contributors,
          dateRangeStart: drop.date_range_start,
          dateRangeEnd: drop.date_range_end,
        })
      );
    } else {
      // For classic view, convert posts to blocks format
      const { data: dropPosts } = await supabase
        .from("drop_posts")
        .select(`
          position,
          display_mode,
          crop_position_x,
          crop_position_y,
          asset:assets(
            id,
            title,
            description,
            url,
            medium_url,
            thumbnail_url,
            asset_type,
            embed_provider,
            created_at,
            uploader:users!uploader_id(id, username, display_name, avatar_url)
          )
        `)
        .eq("drop_id", dropId)
        .order("position", { ascending: true });

      // Convert posts to block format for unified rendering
      const blocks = dropPosts?.map((dp: any, index: number) => ({
        id: `post-${index}`,
        drop_id: dropId,
        type: "post" as const,
        position: dp.position,
        asset_id: dp.asset?.id,
        asset: dp.asset,
        display_mode: dp.display_mode,
        crop_position_x: dp.crop_position_x,
        crop_position_y: dp.crop_position_y,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })).filter((b: any) => b.asset) || [];

      // Get contributors
      const contributorMap = new Map();
      blocks.forEach((block: any) => {
        if (block.asset?.uploader && !contributorMap.has(block.asset.uploader.id)) {
          contributorMap.set(block.asset.uploader.id, block.asset.uploader);
        }
      });
      contributors = Array.from(contributorMap.values());

      // Render using EmailDropView
      emailHtml = await render(
        React.createElement(EmailDropView, {
          title: drop.title,
          description: drop.description,
          blocks,
          contributors,
          dateRangeStart: drop.date_range_start,
          dateRangeEnd: drop.date_range_end,
        })
      );
    }

    // Wrap in full HTML document
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${drop.title} - Email Preview</title>
  <style>
    /* Preview toolbar */
    .preview-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #18181b;
      border-bottom: 1px solid #3f3f46;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .preview-toolbar h1 {
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }
    .preview-toolbar .actions {
      display: flex;
      gap: 8px;
    }
    .preview-toolbar button {
      background: #7c3aed;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .preview-toolbar button:hover {
      background: #6d28d9;
    }
    .preview-toolbar button.secondary {
      background: #3f3f46;
    }
    .preview-toolbar button.secondary:hover {
      background: #52525b;
    }
    .preview-toolbar .badge {
      background: #422006;
      color: #fbbf24;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    /* Email container */
    .email-container {
      margin-top: 60px;
      background: #000;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #09090b;">
  <div class="preview-toolbar">
    <div style="display: flex; align-items: center; gap: 12px;">
      <h1>📧 Email Preview</h1>
      <span class="badge">Draft</span>
    </div>
    <div class="actions">
      <button class="secondary" onclick="copyHtml()">Copy HTML</button>
      <button onclick="window.close()">Close Preview</button>
    </div>
  </div>
  <div class="email-container">
    ${emailHtml}
  </div>
  <script>
    function copyHtml() {
      const emailContent = document.querySelector('.email-container').innerHTML;
      navigator.clipboard.writeText(emailContent).then(() => {
        alert('Email HTML copied to clipboard!\\n\\nYou can paste this into Gmail\\'s compose window (use Cmd/Ctrl+Shift+V for plain paste, or paste into the HTML editor).');
      });
    }
  </script>
</body>
</html>`;

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[Email Preview] Error:", error);
    return new NextResponse("Failed to generate preview", { status: 500 });
  }
}

