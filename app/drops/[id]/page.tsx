import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropView } from "@/components/drops/drop-view";
import { DropBlocksView } from "@/components/drops/blocks/drop-blocks-view";
import { PublishedDropHeader } from "@/components/drops/published-drop-header";

type UploaderRow = { id: string; username: string; display_name: string; avatar_url: string };
type AssetRow = { id: string; title: string; url: string; medium_url?: string; thumbnail_url?: string; uploader?: UploaderRow | UploaderRow[] };
type GalleryImageRow = { id: string; position: number; asset?: AssetRow };
type BlockRow = { id: string; asset?: AssetRow; gallery_images?: GalleryImageRow[] } & Record<string, unknown>;
type StreamRow = { id: string; name: string };
type AssetStreamRow = { asset_id: string; stream?: StreamRow | StreamRow[] };
type DropPostRow = { position: number; display_mode?: string; crop_position_x?: number; crop_position_y?: number; asset?: AssetRow & { uploader?: UploaderRow | UploaderRow[] } };

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

  // Check if current user is the owner
  const isOwner = user?.id === drop.created_by;

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
    const contributorMap = new Map<string, UploaderRow>();
    blocks?.forEach((block: BlockRow) => {
      const uploader = Array.isArray(block.asset?.uploader) ? block.asset?.uploader[0] : block.asset?.uploader;
      if (uploader && !contributorMap.has(uploader.id)) {
        contributorMap.set(uploader.id, uploader);
      }
      block.gallery_images?.forEach((galleryImage: GalleryImageRow) => {
        const giUploader = Array.isArray(galleryImage.asset?.uploader) ? galleryImage.asset?.uploader[0] : galleryImage.asset?.uploader;
        if (giUploader && !contributorMap.has(giUploader.id)) {
          contributorMap.set(giUploader.id, giUploader);
        }
      });
    });
    const contributors = Array.from(contributorMap.values());

    return (
      <>
        {isOwner && (
          <PublishedDropHeader dropId={drop.id} dropTitle={drop.title} />
        )}
        <div className="max-w-3xl mx-auto py-10 px-4">
        <DropBlocksView
          title={drop.title}
          description={drop.description}
          blocks={blocks || []}
          contributors={contributors}
          dateRangeStart={drop.date_range_start}
          dateRangeEnd={drop.date_range_end}
        />
      </div>
      </>
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
  const posts = dropPosts?.map((dp: DropPostRow) => ({
    ...dp.asset,
    position: dp.position,
    display_mode: dp.display_mode,
    crop_position_x: dp.crop_position_x,
    crop_position_y: dp.crop_position_y,
  })).filter(Boolean) || [];

  // Get streams for posts
  const postIds = posts.map((p) => (p as AssetRow).id);
  const postStreams: Record<string, StreamRow[]> = {};
  
  if (postIds.length > 0) {
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`
        asset_id,
        stream:streams(id, name)
      `)
      .in("asset_id", postIds);

    assetStreams?.forEach((as: AssetStreamRow) => {
      if (!postStreams[as.asset_id]) {
        postStreams[as.asset_id] = [];
      }
      if (as.stream) {
        const stream = Array.isArray(as.stream) ? as.stream[0] : as.stream;
        if (stream) postStreams[as.asset_id].push(stream);
      }
    });
  }

  // Enrich posts with streams
  const enrichedPosts = posts.map((post) => {
    const p = post as AssetRow & { position?: number; display_mode?: string; crop_position_x?: number; crop_position_y?: number };
    return {
      ...p,
      streams: postStreams[p.id] || [],
    };
  });

  // Get unique contributors
  const contributorMap = new Map<string, UploaderRow>();
  posts.forEach((post) => {
    const p = post as AssetRow & { uploader?: UploaderRow | UploaderRow[] };
    const uploader = Array.isArray(p.uploader) ? p.uploader[0] : p.uploader;
    if (uploader && !contributorMap.has(uploader.id)) {
      contributorMap.set(uploader.id, uploader);
    }
  });
  const contributors = Array.from(contributorMap.values());

  return (
    <>
      {isOwner && (
        <PublishedDropHeader dropId={drop.id} dropTitle={drop.title} />
      )}
      <div className="max-w-3xl mx-auto py-10 px-4">
      <DropView
        title={drop.title}
        description={drop.description}
        dateRangeStart={drop.date_range_start}
        dateRangeEnd={drop.date_range_end}
        posts={enrichedPosts}
        contributors={contributors}
      />
    </div>
    </>
  );
}

