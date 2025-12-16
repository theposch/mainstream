import { LoadingGrid } from "@/components/ui/loading";

export default function UserProfileLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Profile Header skeleton */}
      <div className="flex flex-col items-center pt-10 pb-8 space-y-4">
        {/* Avatar skeleton */}
        <div className="h-32 w-32 rounded-full bg-muted animate-pulse" />
        {/* Name skeleton */}
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {/* Username skeleton */}
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        {/* Stats skeleton */}
        <div className="flex gap-8 mt-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Tabs skeleton - left aligned pill buttons */}
      <div className="flex mb-10">
        <div className="flex items-center gap-1">
          <div className="h-9 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-9 w-24 bg-muted/50 rounded-full animate-pulse" />
          <div className="h-9 w-20 bg-muted/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Grid skeleton */}
      <LoadingGrid />
    </div>
  );
}
