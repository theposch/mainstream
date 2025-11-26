// TODO: Replace with database queries and implement real discovery/search
import { streams } from "@/lib/mock-data/streams";
import { readAssets } from "@/lib/utils/assets-storage";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Featured", "Graphic Design", "Art", "UI/UX", "Interior Design", "Typography", "Nature", "Fashion", "Architecture"
];

// TODO: Convert to async server component
// async function getFeaturedContent(category?: string) {
//   // Fetch featured streams and trending assets from database
//   // GET /api/discover/featured
//   // GET /api/discover/trending?category={category}
//   // Implement category filtering
//   return { featuredStreams, trendingAssets };
// }

export default function LibraryPage() {
  // TODO: Replace with real featured streams from database
  // Based on criteria like: most saves, most views, editor picks, etc.
  const featuredStreams = streams.slice(0, 4);
  
  // Read assets from persistent storage
  const assets = readAssets();

  return (
    <div className="w-full min-h-screen space-y-12">
       {/* Categories */}
       {/* TODO: Fetch categories from database or config
           - GET /api/categories
           - Track active category in state
           - Filter content based on selected category
           - Implement category click handler to filter below content
       */}
       <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {CATEGORIES.map((cat, i) => (
              <Button 
                key={cat} 
                variant={i === 0 ? "secondary" : "ghost"} 
                className={`rounded-full whitespace-nowrap ${i === 0 ? "bg-white text-black hover:bg-zinc-200" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
              >
                  {cat}
              </Button>
          ))}
       </div>

       {/* Featured Streams */}
       {/* TODO: Fetch real featured streams
           - GET /api/streams/featured
           - Show based on admin curation or algorithm
           - Update when category filter changes
       */}
       <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-white">Featured Streams</h2>
             <Button variant="link" className="text-zinc-400 hover:text-white">View all</Button>
          </div>
          <StreamGrid streams={featuredStreams} />
       </div>

       {/* Trending Elements */}
       {/* TODO: Fetch trending assets
           - GET /api/assets/trending?timeframe=7d
           - Based on recent likes, saves, views
           - Implement pagination or infinite scroll
           - Filter by category if selected
       */}
       <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Trending Elements</h2>
          <MasonryGrid assets={assets} />
       </div>
    </div>
  );
}
