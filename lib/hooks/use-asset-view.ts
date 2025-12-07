/**
 * Asset View Hook
 * 
 * Records that a user has viewed an asset after a 2-second threshold.
 * Uses fire-and-forget pattern to avoid blocking UI.
 * 
 * Usage:
 * ```tsx
 * // Just call the hook - it handles everything
 * useAssetView(assetId);
 * ```
 */

"use client";

import { useEffect, useRef } from "react";

const VIEW_THRESHOLD_MS = 2000; // 2 seconds

/**
 * Records an asset view after user has been viewing for 2+ seconds.
 * 
 * - Automatically cleans up if component unmounts before threshold
 * - Uses keepalive to ensure request completes even on navigation
 * - Fire-and-forget: doesn't block UI or return status
 * 
 * @param assetId - The ID of the asset being viewed
 * @param enabled - Whether to track views (default true)
 */
export function useAssetView(assetId: string, enabled: boolean = true): void {
  const hasRecordedRef = useRef(false);
  // Track the assetId we've recorded for to detect changes
  const recordedAssetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset flag when viewing a different asset
    // This MUST happen before the skip check below
    if (assetId !== recordedAssetIdRef.current) {
      hasRecordedRef.current = false;
      recordedAssetIdRef.current = assetId;
    }

    // Skip if disabled or already recorded for this asset
    if (!enabled || !assetId || hasRecordedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      // Mark as recorded to prevent duplicate calls
      hasRecordedRef.current = true;

      // Fire-and-forget: don't await, use keepalive for reliability
      fetch(`/api/assets/${assetId}/view`, {
        method: 'POST',
        keepalive: true, // Ensures request completes even if user navigates away
      }).catch(() => {
        // Silently ignore errors - view tracking is non-critical
        // Reset flag so it can retry on next mount
        hasRecordedRef.current = false;
      });
    }, VIEW_THRESHOLD_MS);

    // Cleanup: cancel timer if unmounted before threshold
    return () => {
      clearTimeout(timer);
    };
  }, [assetId, enabled]);
}

