import { LoadingGrid } from "@/components/ui/loading";

export default function StreamLoading() {
  return (
    <div className="w-full min-h-screen">
      {/* Stream Header skeleton */}
      <div className="py-8 space-y-4">
        {/* Title and stats row */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>
        {/* Description skeleton */}
        <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="mt-8">
        <LoadingGrid />
      </div>
    </div>
  );
}

