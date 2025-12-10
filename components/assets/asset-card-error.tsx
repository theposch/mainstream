"use client";

/**
 * Asset Card Error Fallback
 * 
 * Graceful error state for ElementCard when rendering fails.
 * Maintains grid layout and provides useful feedback.
 */

import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AssetCardErrorFallbackProps {
  className?: string;
  error?: Error;
  onRetry?: () => void;
}

export function AssetCardErrorFallback({
  className,
  error,
  onRetry,
}: AssetCardErrorFallbackProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border border-border bg-card",
        "flex flex-col items-center justify-center p-6 text-center",
        "aspect-[4/3]",
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Unable to load</p>
          {process.env.NODE_ENV === 'development' && error && (
            <p className="text-xs text-muted-foreground/70 max-w-[200px] truncate">
              {error.message}
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

