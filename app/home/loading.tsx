import { LoadingGrid } from "@/components/ui/loading";

export default function HomeLoading() {
  return (
    <div className="w-full">
      {/* Header row: week info on left, tabs + layout toggle on right */}
      <div className="mb-6 flex items-center justify-between">
        {/* Left: Week info skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="flex -space-x-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse border-2 border-background" />
            ))}
          </div>
        </div>
        
        {/* Right: Tabs + layout toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-9 w-20 bg-muted rounded-full animate-pulse" />
            <div className="h-9 w-24 bg-muted/50 rounded-full animate-pulse" />
          </div>
          <div className="hidden md:flex items-center gap-1">
            <div className="h-8 w-8 bg-muted/50 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-muted/50 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Grid skeleton */}
      <LoadingGrid />
    </div>
  );
}
