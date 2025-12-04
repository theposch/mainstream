export default function DropsLoading() {
  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header skeleton */}
      <div className="pt-10 pb-8 flex items-start justify-between gap-4">
        <div>
          <div className="h-10 w-32 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-6 w-64 bg-zinc-800/50 rounded-lg animate-pulse mt-3" />
        </div>
        <div className="h-10 w-28 bg-zinc-800 rounded-lg animate-pulse" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-2">
        <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
        <div className="h-5 w-16 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-5 w-20 bg-zinc-800/50 rounded animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden"
          >
            <div className="p-4">
              <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-full bg-zinc-800/50 rounded animate-pulse mt-3" />
              <div className="h-4 w-2/3 bg-zinc-800/50 rounded animate-pulse mt-2" />
              <div className="flex items-center gap-2 mt-4">
                <div className="h-4 w-4 bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="flex gap-1.5">
                <div className="flex-1 aspect-[4/3] bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex-1 aspect-[4/3] bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex-1 aspect-[4/3] bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

