import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropBlocksEditorClient } from "./drop-blocks-editor-client";

// Supabase query result types
type UploaderRow = { id: string; username: string; display_name: string; avatar_url: string };
type AssetRow = { id: string; title: string; url: string; medium_url?: string; thumbnail_url?: string; asset_type?: string; uploader?: UploaderRow | UploaderRow[] };
type GalleryImageRow = { id: string; block_id: string; asset_id: string; position: number; asset?: AssetRow };
type BlockRow = { id: string; type: string; asset?: AssetRow; gallery_images?: GalleryImageRow[] } & Record<string, unknown>;

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
  const galleryBlockIds = blocks?.filter((b: BlockRow) => b.type === "image_gallery").map((b: BlockRow) => b.id) || [];
  const galleryImagesMap: Record<string, GalleryImageRow[]> = {};
  
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
    galleryImages?.forEach((img: GalleryImageRow) => {
      if (!galleryImagesMap[img.block_id]) {
        galleryImagesMap[img.block_id] = [];
      }
      galleryImagesMap[img.block_id].push(img);
    });
  }

  // Enrich blocks with gallery images
  const enrichedBlocks = blocks?.map((block: BlockRow) => ({
    ...block,
    gallery_images: block.type === "image_gallery" ? galleryImagesMap[block.id] || [] : undefined,
  })) || [];

  // Get contributors from blocks (including gallery images)
  const contributorMap = new Map<string, UploaderRow>();
  enrichedBlocks.forEach((block: BlockRow) => {
    const uploader = Array.isArray(block.asset?.uploader) ? block.asset?.uploader[0] : block.asset?.uploader;
    if (uploader && !contributorMap.has(uploader.id)) {
      contributorMap.set(uploader.id, uploader);
    }
    // Also add contributors from gallery images
    block.gallery_images?.forEach((img: GalleryImageRow) => {
      const imgUploader = Array.isArray(img.asset?.uploader) ? img.asset?.uploader[0] : img.asset?.uploader;
      if (imgUploader && !contributorMap.has(imgUploader.id)) {
        contributorMap.set(imgUploader.id, imgUploader);
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
  const availableAssets = (availableAssetsRaw || []).map((asset: AssetRow) => ({
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

