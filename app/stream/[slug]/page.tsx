import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from "@/lib/supabase/server";
import { StreamHeader } from "@/components/streams/stream-header";
import { StreamPageContent } from "@/components/streams/stream-page-content";
import type { User } from "@/lib/types/database";

interface StreamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StreamPage({ params }: StreamPageProps) {
  // Opt out of caching to ensure fresh like status
  noStore();
  
  const { slug } = await params;
  
  // Validate slug format - only allow lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }
  
  const supabase = await createClient();
  
  // Get current user for like status check
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch stream by slug (name field)
  const { data: stream, error: streamError } = await supabase
    .from('streams')
    .select('*')
    .eq('name', slug)
    .single();

  if (streamError || !stream) {
    notFound();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARALLEL DATA FETCHING - All these queries run simultaneously
  // ═══════════════════════════════════════════════════════════════════════════
  const [
    ownerResult,
    assetRelationsResult,
    followCountResult,
    followersResult,
    userFollowResult,
    contributorsResult,
    assetCountResult,
    bookmarksResult,
    currentUserProfileResult,
  ] = await Promise.all([
    // 1. Fetch owner (user or team)
    stream.owner_type === 'user'
      ? supabase.from('users').select('*').eq('id', stream.owner_id).single()
      : supabase.from('teams').select('*').eq('id', stream.owner_id).single(),
    
    // 2. Fetch assets via asset_streams junction table
    supabase
      .from('asset_streams')
      .select(`
        asset_id,
        added_at,
        assets (
          *,
          uploader:users!uploader_id(*),
          asset_likes(count)
        )
      `)
      .eq('stream_id', stream.id)
      .order('added_at', { ascending: false })
      .limit(50),
    
    // 3. Get follower count
    supabase
      .from('stream_follows')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', stream.id),
    
    // 4. Get followers with user details (limit to 10 for tooltip)
    supabase
      .from('stream_follows')
      .select(`
        user_id,
        created_at,
        users:user_id (id, username, display_name, avatar_url)
      `)
      .eq('stream_id', stream.id)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // 5. Check if current user is following
    user
      ? supabase
          .from('stream_follows')
          .select('stream_id')
          .eq('stream_id', stream.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    
    // 6. Get contributors (unique uploaders)
    supabase
      .from('asset_streams')
      .select(`
        assets!inner(
          uploader_id,
          uploader:users!uploader_id(id, username, display_name, avatar_url)
        )
      `)
      .eq('stream_id', stream.id),
    
    // 7. Get asset count
    supabase
      .from('asset_streams')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', stream.id),
    
    // 8. Get bookmarks
    supabase
      .from('stream_bookmarks')
      .select(`
        *,
        creator:created_by (id, username, display_name, avatar_url)
      `)
      .eq('stream_id', stream.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    
    // 9. Get current user's profile (for permission checks)
    user
      ? supabase.from('users').select('*').eq('id', user.id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const owner = ownerResult.data;
  if (!owner) {
    notFound();
  }

  const assetRelations = assetRelationsResult.data;

  // Extract asset IDs for batch like status check
  const assetIds = assetRelations?.map(r => r.asset_id).filter(Boolean) || [];
  
  // Check which assets the user has liked (single batch query)
  let userLikedAssetIds: Set<string> = new Set();
  if (user && assetIds.length > 0) {
    const { data: userLikes } = await supabase
      .from('asset_likes')
      .select('asset_id')
      .eq('user_id', user.id)
      .in('asset_id', assetIds);
    
    if (userLikes) {
      userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
    }
  }

  // Extract and transform assets with like data
  const streamAssets = (assetRelations?.map(relation => {
    const asset = relation.assets as any;
    if (!asset) return null;
    return {
      ...asset,
      likeCount: asset.asset_likes?.[0]?.count || 0,
      asset_likes: undefined,
      isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
    };
  }).filter(Boolean) || []) as any[];

  // ═══════════════════════════════════════════════════════════════════════════
  // PREPARE INITIAL DATA FOR CLIENT COMPONENTS (avoids client-side fetching)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Extract unique contributors
  interface ContributorAsset {
    assets?: {
      uploader_id: string;
      uploader?: User;
    };
  }
  const contributorMap = new Map<string, User>();
  (contributorsResult.data as ContributorAsset[] | null)?.forEach((item) => {
    const uploader = item.assets?.uploader;
    if (uploader && !contributorMap.has(uploader.id)) {
      contributorMap.set(uploader.id, uploader);
    }
  });
  const contributors = Array.from(contributorMap.values());

  // Prepare initial follow data
  const initialFollowData = {
    isFollowing: !!userFollowResult.data,
    followerCount: followCountResult.count || 0,
    followers: (followersResult.data?.map((f: any) => f.users).filter(Boolean) || []) as User[],
    contributorCount: contributors.length,
    contributors: contributors.slice(0, 10),
    assetCount: assetCountResult.count || 0,
  };

  // Prepare initial bookmarks (handle missing table gracefully)
  const initialBookmarks = bookmarksResult.error?.code === '42P01' 
    ? [] 
    : (bookmarksResult.data || []);

  // Current user profile for permission checks
  const currentUserProfile = currentUserProfileResult.data as User | null;

  return (
    <div className="w-full min-h-screen">
      <StreamHeader 
        stream={stream} 
        initialFollowData={initialFollowData}
        initialBookmarks={initialBookmarks}
        currentUser={currentUserProfile}
      />
      
      <StreamPageContent assets={streamAssets} />
    </div>
  );
}
