"use client";

import * as React from "react";
import Masonry from "react-masonry-css";
import type { Asset } from "@/lib/types/database";
import { ElementCard } from "./element-card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AssetCardErrorFallback } from "./asset-card-error";
import { MASONRY_BREAKPOINTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface MasonryGridProps {
  assets: Asset[];
  className?: string;
  isLoading?: boolean;
  /** Layout mode: 'grid' (default) has overlay metadata, 'detailed' has metadata below */
  layout?: "grid" | "detailed";
  /** Callback when like status changes on any card */
  onLikeChange?: (assetId: string, isLiked: boolean) => void;
  /** Callback when an asset card is clicked - for modal overlay mode */
  onAssetClick?: (asset: Asset) => void;
}

export const MasonryGrid = React.memo(function MasonryGrid({ 
  assets, 
  className, 
  isLoading = false,
  layout = "grid",
  onLikeChange,
  onAssetClick
}: MasonryGridProps) {

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <ImageOff className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">No assets to display</p>
        <p className="text-sm text-muted-foreground/60 mt-2">Start by creating a new project or uploading assets</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={MASONRY_BREAKPOINTS}
      className={cn("flex w-full -ml-6", className)}
      columnClassName="pl-6 bg-clip-padding"
    >
      {assets.map((asset) => (
        <ErrorBoundary 
          key={asset.id}
          fallback={(error, reset) => (
            <AssetCardErrorFallback
              className="mb-6"
              error={error}
              onRetry={reset}
            />
          )}
        >
          <ElementCard 
            asset={asset} 
            className="mb-6" 
            layout={layout}
            onLikeChange={onLikeChange}
            onClick={onAssetClick}
          />
        </ErrorBoundary>
      ))}
    </Masonry>
  );
});
