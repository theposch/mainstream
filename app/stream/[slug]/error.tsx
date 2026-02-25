"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StreamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Stream page error:", error);
  }, [error]);

  return (
    <div className="w-full flex items-center justify-center py-24">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Couldn&apos;t load stream</h1>
          <p className="text-muted-foreground">
            There was a problem loading this stream.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button asChild variant="outline">
            <Link href="/streams">All Streams</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
