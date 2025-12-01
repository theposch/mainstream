import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetDetail } from "@/components/assets/asset-detail";

interface AssetPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { id } = await params;
  
  // Validate UUID format to prevent invalid queries
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }
  
  const supabase = await createClient();
  
  // Fetch asset with uploader and like count
  // Note: Like status is verified client-side for reliability
  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users!uploader_id(*),
      asset_likes(count)
    `)
    .eq('id', id)
    .single();

  if (error || !asset) {
    notFound();
  }
  
  // Transform asset with like count (status checked client-side)
  const assetWithLikeData = {
    ...asset,
    likeCount: asset.asset_likes?.[0]?.count || 0,
    asset_likes: undefined,
  };

  return <AssetDetail asset={assetWithLikeData} />;
}
