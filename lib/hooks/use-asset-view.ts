"use client";

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
 * - Retry with backoff: retries failed requests with exponential delay
 * - Optional callback: receive updated view count for UI updates
 * 
 * Usage:
 * ```tsx
 * // Track views for an asset (disabled for owner)
 * useAssetView(assetId, !isOwner);
 * 
 * // With callback to update UI
 * useAssetView(assetId, !isOwner, (newCount) => {
 *   setViewCount(newCount);
 * });
 * ```
 */

import { useEffect, useRef } from "react";

/** Time user must view asset before recording (milliseconds) */
const VIEW_THRESHOLD_MS = 2000;

/** Maximum retry attempts on failure */
const MAX_RETRIES = 2;

/** Base delay for retry backoff (milliseconds) */
const RETRY_BASE_DELAY_MS = 1000;

/** Callback type for view count updates */
export type ViewCountCallback = (newCount: number, isNewView: boolean) => void;

/**
 * Records an asset view after user has been viewing for threshold duration.
 * 
 * @param assetId - The ID of the asset being viewed
 * @param enabled - Whether to track views (set false for owner viewing own asset)
 * @param onViewRecorded - Optional callback called with updated view count when view is recorded
 */
export function useAssetView(
  assetId: string, 
  enabled: boolean = true,
  onViewRecorded?: ViewCountCallback
): void {
  // Store callback in ref to avoid effect re-runs when callback changes
  const callbackRef = useRef(onViewRecorded);
  callbackRef.current = onViewRecorded;

  useEffect(() => {
    // Skip if disabled or no asset ID
    if (!enabled || !assetId) {
      return;
    }

    let isCancelled = false;
    let retryTimer: NodeJS.Timeout | null = null;

    const recordView = (attempt: number) => {
      if (isCancelled) return;

      fetch(`/api/assets/${assetId}/view`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      })
        .then(async (response) => {
          if (isCancelled) return;

          if (!response.ok) {
            // Server error - schedule retry with exponential backoff
            if (attempt < MAX_RETRIES) {
              const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
              retryTimer = setTimeout(() => recordView(attempt + 1), delay);
            }
            return;
          }
          
          // Parse response for view count
          try {
            const data = await response.json();
            const callback = callbackRef.current;
            if (callback && data.view_count !== undefined) {
              callback(data.view_count, data.counted === true);
            }
          } catch {
            // JSON parse failed - view was still recorded, just no callback
          }
        })
        .catch(() => {
          if (isCancelled) return;

          // Network error - schedule retry with exponential backoff
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            retryTimer = setTimeout(() => recordView(attempt + 1), delay);
          }
        });
    };

    // Start initial timer - wait VIEW_THRESHOLD_MS before first attempt
    const initialTimer = setTimeout(() => {
      recordView(0);
    }, VIEW_THRESHOLD_MS);

    // Cleanup: cancel all timers if unmounted or deps change
    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [assetId, enabled]);
}
