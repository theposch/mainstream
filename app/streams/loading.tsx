import { StreamsListSkeleton } from "@/components/streams/stream-list-skeleton";

export default function StreamsLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header row: tabs on left, New Stream button on right */}
      <div className="mb-8 flex items-center justify-between">
        {/* Left: Tabs skeleton */}
        <div className="flex items-center gap-1">
          <div className="h-9 w-28 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-24 bg-muted/50 rounded-full animate-pulse" />
        </div>
        
        {/* Right: Sort + New Stream button skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-muted/50 rounded-md animate-pulse border border-border" />
          <div className="h-9 w-32 bg-muted/50 rounded-md animate-pulse border border-border" />
        </div>
      </div>

      {/* Streams List skeleton */}
      <StreamsListSkeleton count={6} />
    </div>
  );
}
