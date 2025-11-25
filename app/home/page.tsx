// TODO: Replace all mock data imports with API calls and database queries
import { DashboardFeed } from "@/components/dashboard/feed";
import { unstable_noStore as noStore } from 'next/cache';
import { Asset } from "@/lib/mock-data/assets";

// TODO: Remove this duplication trick and implement pagination
// Fetch assets from API: GET /api/assets?page=1&limit=50

// Fetch assets from API to get latest including newly uploaded ones
async function getAssets(): Promise<Asset[]> {
  try {
    console.log('[HomePage] Fetching assets from API...');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // Add timestamp to bust any caching
    const timestamp = Date.now();
    const response = await fetch(`${baseUrl}/api/assets?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch assets');
    }
    
    const data = await response.json();
    console.log(`[HomePage] Received ${data.assets?.length || 0} assets from API`);
    return data.assets || [];
  } catch (error) {
    console.error('[HomePage] Error fetching assets:', error);
    // Fallback to empty array on error
    return [];
  }
}

// TODO: Add session/auth handling
// const session = await getServerSession();
// const assets = await fetchUserFeed(session.user.id);

export default async function HomePage() {
  // Opt out of caching to show newly uploaded assets
  noStore();
  
  // Fetch fresh assets from API (includes newly uploaded ones)
  const assets = await getAssets();
  
  // Duplicate for demo purposes (masonry grid needs more items)
  const allAssets = [
    ...assets,
    ...assets.map(a => ({ ...a, id: a.id + '-copy-1' })),
    ...assets.map(a => ({ ...a, id: a.id + '-copy-2' })),
  ];

  return (
    <div className="w-full">
      <DashboardFeed initialAssets={allAssets} />
    </div>
  );
}
