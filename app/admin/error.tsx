"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin panel error:", error);
  }, [error]);

  return (
    <div className="w-full flex items-center justify-center py-24">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Admin error</h1>
          <p className="text-muted-foreground">
            Something went wrong in the admin panel.
          </p>
          {error.message && (
            <p className="text-sm font-mono bg-secondary/50 p-3 rounded-lg text-muted-foreground/70">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button asChild variant="outline">
            <Link href="/home">Go Home</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
