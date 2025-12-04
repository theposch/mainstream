import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropEditorClient } from "./drop-editor-client";

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

  // Fetch posts with asset details
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

