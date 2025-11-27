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
    console.log(`[Asset Detail] Invalid ID format: ${id}`);
    notFound();
  }
  
  const supabase = await createClient();
  
  // Fetch asset from Supabase with uploader information
  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      uploader:users!uploader_id(*)
    `)
    .eq('id', id)
    .single();

  if (error || !asset) {
    console.log(`[Asset Detail] Asset not found: ${id}`, error);
    notFound();
  }
  
  console.log(`[Asset Detail] Found asset: ${asset.id} - ${asset.title}`);

  return <AssetDetail asset={asset} />;
}
