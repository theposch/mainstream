// TODO: Replace with database queries
import { streams } from "@/lib/mock-data/streams";
import { assets } from "@/lib/mock-data/assets";
import { assetStreams } from "@/lib/mock-data/streams";
import { StreamsGrid, StreamGridData } from "@/components/streams/streams-grid";

// TODO: Convert to async server component with real API calls
// async function getStreamsData() {
//   // GET /api/streams - Fetch all accessible streams
//   const response = await fetch('/api/streams', {
//     headers: { Authorization: `Bearer ${session.token}` }
//   });
//   
//   const streams = await response.json();
//   
//   // For each stream, fetch stats and recent posts
//   const enrichedStreams = await Promise.all(
//     streams.map(async (stream) => {
//       // GET /api/streams/:id/assets?limit=4
//       const posts = await fetch(`/api/streams/${stream.id}/assets?limit=4`).then(r => r.json());
//       
//       return {
//         ...stream,
//         assetsCount: posts.total,
//         recentPosts: posts.data,
//       };
//     })
//   );
//   
//   return enrichedStreams;
// }

export default function StreamsPage() {
  // TODO: Replace with: const streamsData = await getStreamsData();
  
  // Aggregate data for each stream
  const streamsData: StreamGridData[] = streams.map((stream) => {
    // Get all asset IDs for this stream from the many-to-many relationship
    const streamAssetIds = assetStreams
      .filter((as) => as.streamId === stream.id)
      .map((as) => as.assetId);
    
    // Get the actual assets
    const streamAssets = assets.filter((asset) => streamAssetIds.includes(asset.id));
    
    // Get recent 4 posts (assets) for this stream
    const recentPosts = streamAssets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((asset) => ({
        id: asset.id,
        url: asset.url,
        title: asset.title,
      }));
    
    return {
      ...stream,
      assetsCount: streamAssets.length,
      recentPosts: recentPosts,
    };
  });

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-12 space-y-3">
        <h1 className="text-4xl font-bold text-white">Streams</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Browse all streams and discover creative work across teams and individuals.
        </p>
      </div>

      {/* Streams Grid */}
      <StreamsGrid streams={streamsData} />
    </div>
  );
}

