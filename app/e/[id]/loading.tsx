export default function AssetLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto animate-pulse">
      {/* Asset image skeleton */}
      <div className="aspect-video w-full bg-muted rounded-xl mb-6" />

      {/* Title + meta row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-7 w-64 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-muted rounded-full" />
          <div className="h-9 w-9 bg-muted rounded-full" />
        </div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>

      {/* Comments section skeleton */}
      <div className="border-t border-border pt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
