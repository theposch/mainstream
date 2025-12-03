/**
 * Asset Prefetch Hook
 * 
 * Provides hover-based prefetching for asset detail data AND full-res image.
 * Uses a debounced approach to avoid unnecessary prefetches on quick mouse movements.
 * 
 * Usage:
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = useAssetPrefetch(asset.id, asset.url);
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

/**
 * Preload an image in the background
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to preload image'));
    img.src = url;
  });
}

export function useAssetPrefetch(assetId: string, fullImageUrl?: string): UseAssetPrefetchReturn {
  const queryClient = useQueryClient();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const preloadedRef = React.useRef<Set<string>>(new Set());

  const onMouseEnter = React.useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to prefetch after delay
    timeoutRef.current = setTimeout(() => {
      // Prefetch comments/data
      prefetchAssetData(queryClient, assetId);
      
      // Preload full-res image if provided and not already preloaded
      if (fullImageUrl && !preloadedRef.current.has(fullImageUrl)) {
        preloadedRef.current.add(fullImageUrl);
        preloadImage(fullImageUrl).catch(() => {
          // Remove from set so we can retry
          preloadedRef.current.delete(fullImageUrl);
        });
      }
    }, PREFETCH_DELAY_MS);
  }, [queryClient, assetId, fullImageUrl]);

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
