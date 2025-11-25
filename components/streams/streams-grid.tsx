"use client";

import * as React from "react";
import { StreamCard } from "./stream-card";
import { Stream } from "@/lib/mock-data/streams";

export interface StreamGridData extends Stream {
  assetsCount: number;
  recentPosts: Array<{
    id: string;
    url: string;
    title: string;
  }>;
}

interface StreamsGridProps {
  streams: StreamGridData[];
}

export const StreamsGrid = React.memo(function StreamsGrid({ streams }: StreamsGridProps) {
  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-muted-foreground">No streams found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Streams will appear here once they're created.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
});

