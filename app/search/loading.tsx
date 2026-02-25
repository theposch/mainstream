import { LoadingGrid } from "@/components/ui/loading";

export default function SearchLoading() {
  return (
    <div className="w-full">
      {/* Search header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-muted/50 rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted/50 rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
      <LoadingGrid />
    </div>
  );
}
