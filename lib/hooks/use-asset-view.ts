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

  useEffect(() => {
    console.log('[useAssetView] Effect running:', { assetId, enabled, hasRecorded: hasRecordedRef.current });
    
    // Skip if disabled or already recorded this session
    if (!enabled || !assetId || hasRecordedRef.current) {
      console.log('[useAssetView] Skipping - conditions not met');
      return;
    }

    console.log('[useAssetView] Starting 2s timer for asset:', assetId);

    const timer = setTimeout(() => {
      // Mark as recorded to prevent duplicate calls
      hasRecordedRef.current = true;

      console.log('[useAssetView] Timer fired! Making API call for:', assetId);

      // Fire-and-forget: don't await, use keepalive for reliability
      fetch(`/api/assets/${assetId}/view`, {
        method: 'POST',
        keepalive: true, // Ensures request completes even if user navigates away
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            console.error('[useAssetView] API error:', response.status, data);
            hasRecordedRef.current = false;
          } else {
            console.log('[useAssetView] ✓ View recorded successfully:', data);
          }
        })
        .catch((error) => {
          console.error('[useAssetView] Network error:', error);
          hasRecordedRef.current = false;
        });
    }, VIEW_THRESHOLD_MS);

    // Cleanup: cancel timer if unmounted before threshold
    return () => {
      console.log('[useAssetView] Cleanup - clearing timer');
      clearTimeout(timer);
    };
  }, [assetId, enabled]);

  // Reset recorded flag when assetId changes (viewing different asset)
  useEffect(() => {
    console.log('[useAssetView] Reset effect - assetId changed to:', assetId);
    hasRecordedRef.current = false;
  }, [assetId]);
}

