import { LoadingGrid } from "@/components/ui/loading";

export default function HomeLoading() {
  return (
    <div className="w-full">
      {/* Feed tabs skeleton */}
      <div className="flex justify-center w-full mb-8">
        <div className="flex p-1 bg-muted/80 rounded-full border border-border">
          <div className="px-6 py-2 rounded-full bg-secondary w-20 h-9" />
          <div className="px-6 py-2 rounded-full w-24 h-9" />
        </div>
      </div>
      
      {/* Grid skeleton */}
      <LoadingGrid />
    </div>
  );
}

