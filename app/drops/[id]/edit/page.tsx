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

