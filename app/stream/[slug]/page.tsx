import { notFound } from "next/navigation";
// TODO: Replace with database queries
import { teams } from "@/lib/mock-data/teams";
import { users } from "@/lib/mock-data/users";
import { readAssets } from "@/lib/utils/assets-storage";
import { assetStreams } from "@/lib/mock-data/streams";
import { StreamHeader } from "@/components/streams/stream-header";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { getStreamBySlug } from "@/lib/utils/stream-storage";

interface StreamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// TODO: Convert to async server component and fetch from database
// async function getStream(streamSlug: string) {
//   const stream = await db.query.streams.findFirst({
//     where: eq(streams.name, streamSlug),
//     with: {
//       owner: true,
//       members: true,
//       assets: {
//         orderBy: desc(assets.createdAt),
//         limit: 50
//       }
//     }
//   });
//   
//   // Check authorization - user must have access to this stream
//   // if (!canAccessStream(session.user.id, stream)) {
//   //   return unauthorized();
//   // }
//   
//   return stream;
// }

export default async function StreamPage({ params }: StreamPageProps) {
  // Next.js 15+ requires awaiting params
  const { slug } = await params;
  
  // TODO: Replace with: const stream = await getStream(slug);
  const stream = getStreamBySlug(slug);

  if (!stream) {
    notFound();
  }

  // TODO: Replace with database join/query
  const owner = stream.ownerType === 'team' 
    ? teams.find(t => t.id === stream.ownerId) 
    : users.find(u => u.id === stream.ownerId);
  
  if (!owner) {
     return notFound();
  }

  // TODO: Replace with database query using many-to-many relationship
  // Read assets from persistent storage and filter for this stream
  const allAssets = readAssets();
  
  // Get asset IDs that belong to this stream from the many-to-many table
  const streamAssetIds = assetStreams
    .filter((as) => as.streamId === stream.id)
    .map((as) => as.assetId);
  
  // Filter assets to only those in this stream
  const streamAssets = allAssets.filter(a => streamAssetIds.includes(a.id));

  // TODO: Remove duplication and implement pagination
  // const { data: streamAssets, hasMore } = await fetchStreamAssets(stream.id, { page: 1 });
  const displayAssets = [
      ...streamAssets,
      ...streamAssets.map(a => ({...a, id: a.id + '-copy-1'})),
       ...streamAssets.map(a => ({...a, id: a.id + '-copy-2'})),
  ];

  return (
    <div className="w-full min-h-screen">
      <StreamHeader stream={stream} owner={owner} />
      
      <div className="mt-8">
        <MasonryGrid assets={displayAssets} />
      </div>
    </div>
  );
}

