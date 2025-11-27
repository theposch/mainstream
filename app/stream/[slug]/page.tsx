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
  // This prevents SQL injection and ensures clean URLs
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.log(`[Stream Page] Invalid slug format: ${slug}`);
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
    console.log(`[Stream Page] Stream not found: ${slug}`, streamError);
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
    console.log(`[Stream Page] Owner not found for stream: ${slug}`);
    notFound();
  }

  // Fetch assets via asset_streams junction table
  const { data: assetRelations } = await supabase
    .from('asset_streams')
    .select(`
      asset_id,
      added_at,
      assets (
        *,
        uploader:users!uploader_id(*)
      )
    `)
    .eq('stream_id', stream.id)
    .order('added_at', { ascending: false })
    .limit(50);

  // Extract assets from the junction table results
  const streamAssets = (assetRelations?.map(relation => relation.assets).filter(Boolean) || []) as any[];

  console.log(`[Stream Page] Found stream: ${stream.name} with ${streamAssets.length} assets`);

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

