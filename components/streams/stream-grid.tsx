"use client";

import { Stream } from "@/lib/mock-data/streams";
import { StreamCard } from "./stream-card";
import { Hash } from "lucide-react";

interface StreamGridProps {
  streams: Stream[];
}

export function StreamGrid({ streams }: StreamGridProps) {
  if (!streams || streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <Hash className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">No streams found</p>
        <p className="text-sm text-muted-foreground/60 mt-2">Create your first stream to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}

