"use client";

import * as React from "react";
import Masonry from "react-masonry-css";
import { motion } from "framer-motion";
import type { Asset } from "@/lib/types/database";
import { ElementCard } from "./element-card";
import { LoadingSpinner } from "@/components/ui/loading";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AssetCardErrorFallback } from "./asset-card-error";
import { MASONRY_BREAKPOINTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ImageOff, Loader2 } from "lucide-react";

// Pulsing skeleton card shown while an upload is in progress.
// Sits at the top of the first masonry column with the preview image visible.
function UploadSkeletonCard({ preview }: { preview: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-6 rounded-xl overflow-hidden relative"
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full block opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px]">
            <Loader2 className="h-7 w-7 animate-spin text-foreground/60" />
          </div>
        </>
      ) : (
        <div className="aspect-[4/3] animate-pulse bg-muted flex items-center justify-center rounded-xl">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

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
  // null = idle, { preview } = uploading
  const [uploadState, setUploadState] = React.useState<{ preview: string | null } | null>(null);

  React.useEffect(() => {
    const handleUploadStart = (e: Event) => {
      const preview = (e as CustomEvent<{ preview: string | null }>).detail?.preview ?? null;
      setUploadState({ preview });
    };
    const handleAssetUploaded = () => setUploadState(null);

    window.addEventListener('upload-start', handleUploadStart);
    window.addEventListener('asset-uploaded', handleAssetUploaded);
    return () => {
      window.removeEventListener('upload-start', handleUploadStart);
      window.removeEventListener('asset-uploaded', handleAssetUploaded);
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!assets || assets.length === 0) {
    if (!uploadState) {
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
    // Show a standalone skeleton while the first-ever upload processes
    return (
      <div className="max-w-xs">
        <UploadSkeletonCard preview={uploadState.preview} />
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={MASONRY_BREAKPOINTS}
      className={cn("flex w-full -ml-6", className)}
      columnClassName="pl-6 bg-clip-padding"
    >
      {uploadState && (
        <UploadSkeletonCard key="__upload-skeleton__" preview={uploadState.preview} />
      )}
      {assets.map((asset, index) => (
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
            priority={index < 8}
          />
        </ErrorBoundary>
      ))}
    </Masonry>
  );
});
