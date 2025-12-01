import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StreamHeader } from "@/components/streams/stream-header";
import { MasonryGrid } from "@/components/assets/masonry-grid";

interface StreamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StreamPage({ params }: StreamPageProps) {
  const { slug } = await params;
  
  // Validate slug format - only allow lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }
  
  const supabase = await createClient();

  // Fetch stream by slug (name field)
  const { data: stream, error: streamError } = await supabase
    .from('streams')
    .select('*')
    .eq('name', slug)
    .single();

  if (streamError || !stream) {
    notFound();
  }

  // Fetch owner (user or team)
  let owner = null;
  if (stream.owner_type === 'user') {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', stream.owner_id)
      .single();
    owner = userData;
  } else if (stream.owner_type === 'team') {
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', stream.owner_id)
      .single();
    owner = teamData;
  }

  if (!owner) {
    notFound();
  }

  // Fetch assets via asset_streams junction table (with like counts)
  // Note: Like status is verified client-side for reliability
  const { data: assetRelations } = await supabase
    .from('asset_streams')
    .select(`
      asset_id,
      added_at,
      assets (
        *,
        uploader:users!uploader_id(*),
        asset_likes(count)
      )
    `)
    .eq('stream_id', stream.id)
    .order('added_at', { ascending: false })
    .limit(50);

  // Extract and transform assets with like count
  const streamAssets = (assetRelations?.map(relation => {
    const asset = relation.assets as any;
    if (!asset) return null;
    return {
      ...asset,
      likeCount: asset.asset_likes?.[0]?.count || 0,
      asset_likes: undefined,
    };
  }).filter(Boolean) || []) as any[];

  return (
    <div className="w-full min-h-screen">
      <StreamHeader stream={stream} owner={owner} />
      
      <div className="mt-8">
        {streamAssets.length > 0 ? (
          <MasonryGrid assets={streamAssets} />
        ) : (
          <div className="text-center py-20">
            <p className="text-lg font-medium text-muted-foreground">No assets in this stream yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Assets will appear here when added to the stream.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

