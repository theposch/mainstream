"use client";

import * as React from "react";
import { StreamListItem } from "./stream-list-item";
import type { Stream } from "@/lib/types/database";
import { Hash } from "lucide-react";

export interface StreamListData extends Stream {
  assetsCount: number;
  recentPosts: Array<{
    id: string;
    url: string;
    title: string;
  }>;
  contributors: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  followerCount: number;
}

interface StreamsListProps {
  streams: StreamListData[];
}

export const StreamsList = React.memo(function StreamsList({ streams }: StreamsListProps) {
  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <Hash className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">No streams found</p>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Streams will appear here once they&apos;re created.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {streams.map((stream) => (
        <StreamListItem key={stream.id} stream={stream} />
      ))}
    </div>
  );
});

