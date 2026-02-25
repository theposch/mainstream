import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserProfileClient } from "./user-profile-client";
import type { Asset, Stream } from "@/lib/types/database";
import type { UserProfileTab } from "@/components/users/user-profile-tabs";

interface UserProfileProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; asset?: string }>;
}

// Supabase returns asset_likes as an aggregate when using count
interface AssetWithLikeCount extends Record<string, unknown> {
  id: string;
  asset_likes?: Array<{ count: number }>;
}

interface LikedQueryRow {
  asset_id: string;
  assets: (AssetWithLikeCount & { id: string }) | null;
}

interface AssetStreamRelation {
  stream_id: string;
  added_at: string;
  assets: {
    id: string;
    url: string;
    thumbnail_url: string | null;
    title: string | null;
  } | null;
}

interface StreamWithAssets extends Stream {
  assetsCount?: number;
  recentPosts?: Array<{ id: string; url: string; title: string }>;
}

/** Determines if a Supabase error is a "column not found" error (pre-migration 025). */
function isColumnNotFoundError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "42703" || (e?.message?.includes("visibility") ?? false);
}

export default async function UserProfile({
  params,
  searchParams,
}: UserProfileProps) {
  const { username: rawUsername } = await params;
  const { tab } = await searchParams;

  // Validate and decode username
  let username: string;
  try {
    username = decodeURIComponent(rawUsername);
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) notFound();
  } catch {
    notFound();
  }

  const supabase = await createClient();

  // Get current session user (may be null for logged-out visitors)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Resolve the profile being viewed
  const { data: profileUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (userError || !profileUser) notFound();

  // Fetch all profile data in parallel
  const [
    { count: followersCount },
    { count: followingCount },
    assetsCountResult,
    assetsDataResult,
    { data: streamsData },
    { data: likedData },
  ] = await Promise.all([
    supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileUser.id),
    supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileUser.id),
    // Visibility-aware asset count (falls back if migration 025 not yet applied)
    supabase
      .from("assets")
      .select("*", { count: "exact", head: true })
      .or(
        `and(uploader_id.eq.${profileUser.id},visibility.is.null),and(uploader_id.eq.${profileUser.id},visibility.eq.public)`
      ),
    supabase
      .from("assets")
      .select("*, uploader:users!uploader_id(*), asset_likes(count)")
      .or(
        `and(uploader_id.eq.${profileUser.id},visibility.is.null),and(uploader_id.eq.${profileUser.id},visibility.eq.public)`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("streams")
      .select("*")
      .eq("owner_id", profileUser.id)
      .eq("owner_type", "user")
      .eq("status", "active"),
    supabase
      .from("asset_likes")
      .select("asset_id, assets(*, uploader:users!uploader_id(*), asset_likes(count))")
      .eq("user_id", profileUser.id),
  ]);

  // Fallback for pre-migration databases that lack the visibility column
  let assetsCount = assetsCountResult.count;
  let assetsData = assetsDataResult.data;

  if (
    (assetsCountResult.error && isColumnNotFoundError(assetsCountResult.error)) ||
    (assetsDataResult.error && isColumnNotFoundError(assetsDataResult.error))
  ) {
    const [countFallback, dataFallback] = await Promise.all([
      supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("uploader_id", profileUser.id),
      supabase
        .from("assets")
        .select("*, uploader:users!uploader_id(*), asset_likes(count)")
        .eq("uploader_id", profileUser.id)
        .order("created_at", { ascending: false }),
    ]);
    assetsCount = countFallback.count;
    assetsData = dataFallback.data;
  }

  // Collect all asset IDs to batch-check which the current user has liked
  const userAssetIds = (assetsData || []).map((a) => a.id);
  const likedAssetIds = (likedData as LikedQueryRow[] | null || []).map(
    (l) => l.asset_id
  );
  const allAssetIds = [...new Set([...userAssetIds, ...likedAssetIds])];

  let currentUserLikedIds = new Set<string>();
  if (authUser && allAssetIds.length > 0) {
    const { data: currentUserLikes } = await supabase
      .from("asset_likes")
      .select("asset_id")
      .eq("user_id", authUser.id)
      .in("asset_id", allAssetIds);
    if (currentUserLikes) {
      currentUserLikedIds = new Set(currentUserLikes.map((l) => l.asset_id));
    }
  }

  // Transform user's uploaded assets
  const userAssets: Asset[] = (
    (assetsData || []) as AssetWithLikeCount[]
  ).map((asset) => ({
    ...(asset as unknown as Asset),
    likeCount: asset.asset_likes?.[0]?.count || 0,
    asset_likes: undefined,
    isLikedByCurrentUser: currentUserLikedIds.has(asset.id),
  }));

  // Enrich streams with asset counts and recent thumbnails (single batch query)
  const streamIds = (streamsData || []).map((s) => s.id);
  let enrichedStreams: StreamWithAssets[] = [];

  if (streamIds.length > 0) {
    const { data: allAssetRelations } = await supabase
      .from("asset_streams")
      .select("stream_id, added_at, assets(id, url, thumbnail_url, title)")
      .in("stream_id", streamIds)
      .order("added_at", { ascending: false });

    interface StreamEntry {
      count: number;
      posts: Array<{ id: string; url: string; title: string }>;
    }
    const streamAssetMap = new Map<string, StreamEntry>();
    streamIds.forEach((id) => streamAssetMap.set(id, { count: 0, posts: [] }));

    ((allAssetRelations || []) as AssetStreamRelation[]).forEach((rel) => {
      const entry = streamAssetMap.get(rel.stream_id);
      if (entry) {
        entry.count++;
        if (entry.posts.length < 4 && rel.assets) {
          entry.posts.push({
            id: rel.assets.id,
            url: rel.assets.thumbnail_url || rel.assets.url || "",
            title: rel.assets.title || "",
          });
        }
      }
    });

    enrichedStreams = (streamsData || []).map((stream) => {
      const data = streamAssetMap.get(stream.id) || { count: 0, posts: [] };
      return { ...stream, assetsCount: data.count, recentPosts: data.posts };
    });
  }

  // Transform liked assets
  const likedAssets: Asset[] = (
    (likedData as LikedQueryRow[] | null || [])
  ).flatMap((item) => {
    const asset = item.assets as AssetWithLikeCount | null;
    if (!asset) return [];
    return [
      {
        ...(asset as unknown as Asset),
        likeCount: asset.asset_likes?.[0]?.count || 0,
        asset_likes: undefined,
        isLikedByCurrentUser: currentUserLikedIds.has(asset.id),
      },
    ];
  });

  const validTabs: UserProfileTab[] = ["shots", "streams", "liked"];
  const initialTab: UserProfileTab =
    tab && validTabs.includes(tab as UserProfileTab)
      ? (tab as UserProfileTab)
      : "shots";

  return (
    <UserProfileClient
      profileUser={profileUser}
      userAssets={userAssets}
      userStreams={enrichedStreams}
      initialLikedAssets={likedAssets}
      stats={{
        followers: followersCount || 0,
        following: followingCount || 0,
        assets: assetsCount || 0,
      }}
      currentUserId={authUser?.id || null}
      initialTab={initialTab}
    />
  );
}
