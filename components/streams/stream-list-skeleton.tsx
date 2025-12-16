"use client";

import { Skeleton } from "@/components/ui/skeleton";

function StreamListItemSkeleton() {
  return (
    <div className="flex flex-row items-center gap-4 lg:gap-6 py-6 lg:py-8">
      {/* Left: Stream Info Skeleton */}
      <div className="flex-shrink-0 min-w-0 flex-1 lg:flex-none lg:w-[320px] xl:w-[360px] space-y-2 lg:space-y-3">
        {/* Stream name */}
        <Skeleton className="h-5 lg:h-7 w-32 lg:w-48" />
        
        {/* Post count */}
        <Skeleton className="h-3 lg:h-4 w-16" />
        
        {/* Description - hidden on mobile */}
        <Skeleton className="hidden lg:block h-4 w-full" />
        <Skeleton className="hidden lg:block h-4 w-3/4" />
        
        {/* Contributors skeleton */}
        <div className="hidden lg:flex items-center gap-1 pt-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full -ml-2" />
          <Skeleton className="h-6 w-6 rounded-full -ml-2" />
        </div>
        
        {/* Follow button */}
        <Skeleton className="h-7 lg:h-9 w-20 lg:w-24 mt-1 lg:mt-2" />
      </div>

      {/* Right: Preview Images Skeleton */}
      <div className="flex-shrink-0 lg:flex-1 lg:min-w-0">
        <div className="flex gap-2 lg:gap-3 lg:justify-end">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 lg:w-[160px] xl:w-[180px] lg:h-auto lg:aspect-[4/3] rounded-lg" />
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 lg:w-[160px] xl:w-[180px] lg:h-auto lg:aspect-[4/3] rounded-lg" />
          <Skeleton className="hidden lg:block lg:w-[160px] xl:w-[180px] lg:aspect-[4/3] rounded-lg" />
          <Skeleton className="hidden lg:block lg:w-[160px] xl:w-[180px] lg:aspect-[4/3] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface StreamsListSkeletonProps {
  count?: number;
}

export function StreamsListSkeleton({ count = 5 }: StreamsListSkeletonProps) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <StreamListItemSkeleton key={i} />
      ))}
    </div>
  );
}

