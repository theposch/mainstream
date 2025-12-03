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

      {/* Tabs skeleton */}
      <div className="flex justify-center mb-10">
        <div className="flex gap-1 p-1 bg-muted/80 rounded-full">
          <div className="px-6 py-2 rounded-full bg-secondary w-20 h-9" />
          <div className="px-6 py-2 rounded-full w-24 h-9" />
          <div className="px-6 py-2 rounded-full w-20 h-9" />
        </div>
      </div>

      {/* Grid skeleton */}
      <LoadingGrid />
    </div>
  );
}

