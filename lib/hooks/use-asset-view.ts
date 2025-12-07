/**
 * Asset View Hook
 * 
 * Records that a user has viewed an asset after a configurable threshold.
 * Uses fire-and-forget pattern to avoid blocking UI.
 * 
 * Features:
 * - Debounced: only records after user has viewed for 2+ seconds
 * - Idempotent: safe to call multiple times, server handles deduplication
 * - Resilient: uses keepalive to complete even on navigation
 * - Retry-limited: won't spam server on repeated failures
 * 
 * Usage:
 * ```tsx
 * // Track views for an asset (disabled for owner)
 * useAssetView(assetId, !isOwner);
 * ```
 */

"use client";

import { useEffect, useRef } from "react";

/** Time user must view asset before recording (milliseconds) */
const VIEW_THRESHOLD_MS = 2000;

/** Maximum retry attempts on failure */
const MAX_RETRIES = 2;

/**
 * Records an asset view after user has been viewing for threshold duration.
 * 
 * @param assetId - The ID of the asset being viewed
 * @param enabled - Whether to track views (set false for owner viewing own asset)
 */
export function useAssetView(assetId: string, enabled: boolean = true): void {
  // Track state across renders without causing re-renders
  const stateRef = useRef({
    hasRecorded: false,
    retryCount: 0,
    lastAssetId: '',
  });

  useEffect(() => {
    // Reset state when viewing a different asset
    if (stateRef.current.lastAssetId !== assetId) {
      stateRef.current = {
        hasRecorded: false,
        retryCount: 0,
        lastAssetId: assetId,
      };
    }

    // Skip if disabled, no asset ID, already recorded, or max retries exceeded
    if (
      !enabled || 
      !assetId || 
      stateRef.current.hasRecorded || 
      stateRef.current.retryCount >= MAX_RETRIES
    ) {
      return;
    }

    const timer = setTimeout(() => {
      // Mark as recorded optimistically to prevent duplicate calls
      stateRef.current.hasRecorded = true;

      // Fire-and-forget with keepalive for reliability
      fetch(`/api/assets/${assetId}/view`, {
        method: 'POST',
        credentials: 'include', // Ensure auth cookies are sent
        keepalive: true, // Complete request even if user navigates away
      })
        .then(async (response) => {
          if (!response.ok) {
            // Server error - allow limited retries
            stateRef.current.hasRecorded = false;
            stateRef.current.retryCount++;
          }
          // Success or 4xx client error - don't retry
        })
        .catch(() => {
          // Network error - allow limited retries
          stateRef.current.hasRecorded = false;
          stateRef.current.retryCount++;
        });
    }, VIEW_THRESHOLD_MS);

    // Cleanup: cancel timer if unmounted before threshold
    return () => {
      clearTimeout(timer);
    };
  }, [assetId, enabled]);
}
