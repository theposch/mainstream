import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { DropView } from "@/components/drops/drop-view";
import { EmailDropView } from "@/components/drops/blocks/email-drop-view";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// POST /api/drops/[id]/publish - Publish a drop and optionally send email
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

    const body = await request.json();
    const { notify_team = false } = body;

    const supabase = await createClient();

    // Fetch drop and verify ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("*")
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
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Update drop status
    const { data: updatedDrop, error: updateError } = await supabase
      .from("drops")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", dropId)
      .select()
      .single();

    if (updateError) {
      console.error("[Drops Publish] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to publish drop" },
        { status: 500 }
      );
    }

    // Send email notification if requested
    let emailSent = false;
    if (notify_team && resend) {
      try {
        // Fetch all users to notify
        const { data: users } = await supabase
          .from("users")
          .select("email, display_name")
          .not("email", "is", null);

        const emails = users?.map((u) => u.email).filter(Boolean) || [];

        if (emails.length > 0) {
          let emailHtml: string;
          let contributors: any[] = [];

          // Check if drop uses blocks or legacy posts
          if (drop.use_blocks) {
            // Fetch blocks with assets and gallery images for blocks-based drops
            const { data: blocks } = await supabase
              .from("drop_blocks")
              .select(`
                *,
                asset:assets(
                  id, title, description, url, medium_url, thumbnail_url, asset_type, embed_provider, created_at,
                  uploader:users!uploader_id(id, username, display_name, avatar_url)
                ),
                gallery_images:drop_block_gallery_images(
                  id, position,
                  asset:assets(
                    id, title, url, medium_url, thumbnail_url, asset_type, embed_provider,
                    uploader:users!uploader_id(id, username, display_name, avatar_url)
                  )
                )
              `)
              .eq("drop_id", dropId)
              .order("position", { ascending: true });

            // Get contributors from blocks and gallery images
            const contributorMap = new Map();
            blocks?.forEach((block: any) => {
              if (block.asset?.uploader && !contributorMap.has(block.asset.uploader.id)) {
                contributorMap.set(block.asset.uploader.id, block.asset.uploader);
              }
              block.gallery_images?.forEach((galleryImage: any) => {
                if (galleryImage.asset?.uploader && !contributorMap.has(galleryImage.asset.uploader.id)) {
                  contributorMap.set(galleryImage.asset.uploader.id, galleryImage.asset.uploader);
                }
              });
            });
            contributors = Array.from(contributorMap.values());

            // Render blocks view for email
            emailHtml = await render(
              React.createElement(EmailDropView, {
                title: drop.title,
                description: drop.description,
                blocks: blocks || [],
                contributors,
              })
            );
          } else {
            // Fetch posts for legacy drops
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
                  uploader:users!uploader_id(id, username, display_name, avatar_url)
                )
              `)
              .eq("drop_id", dropId)
              .order("position", { ascending: true });

            const posts = dropPosts?.map((dp: any) => ({
              ...dp.asset,
              position: dp.position,
              streams: [],
            })).filter(Boolean) || [];

            // Get contributors
            const contributorMap = new Map();
            posts.forEach((post: any) => {
              if (post.uploader && !contributorMap.has(post.uploader.id)) {
                contributorMap.set(post.uploader.id, post.uploader);
              }
            });
            contributors = Array.from(contributorMap.values());

            // Render classic view for email
            emailHtml = await render(
              DropView({
                title: drop.title,
                description: drop.description,
                dateRangeStart: drop.date_range_start,
                dateRangeEnd: drop.date_range_end,
                posts,
                contributors,
              })
            );
          }

          // Wrap in email boilerplate
          const fullHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
              </head>
              <body style="margin: 0; padding: 0; background: #000000;">
                ${emailHtml}
              </body>
            </html>
          `;

          // Send via Resend
          await resend.emails.send({
            from: "Mainstream <drops@mainstream.app>",
            to: emails,
            subject: drop.title,
            html: fullHtml,
          });

          emailSent = true;
        }
      } catch (emailError) {
        console.error("[Drops Publish] Email error:", emailError);
        // Don't fail the publish if email fails
      }
    }

    return NextResponse.json({
      drop: updatedDrop,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error("[Drops Publish] Error:", error);
    return NextResponse.json(
      { error: "Failed to publish drop" },
      { status: 500 }
    );
  }
}

