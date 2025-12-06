export default function PeopleLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header Skeleton */}
      <div className="pt-10 pb-8 space-y-6">
        <div className="space-y-3">
          <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-6 w-96 max-w-full bg-muted/50 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-full max-w-md bg-muted/30 rounded-lg animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Shots skeleton */}
            <div className="grid grid-cols-5 gap-0.5 p-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="aspect-[4/3] bg-muted animate-pulse"
                />
              ))}
            </div>

            {/* User info skeleton */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
                </div>
                <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="flex gap-1.5 mt-3">
                <div className="h-6 w-16 bg-muted/30 animate-pulse rounded-md" />
                <div className="h-6 w-20 bg-muted/30 animate-pulse rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

