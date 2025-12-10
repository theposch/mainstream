"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Stream } from "@/lib/types/database";
import { Lock, Globe, MoreHorizontal, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreamCardProps {
  stream: Stream & {
    assetsCount?: number;
    recentPosts?: Array<{
      id: string;
      url: string;
      title: string;
    }>;
  };
}

export const StreamCard = React.memo(function StreamCard({ stream }: StreamCardProps) {
  const assetsCount = stream.assetsCount ?? 0;

  return (
    <Link href={`/stream/${stream.name}`} className="group block space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-secondary border border-border group-hover:border-input transition-colors">
        {stream.recentPosts && stream.recentPosts.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
            {stream.recentPosts.slice(0, 4).map((post) => (
              <div key={post.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image
                  src={post.url}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 150px"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground/50">
            <Hash className="h-12 w-12" />
          </div>
        )}
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur-md">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white truncate pr-2">{stream.name}</h3>
          {stream.is_private ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {assetsCount} {assetsCount === 1 ? "asset" : "assets"}
        </p>
      </div>
    </Link>
  );
});

