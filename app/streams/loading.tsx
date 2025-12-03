export default function StreamsLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header skeleton */}
      <div className="pt-10 pb-12 space-y-3">
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        <div className="h-6 w-96 max-w-full bg-muted rounded animate-pulse" />
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

