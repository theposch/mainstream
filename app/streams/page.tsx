import { createClient } from "@/lib/supabase/server";
import { StreamListData } from "@/components/streams/streams-list";
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

  // Single batch query: get all asset relations for all streams at once (with uploader info)
  const assetRelationsMap = new Map<string, { count: number; posts: any[]; contributorIds: Set<string>; contributors: any[] }>();
  
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
          title,
          uploader_id
        )
      `)
      .in('stream_id', streamIds)
      .order('added_at', { ascending: false });

    // Group results by stream_id (O(n) instead of O(n*m) queries)
    streamIds.forEach(id => assetRelationsMap.set(id, { count: 0, posts: [], contributorIds: new Set(), contributors: [] }));
    
    // Collect all unique uploader IDs
    const allUploaderIds = new Set<string>();
    
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
        // Track unique contributors
        if (rel.assets?.uploader_id) {
          entry.contributorIds.add(rel.assets.uploader_id);
          allUploaderIds.add(rel.assets.uploader_id);
        }
      }
    });

    // Batch fetch all contributor user data
    if (allUploaderIds.size > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', Array.from(allUploaderIds));

      const usersMap = new Map((users || []).map(u => [u.id, u]));

      // Assign contributors to each stream
      assetRelationsMap.forEach((entry) => {
        entry.contributors = Array.from(entry.contributorIds)
          .map(id => usersMap.get(id))
          .filter(Boolean)
          .slice(0, 5); // Limit to 5 contributors
      });
    }
  }

  // Fetch follower counts for all streams
  const followerCountsMap = new Map<string, number>();
  if (streamIds.length > 0) {
    const { data: followerCounts } = await supabase
      .from('stream_follows')
      .select('stream_id')
      .in('stream_id', streamIds);
    
    // Count followers per stream
    (followerCounts || []).forEach((f: any) => {
      followerCountsMap.set(f.stream_id, (followerCountsMap.get(f.stream_id) || 0) + 1);
    });
  }

  // Build enriched streams using the pre-fetched data
  const streamsData: StreamListData[] = allStreams.map(stream => {
    const data = assetRelationsMap.get(stream.id) || { count: 0, posts: [], contributors: [] };
    return {
      ...stream,
      assetsCount: data.count,
      recentPosts: data.posts,
      contributors: data.contributors,
      followerCount: followerCountsMap.get(stream.id) || 0,
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
