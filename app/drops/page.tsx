import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { DropsGrid } from "@/components/drops/drops-grid";
import { DropsPageClient } from "./drops-page-client";

export default async function DropsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Build query based on tab
  let query = supabase
    .from("drops")
    .select(`
      *,
      creator:users!created_by(id, username, display_name, avatar_url)
    `)
    .order("created_at", { ascending: false });

  if (tab === "weekly") {
    query = query.eq("is_weekly", true).eq("status", "published");
  } else if (tab === "drafts") {
    if (user) {
      query = query.eq("status", "draft").eq("created_by", user.id);
    } else {
      // No drafts for unauthenticated users
      return (
        <DropsPageClient
          initialDrops={[]}
          currentTab={tab}
          isAuthenticated={false}
        />
      );
    }
  } else {
    // "all" tab shows published drops
    query = query.eq("status", "published");
  }

  const { data: drops, error } = await query;

  if (error) {
    console.error("[Drops Page] Error fetching drops:", error);
  }

  const allDrops = drops || [];
  const dropIds = allDrops.map((d) => d.id);

  // Get post counts and preview images for each drop
  let enrichedDrops = allDrops;
  
  if (dropIds.length > 0) {
    // Initialize data structure
    const dropData: Record<string, { count: number; previews: string[] }> = {};
    dropIds.forEach((id) => {
      dropData[id] = { count: 0, previews: [] };
    });

    // Get post counts from drop_posts (legacy/non-block drops)
    const { data: dropPosts } = await supabase
      .from("drop_posts")
      .select(`
        drop_id,
        asset:assets(thumbnail_url)
      `)
      .in("drop_id", dropIds)
      .order("position", { ascending: true });

    dropPosts?.forEach((dp: any) => {
      const data = dropData[dp.drop_id];
      if (data) {
        data.count++;
        if (data.previews.length < 3 && dp.asset?.thumbnail_url) {
          data.previews.push(dp.asset.thumbnail_url);
        }
      }
    });

    // Also get post counts from drop_blocks (block-based drops)
    // Blocks of type 'post' or 'featured_post' count as posts
    const { data: dropBlocks } = await supabase
      .from("drop_blocks")
      .select(`
        drop_id,
        type,
        asset:assets(thumbnail_url)
      `)
      .in("drop_id", dropIds)
      .in("type", ["post", "featured_post"])
      .order("position", { ascending: true });

    dropBlocks?.forEach((db: any) => {
      const data = dropData[db.drop_id];
      if (data) {
        data.count++;
        if (data.previews.length < 3 && db.asset?.thumbnail_url) {
          data.previews.push(db.asset.thumbnail_url);
        }
      }
    });

    enrichedDrops = allDrops.map((drop) => ({
      ...drop,
      post_count: dropData[drop.id]?.count || 0,
      preview_images: dropData[drop.id]?.previews || [],
    }));
  }

  return (
    <DropsPageClient
      initialDrops={enrichedDrops}
      currentTab={tab}
      isAuthenticated={!!user}
      currentUserId={user?.id}
    />
  );
}

