import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropView } from "@/components/drops/drop-view";
import { DropBlocksView } from "@/components/drops/blocks/drop-blocks-view";

interface DropPageProps {
  params: Promise<{ id: string }>;
}

export default async function DropPage({ params }: DropPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Fetch the drop
  const { data: drop, error } = await supabase
    .from("drops")
    .select(`
      *,
      creator:users!created_by(id, username, display_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (error || !drop) {
    notFound();
  }

  // If draft, redirect to edit page (only for owner)
  if (drop.status === "draft") {
    if (drop.created_by === user?.id) {
      redirect(`/drops/${id}/edit`);
    }
    notFound();
  }

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
      .eq("drop_id", id)
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
    const contributors = Array.from(contributorMap.values());

    return (
      <div className="max-w-3xl mx-auto py-10">
        <DropBlocksView
          title={drop.title}
          description={drop.description}
          blocks={blocks || []}
          contributors={contributors}
          dateRangeStart={drop.date_range_start}
          dateRangeEnd={drop.date_range_end}
        />
      </div>
    );
  }

  // Legacy: Fetch posts with asset details for non-blocks drops
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
        thumbnail_url,
        asset_type,
        embed_provider,
        created_at,
        uploader:users!uploader_id(id, username, display_name, avatar_url)
      )
    `)
    .eq("drop_id", id)
    .order("position", { ascending: true });

  // Flatten posts
  const posts = dropPosts?.map((dp: any) => ({
    ...dp.asset,
    position: dp.position,
    display_mode: dp.display_mode,
    crop_position_x: dp.crop_position_x,
    crop_position_y: dp.crop_position_y,
  })).filter(Boolean) || [];

  // Get streams for posts
  const postIds = posts.map((p: any) => p.id);
  let postStreams: Record<string, any[]> = {};
  
  if (postIds.length > 0) {
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`
        asset_id,
        stream:streams(id, name)
      `)
      .in("asset_id", postIds);

    assetStreams?.forEach((as: any) => {
      if (!postStreams[as.asset_id]) {
        postStreams[as.asset_id] = [];
      }
      if (as.stream) {
        postStreams[as.asset_id].push(as.stream);
      }
    });
  }

  // Enrich posts with streams
  const enrichedPosts = posts.map((post: any) => ({
    ...post,
    streams: postStreams[post.id] || [],
  }));

  // Get unique contributors
  const contributorMap = new Map();
  posts.forEach((post: any) => {
    if (post.uploader && !contributorMap.has(post.uploader.id)) {
      contributorMap.set(post.uploader.id, post.uploader);
    }
  });
  const contributors = Array.from(contributorMap.values());

  return (
    <div className="max-w-3xl mx-auto py-10">
      <DropView
        title={drop.title}
        description={drop.description}
        dateRangeStart={drop.date_range_start}
        dateRangeEnd={drop.date_range_end}
        posts={enrichedPosts}
        contributors={contributors}
      />
    </div>
  );
}

