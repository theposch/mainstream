import { createClient } from "@/lib/supabase/server";
import { StreamsGrid, StreamGridData } from "@/components/streams/streams-grid";

export default async function StreamsPage() {
  const supabase = await createClient();

  // Fetch all active streams with asset relations in a SINGLE query
  // This eliminates the N+1 problem - previously we had O(n*2) queries, now O(1)
  const { data: streams, error } = await supabase
    .from('streams')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Streams Page] Error fetching streams:', error);
  }

  const allStreams = streams || [];
  const streamIds = allStreams.map(s => s.id);

  // Single batch query: get all asset relations for all streams at once
  let assetRelationsMap = new Map<string, { count: number; posts: any[] }>();
  
  if (streamIds.length > 0) {
    const { data: allAssetRelations } = await supabase
      .from('asset_streams')
      .select(`
        stream_id,
        added_at,
        assets (
          id,
          url,
          thumbnail_url,
          title
        )
      `)
      .in('stream_id', streamIds)
      .order('added_at', { ascending: false });

    // Group results by stream_id (O(n) instead of O(n*m) queries)
    streamIds.forEach(id => assetRelationsMap.set(id, { count: 0, posts: [] }));
    
    (allAssetRelations || []).forEach((rel: any) => {
      const entry = assetRelationsMap.get(rel.stream_id);
      if (entry) {
        entry.count++;
        // Only keep first 4 posts per stream
        if (entry.posts.length < 4 && rel.assets) {
          entry.posts.push({
            id: rel.assets.id || '',
            url: rel.assets.thumbnail_url || rel.assets.url || '',
            title: rel.assets.title || '',
          });
        }
      }
    });
  }

  // Build enriched streams using the pre-fetched data
  const streamsData: StreamGridData[] = allStreams.map(stream => {
    const data = assetRelationsMap.get(stream.id) || { count: 0, posts: [] };
    return {
      ...stream,
      assetsCount: data.count,
      recentPosts: data.posts,
    };
  });


  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-12 space-y-3">
        <h1 className="text-4xl font-bold text-foreground">Streams</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Browse all streams and discover creative work across teams and individuals.
        </p>
      </div>

      {/* Streams Grid */}
      {streamsData.length > 0 ? (
        <StreamsGrid streams={streamsData} />
      ) : (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">No streams yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first stream to get started.
          </p>
        </div>
      )}
    </div>
  );
}

