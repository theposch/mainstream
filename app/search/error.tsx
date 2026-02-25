"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Search error:", error);
  }, [error]);

  return (
    <div className="w-full flex items-center justify-center py-24">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Search failed</h1>
          <p className="text-muted-foreground">
            Something went wrong while searching. Please try again.
          </p>
        </div>
        <Button onClick={reset}>Try Again</Button>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
