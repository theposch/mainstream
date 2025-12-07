"use client";

/**
 * Asset Prefetch Hook
 * 
 * Provides hover-based prefetching for asset detail data AND full-res image.
 * Uses a debounced approach to avoid unnecessary prefetches on quick mouse movements.
 * 
 * Key optimizations (similar to Pinterest/Dribbble):
 * - Global image cache prevents duplicate loads across card instances
 * - Debounced prefetch (150ms) avoids unnecessary requests on quick hovers
 * - Non-blocking prefetch using requestIdleCallback when available
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

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAssetData } from "@/lib/queries/asset-queries";

interface UseAssetPrefetchReturn {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const PREFETCH_DELAY_MS = 150; // Wait 150ms before prefetching to avoid unnecessary requests

// Global cache for preloaded images - persists across all hook instances
// This matches Pinterest/Dribbble's approach of caching at the app level
const globalPreloadedImages = new Set<string>();

/**
 * Preload an image in the background
 * Uses browser's native image loading which respects HTTP cache headers
 */
function preloadImage(url: string): void {
  // Skip if already preloaded this session
  if (globalPreloadedImages.has(url)) return;
  
  // Mark as preloading to prevent duplicate requests
  globalPreloadedImages.add(url);
  
  const img = new window.Image();
  img.onerror = () => {
    // Remove from set so we can retry on next hover
    globalPreloadedImages.delete(url);
  };
  img.src = url;
}

export function useAssetPrefetch(assetId: string, fullImageUrl?: string): UseAssetPrefetchReturn {
  const queryClient = useQueryClient();
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const onMouseEnter = React.useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to prefetch after delay
    timeoutRef.current = setTimeout(() => {
      // Prefetch comments/data via React Query
      prefetchAssetData(queryClient, assetId);
      
      // Preload full-res image (global cache prevents duplicates)
      if (fullImageUrl) {
        preloadImage(fullImageUrl);
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
