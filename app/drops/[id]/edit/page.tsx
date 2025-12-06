import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropBlocksEditorClient } from "./drop-blocks-editor-client";

interface EditDropPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDropPage({ params }: EditDropPageProps) {
  const { id } = await params;
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

  // Fetch gallery images for gallery blocks
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
          asset_type,
          uploader:users!uploader_id(id, username, display_name, avatar_url)
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
    // Also add contributors from gallery images
    block.gallery_images?.forEach((img: any) => {
      if (img.asset?.uploader && !contributorMap.has(img.asset.uploader.id)) {
        contributorMap.set(img.asset.uploader.id, img.asset.uploader);
      }
    });
  });
  const contributors = Array.from(contributorMap.values());

  // Fetch available assets for the asset picker
  const { data: availableAssetsRaw } = await supabase
    .from("assets")
    .select(`
      id,
      title,
      description,
      type,
      url,
      medium_url,
      thumbnail_url,
      uploader_id,
      asset_type,
      embed_provider,
      created_at,
      uploader:users!uploader_id(id, username, display_name, avatar_url)
    `)
    .gte("created_at", drop.date_range_start)
    .lte("created_at", drop.date_range_end)
    .order("created_at", { ascending: false })
    .limit(100);

  // Transform assets: Supabase returns uploader as array, unwrap to single object
  // Check array has elements to avoid undefined when empty
  const availableAssets = (availableAssetsRaw || []).map((asset: any) => ({
    ...asset,
    uploader: Array.isArray(asset.uploader) && asset.uploader.length > 0 
      ? asset.uploader[0] 
      : asset.uploader,
  }));

  return (
    <DropBlocksEditorClient
      drop={drop}
      initialBlocks={enrichedBlocks}
      initialContributors={contributors}
      availableAssets={availableAssets}
    />
  );
}

