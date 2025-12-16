export default function DropsLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header row: tabs on left, New button on right */}
      <div className="mb-8 flex items-end justify-between">
        {/* Left: Tabs skeleton */}
        <div className="flex items-center gap-1">
          <div className="h-9 w-24 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-24 bg-muted/50 rounded-full animate-pulse" />
          <div className="h-9 w-20 bg-muted/50 rounded-full animate-pulse" />
        </div>
        
        {/* Right: New button skeleton */}
        <div className="h-9 w-20 bg-muted/50 rounded-md animate-pulse border border-border" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-card/50 rounded-xl border border-border overflow-hidden"
          >
            <div className="p-4">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted/50 rounded animate-pulse mt-3" />
              <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse mt-2" />
              <div className="flex items-center gap-2 mt-4">
                <div className="h-4 w-4 bg-muted rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="flex gap-1.5">
                <div className="flex-1 aspect-[4/3] bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 aspect-[4/3] bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 aspect-[4/3] bg-muted rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
