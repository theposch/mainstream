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
        
        {/* Right: New Stream button skeleton */}
        <div className="h-9 w-32 bg-muted/50 rounded-md animate-pulse border border-border" />
      </div>

      {/* Streams Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
            {/* Image grid skeleton */}
            <div className="grid grid-cols-2 gap-0.5 p-0.5 aspect-[4/3] bg-muted" />
            {/* Info skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
