import { DashboardFeed } from "@/components/dashboard/feed";
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Opt out of caching to show newly uploaded assets
  noStore();
  
  const supabase = await createClient();
  
  // Fetch assets with uploader, streams, AND like counts in a single query
  // Note: Like status is verified client-side for reliability
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
  
  // Transform the nested data to a flat structure
  const assetsWithData = (assets || []).map(asset => ({
    ...asset,
    streams: asset.asset_streams?.map((rel: any) => rel.streams).filter(Boolean) || [],
    asset_streams: undefined,
    likeCount: asset.asset_likes?.[0]?.count || 0,
    asset_likes: undefined,
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
