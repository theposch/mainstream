import { notFound } from "next/navigation";
import { readAssets } from "@/lib/utils/assets-storage";
import { AssetDetail } from "@/components/assets/asset-detail";

interface AssetPageProps {
  params: Promise<{
    id: string;
  }>;
}

// TODO: Convert to async server component and fetch from database
// async function getAsset(id: string) {
//   const asset = await db.query.assets.findFirst({
//     where: eq(assets.id, id),
//     with: {
//       uploader: true,
//       project: true,
//       likes: true,
//       comments: {
//         with: { user: true },
//         orderBy: desc(comments.createdAt)
//       }
//     }
//   });
//   return asset;
// }

export default async function AssetPage({ params }: AssetPageProps) {
  // Next.js 15+ requires awaiting params
  const { id } = await params;
  
  // Read assets from persistent storage
  const assets = readAssets();
  
  // Handle "copy" IDs from our mock data duplication trick
  const cleanId = id.replace(/-copy-\d+$/, '');
  
  // Find the asset by ID
  const asset = assets.find((a) => a.id === cleanId || a.id === id);

  if (!asset) {
    console.log(`[Asset Detail] Asset not found: ${id} (cleaned: ${cleanId})`);
    notFound();
  }
  
  console.log(`[Asset Detail] Found asset: ${asset.id} - ${asset.title}`);

  return <AssetDetail asset={asset} />;
}
