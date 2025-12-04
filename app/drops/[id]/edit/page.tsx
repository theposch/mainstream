import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropEditorClient } from "./drop-editor-client";
import { DropBlocksEditorClient } from "./drop-blocks-editor-client";

interface EditDropPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function EditDropPage({ params, searchParams }: EditDropPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

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

  // Check ownership
  if (drop.created_by !== user.id) {
    notFound();
  }

  // Determine if using blocks mode
  // Use blocks mode if: explicitly requested via ?mode=blocks OR drop.use_blocks is true
  const useBlocksMode = mode === "blocks" || drop.use_blocks;

  if (useBlocksMode) {
    // Fetch blocks
    const { data: blocks, error: blocksError } = await supabase
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
      .eq("drop_id", id)
      .order("position", { ascending: true });
    
    if (blocksError) {
      console.error("Error fetching blocks:", blocksError);
    }

    // Get contributors from blocks
    const contributorMap = new Map();
    blocks?.forEach((block: any) => {
      if (block.asset?.uploader && !contributorMap.has(block.asset.uploader.id)) {
        contributorMap.set(block.asset.uploader.id, block.asset.uploader);
      }
    });
    const contributors = Array.from(contributorMap.values());

    // Fetch available assets for the asset picker
    const { data: availableAssets } = await supabase
      .from("assets")
      .select(`
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
      `)
      .gte("created_at", drop.date_range_start)
      .lte("created_at", drop.date_range_end)
      .order("created_at", { ascending: false })
      .limit(100);

    return (
      <DropBlocksEditorClient
        drop={drop}
        initialBlocks={blocks || []}
        initialContributors={contributors}
        availableAssets={availableAssets || []}
      />
    );
  }

  // Legacy mode: fetch posts
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
    <DropEditorClient
      drop={drop}
      initialPosts={enrichedPosts}
      initialContributors={contributors}
    />
  );
}

