import { createClient } from "@/lib/supabase/server";
import { StreamGridData } from "@/components/streams/streams-grid";
import { StreamsPageClient } from "./streams-page-client";

export default async function StreamsPage() {
  const supabase = await createClient();
  
  // Get current user for following streams
  const { data: { user } } = await supabase.auth.getUser();

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

  // Fetch followed stream IDs for current user
  let followedStreamIds: string[] = [];
  if (user) {
    const { data: followData } = await supabase
      .from('stream_follows')
      .select('stream_id')
      .eq('user_id', user.id);
    
    followedStreamIds = (followData || []).map(f => f.stream_id);
  }

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

  // Filter to get only followed streams
  const followingStreams = streamsData.filter(stream => 
    followedStreamIds.includes(stream.id)
  );

  return (
    <StreamsPageClient 
      allStreams={streamsData} 
      followingStreams={followingStreams} 
    />
  );
}
