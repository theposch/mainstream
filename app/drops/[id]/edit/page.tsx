import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropBlocksEditorClient } from "./drop-blocks-editor-client";
import type { User, DropBlockType, DropBlock, Asset } from "@/lib/types/database";

interface EditDropPageProps {
  params: Promise<{ id: string }>;
}

// Shape returned by the drop_blocks select (partial, only what we use here)
interface RawBlock {
  id: string;
  drop_id: string;
  type: DropBlockType;
  position: number;
  content?: string;
  asset_id?: string;
  display_mode?: string;
  crop_position_x?: number;
  crop_position_y?: number;
  gallery_layout?: string;
  gallery_featured_index?: number;
  created_at: string;
  updated_at: string;
  asset?: {
    id: string;
    title: string;
    description?: string;
    url: string;
    medium_url?: string;
    thumbnail_url?: string;
    asset_type?: string;
    embed_provider?: string;
    created_at: string;
    uploader?: User | User[];
  } | null;
}

// Shape returned by the drop_block_gallery_images select
interface RawGalleryImage {
  id: string;
  block_id: string;
  asset_id: string;
  position: number;
  asset?: {
    id: string;
    title: string;
    url: string;
    medium_url?: string;
    thumbnail_url?: string;
    asset_type?: string;
    uploader?: User | User[];
  } | null;
}

// Enriched block with gallery images merged in
interface EnrichedBlock extends RawBlock {
  gallery_images?: RawGalleryImage[];
}

// Shape returned by the assets select for the asset picker
interface RawAvailableAsset {
  id: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  medium_url?: string;
  thumbnail_url?: string;
  uploader_id: string;
  asset_type?: string;
  embed_provider?: string;
  created_at: string;
  uploader?: User | User[];
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
  const galleryBlockIds = (blocks as RawBlock[] | null)?.filter((b) => b.type === "image_gallery").map((b) => b.id) || [];
  const galleryImagesMap: Record<string, RawGalleryImage[]> = {};

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
    (galleryImages as RawGalleryImage[] | null)?.forEach((img) => {
      if (!galleryImagesMap[img.block_id]) {
        galleryImagesMap[img.block_id] = [];
      }
      galleryImagesMap[img.block_id].push(img);
    });
  }

  // Enrich blocks with gallery images
  const enrichedBlocks: EnrichedBlock[] = (blocks as RawBlock[] | null)?.map((block) => ({
    ...block,
    gallery_images: block.type === "image_gallery" ? galleryImagesMap[block.id] || [] : undefined,
  })) || [];

  // Get contributors from blocks (including gallery images)
  const contributorMap = new Map<string, User>();
  enrichedBlocks.forEach((block) => {
    const uploader = block.asset?.uploader;
    const uploaderObj = Array.isArray(uploader) ? uploader[0] : uploader;
    if (uploaderObj && !contributorMap.has(uploaderObj.id)) {
      contributorMap.set(uploaderObj.id, uploaderObj);
    }
    // Also add contributors from gallery images
    block.gallery_images?.forEach((img) => {
      const imgUploader = img.asset?.uploader;
      const imgUploaderObj = Array.isArray(imgUploader) ? imgUploader[0] : imgUploader;
      if (imgUploaderObj && !contributorMap.has(imgUploaderObj.id)) {
        contributorMap.set(imgUploaderObj.id, imgUploaderObj);
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
  const availableAssets = ((availableAssetsRaw as RawAvailableAsset[] | null) || []).map((asset) => ({
    ...asset,
    uploader: Array.isArray(asset.uploader) && asset.uploader.length > 0
      ? asset.uploader[0]
      : asset.uploader,
  }));

  return (
    <DropBlocksEditorClient
      drop={drop}
      initialBlocks={enrichedBlocks as unknown as DropBlock[]}
      initialContributors={contributors}
      availableAssets={availableAssets as unknown as Asset[]}
    />
  );
}

