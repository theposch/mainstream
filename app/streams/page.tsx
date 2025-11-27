import { createClient } from "@/lib/supabase/server";
import { StreamsGrid, StreamGridData } from "@/components/streams/streams-grid";

export default async function StreamsPage() {
  const supabase = await createClient();

  // Fetch all active streams
  const { data: streams, error } = await supabase
    .from('streams')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Streams Page] Error fetching streams:', error);
  }

  const allStreams = streams || [];

  // Enrich each stream with asset count and recent posts
  const streamsData: StreamGridData[] = await Promise.all(
    allStreams.map(async (stream) => {
      // Get asset count for this stream
      const { count: assetsCount } = await supabase
        .from('asset_streams')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', stream.id);

      // Get 4 most recent assets
      const { data: assetRelations } = await supabase
        .from('asset_streams')
        .select(`
          assets (
            id,
            url,
            thumbnail_url,
            title
          )
        `)
        .eq('stream_id', stream.id)
        .order('added_at', { ascending: false })
        .limit(4);

      const recentPosts = assetRelations?.map((rel: any) => ({
        id: rel.assets?.id || '',
        url: rel.assets?.thumbnail_url || rel.assets?.url || '',
        title: rel.assets?.title || '',
      })).filter(post => post.id) || [];

      return {
        ...stream,
        assetsCount: assetsCount || 0,
        recentPosts,
      };
    })
  );

  console.log(`[Streams Page] Loaded ${streamsData.length} streams from database`);

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

