"use client";

/**
 * Incremental Week Grouping Hook
 * 
 * Provides optimized week-based grouping of assets for infinite scroll feeds.
 * 
 * Key optimization: Instead of re-processing ALL assets on every page load,
 * this hook tracks which assets have been processed and only groups NEW ones.
 * 
 * With 200 loaded assets, this means:
 * - OLD behavior: Re-group all 200 assets on every new page load
 * - NEW behavior: Only process the 20 new assets from the latest page
 * 
 * Algorithm:
 * 1. Track processed asset IDs in a ref (survives re-renders)
 * 2. On new assets, filter to only unprocessed ones
 * 3. Add new assets to existing week groups
 * 4. Create new week groups as needed
 * 5. Return sorted week groups array
 * 
 * Usage:
 * ```tsx
 * const weekGroups = useWeekGroups(assets);
 * 
 * return (
 *   <div>
 *     {weekGroups.map((week) => (
 *       <WeekSection key={week.key} week={week} />
 *     ))}
 *   </div>
 * );
 * ```
 */

import { useMemo, useRef } from "react";
import type { Asset, User } from "@/lib/types/database";
import { getWeekStart, formatWeekLabel, type WeekGroup } from "@/lib/utils/week-grouping";

// Re-export for convenience
export type { WeekGroup };

// Internal mutable group structure for incremental updates
interface MutableWeekGroup {
  key: string;
  label: string;
  postCount: number;
  contributorIds: Set<string>;
  contributors: Pick<User, "id" | "username" | "display_name" | "avatar_url">[];
  assets: Asset[];
}

export function useWeekGroups(assets: Asset[]): WeekGroup[] {
  // Track which asset IDs have been processed (survives re-renders, not state)
  const processedIdsRef = useRef<Set<string>>(new Set());
  
  // Store mutable week groups (survives re-renders)
  const weekGroupsRef = useRef<Map<string, MutableWeekGroup>>(new Map());
  
  // Track the "now" date reference for consistent labeling
  // Update only when week boundary changes to avoid label flicker
  const nowRef = useRef<Date>(new Date());
  
  // Track the first asset ID to detect feed switches
  // When the FIRST asset changes (not just array reference), it's a different feed
  // This avoids false positives from flatMap() creating new arrays on pagination
  const prevFirstAssetIdRef = useRef<string | null>(null);

  return useMemo(() => {
    const currentFirstId = assets[0]?.id ?? null;
    const prevFirstId = prevFirstAssetIdRef.current;
    
    // Detect actual feed switch:
    // 1. New array is empty (clear for fresh start)
    // 2. First asset ID changed (actual feed switch, not pagination)
    //    - On pagination, we ADD assets to the end, first asset stays the same
    //    - On feed switch (Recent ↔ Following), the first asset is different
    // 3. Previous was empty and now has data (initial load of different feed)
    const isNewFeed = (
      assets.length === 0 ||
      (prevFirstId !== null && currentFirstId !== null && prevFirstId !== currentFirstId) ||
      (prevFirstId === null && currentFirstId !== null && processedIdsRef.current.size > 0 && !processedIdsRef.current.has(currentFirstId))
    );
    
    if (isNewFeed) {
      // Clear caches for fresh dataset
      processedIdsRef.current.clear();
      weekGroupsRef.current.clear();
    }
    
    // Update previous first asset ID
    prevFirstAssetIdRef.current = currentFirstId;
    // Filter to only new (unprocessed) assets
    const newAssets = assets.filter(a => !processedIdsRef.current.has(a.id));
    
    // Early return if no new assets and we have cached groups
    if (newAssets.length === 0 && weekGroupsRef.current.size > 0) {
      return Array.from(weekGroupsRef.current.values())
        .map(toImmutableGroup)
        .sort((a, b) => parseInt(b.key) - parseInt(a.key));
    }

    // Update the "now" reference periodically for correct labels
    // Only update if it's been more than 1 hour to avoid flicker
    const currentNow = new Date();
    if (currentNow.getTime() - nowRef.current.getTime() > 60 * 60 * 1000) {
      nowRef.current = currentNow;
    }
    const now = nowRef.current;

    // Process only new assets - O(newAssets.length) instead of O(allAssets.length)
    for (const asset of newAssets) {
      // Mark as processed
      processedIdsRef.current.add(asset.id);
      
      // Calculate week key
      const assetDate = new Date(asset.created_at);
      const weekStart = getWeekStart(assetDate);
      const weekKey = weekStart.getTime().toString();
      
      // Get or create week group
      if (!weekGroupsRef.current.has(weekKey)) {
        weekGroupsRef.current.set(weekKey, {
          key: weekKey,
          label: formatWeekLabel(weekStart, now),
          postCount: 0,
          contributorIds: new Set(),
          contributors: [],
          assets: [],
        });
      }
      
      const group = weekGroupsRef.current.get(weekKey)!;
      
      // Add asset to group
      group.assets.push(asset);
      group.postCount++;
      
      // Add contributor if not already present (O(1) Set lookup)
      if (asset.uploader && !group.contributorIds.has(asset.uploader.id)) {
        group.contributorIds.add(asset.uploader.id);
        group.contributors.push({
          id: asset.uploader.id,
          username: asset.uploader.username,
          display_name: asset.uploader.display_name,
          avatar_url: asset.uploader.avatar_url,
        });
      }
    }

    // Convert to immutable groups and sort by week (newest first)
    return Array.from(weekGroupsRef.current.values())
      .map(toImmutableGroup)
      .sort((a, b) => parseInt(b.key) - parseInt(a.key));
  }, [assets]);
}

/**
 * Convert mutable group to immutable WeekGroup
 * (Strips internal Set, returns clean interface)
 */
function toImmutableGroup(group: MutableWeekGroup): WeekGroup {
  return {
    key: group.key,
    label: group.label,
    postCount: group.postCount,
    contributors: group.contributors,
    assets: group.assets,
  };
}
