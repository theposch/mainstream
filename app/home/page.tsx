import { DashboardFeed } from "@/components/dashboard/feed";
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Opt out of caching to show newly uploaded assets
  noStore();
  
  // Fetch assets directly from Supabase
  const supabase = await createClient();
  const { data: assets, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users!uploader_id(*)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[HomePage] Error fetching assets:', error);
  }

  // Handle empty state or error gracefully
  const displayAssets = assets || [];

  console.log(`[HomePage] Loaded ${displayAssets.length} assets from database`);

  return (
    <div className="w-full">
      <DashboardFeed initialAssets={displayAssets} />
    </div>
  );
}
