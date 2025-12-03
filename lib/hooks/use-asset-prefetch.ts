/**
 * Asset Prefetch Hook
 * 
 * Provides hover-based prefetching for asset detail data.
 * Uses a debounced approach to avoid unnecessary prefetches on quick mouse movements.
 * 
 * Usage:
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = useAssetPrefetch(asset.id);
 * 
 * <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   ...
 * </div>
 * ```
 */

"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAssetData } from "@/lib/queries/asset-queries";

interface UseAssetPrefetchReturn {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const PREFETCH_DELAY_MS = 150; // Wait 150ms before prefetching to avoid unnecessary requests

export function useAssetPrefetch(assetId: string): UseAssetPrefetchReturn {
  const queryClient = useQueryClient();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const onMouseEnter = React.useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to prefetch after delay
    timeoutRef.current = setTimeout(() => {
      prefetchAssetData(queryClient, assetId);
    }, PREFETCH_DELAY_MS);
  }, [queryClient, assetId]);

  const onMouseLeave = React.useCallback(() => {
    // Cancel pending prefetch if mouse leaves before delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { onMouseEnter, onMouseLeave };
}

