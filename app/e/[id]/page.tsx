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
  
  // Get current user for like status check
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch asset with uploader and like count
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
  
  // Check if current user has liked this asset
  let isLikedByCurrentUser = false;
  if (user) {
    const { data: userLike } = await supabase
      .from('asset_likes')
      .select('id')
      .eq('asset_id', id)
      .eq('user_id', user.id)
      .single();
    
    isLikedByCurrentUser = !!userLike;
  }
  
  // Transform asset with like data
  const assetWithLikeData = {
    ...asset,
    likeCount: asset.asset_likes?.[0]?.count || 0,
    asset_likes: undefined,
    isLikedByCurrentUser,
  };

  return <AssetDetail asset={assetWithLikeData} />;
}
