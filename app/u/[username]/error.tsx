"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for user profile pages.
 * Catches and displays errors gracefully with recovery options.
 * 
 * @param error - The error that was caught
 * @param reset - Function to attempt recovery by re-rendering
 */
export default function UserProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to error reporting service
    console.error('User profile error:', error);
  }, [error]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an error while loading this profile.
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground/70 font-mono bg-secondary/50 p-3 rounded-lg mt-4">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="cosmos"
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href="/home">Go Home</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

