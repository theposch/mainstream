import { DashboardFeed } from "@/components/dashboard/feed";
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Opt out of caching to show newly uploaded assets
  noStore();
  
  const supabase = await createClient();
  
  // Get current user for like status check
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch assets with uploader, streams, AND like counts in a single query (prevents N+1)
  const { data: assets, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users!uploader_id(*),
      asset_streams(
        streams(*)
      ),
      asset_likes(count)
    `)
    .order('created_at', { ascending: false })
    .limit(50);
  
  // If user is logged in, fetch their likes in a single query
  let userLikedAssetIds: Set<string> = new Set();
  if (user && assets && assets.length > 0) {
    const assetIds = assets.map(a => a.id);
    const { data: userLikes } = await supabase
      .from('asset_likes')
      .select('asset_id')
      .eq('user_id', user.id)
      .in('asset_id', assetIds);
    
    if (userLikes) {
      userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
    }
  }
  
  // Transform the nested data to a flat structure
  const assetsWithData = (assets || []).map(asset => ({
    ...asset,
    streams: asset.asset_streams?.map((rel: any) => rel.streams).filter(Boolean) || [],
    asset_streams: undefined,
    likeCount: asset.asset_likes?.[0]?.count || 0,
    asset_likes: undefined,
    isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
  }));

  if (error) {
    console.error('[HomePage] Error fetching assets:', error);
  }

  return (
    <div className="w-full">
      <DashboardFeed initialAssets={assetsWithData} />
    </div>
  );
}
