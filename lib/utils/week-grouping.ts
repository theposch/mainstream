/**
 * Week Grouping Utility
 * 
 * Groups assets by week for the feed display.
 * Handles week labels like "This week", "Last week", and date ranges for older weeks.
 */

import type { Asset, User } from "@/lib/types/database";

export interface WeekGroup {
  /** Unique key for React rendering */
  key: string;
  /** Display label: "This week", "Last week", or "Nov 25 - Dec 1" */
  label: string;
  /** Number of posts in this week */
  postCount: number;
  /** Unique contributors (uploaders) for this week */
  contributors: Pick<User, "id" | "username" | "display_name" | "avatar_url">[];
  /** Assets in this week */
  assets: Asset[];
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is day 0
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Format a week label based on how recent it is
 */
function formatWeekLabel(weekStart: Date, now: Date): string {
  const currentWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // This week
  if (weekStart.getTime() === currentWeekStart.getTime()) {
    return "This week";
  }

  // Last week
  if (weekStart.getTime() === lastWeekStart.getTime()) {
    return "Last week";
  }

  // Older weeks: show date range
  const weekEnd = getWeekEnd(weekStart);
  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const startDay = weekStart.getDate();
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
  const endDay = weekEnd.getDate();

  // Same month
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }

  // Different months
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Extract unique contributors from assets
 * Returns deduplicated list sorted by most recent post first
 */
function extractContributors(
  assets: Asset[]
): Pick<User, "id" | "username" | "display_name" | "avatar_url">[] {
  const seenIds = new Set<string>();
  const contributors: Pick<User, "id" | "username" | "display_name" | "avatar_url">[] = [];

  for (const asset of assets) {
    if (asset.uploader && !seenIds.has(asset.uploader.id)) {
      seenIds.add(asset.uploader.id);
      contributors.push({
        id: asset.uploader.id,
        username: asset.uploader.username,
        display_name: asset.uploader.display_name,
        avatar_url: asset.uploader.avatar_url,
      });
    }
  }

  return contributors;
}

/**
 * Group assets by week
 * 
 * @param assets - Array of assets sorted by created_at DESC (newest first)
 * @returns Array of WeekGroup objects, sorted chronologically (newest week first)
 */
export function groupAssetsByWeek(assets: Asset[]): WeekGroup[] {
  if (!assets || assets.length === 0) {
    return [];
  }

  const now = new Date();
  const weekMap = new Map<string, Asset[]>();

  // Group assets by week start timestamp
  for (const asset of assets) {
    const assetDate = new Date(asset.created_at);
    const weekStart = getWeekStart(assetDate);
    const weekKey = weekStart.getTime().toString();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(asset);
  }

  // Convert map to sorted array of WeekGroups
  const weekGroups: WeekGroup[] = [];

  // Sort weeks by timestamp (descending - newest first)
  const sortedWeekKeys = Array.from(weekMap.keys()).sort(
    (a, b) => parseInt(b) - parseInt(a)
  );

  for (const weekKey of sortedWeekKeys) {
    const weekAssets = weekMap.get(weekKey)!;
    const weekStart = new Date(parseInt(weekKey));

    weekGroups.push({
      key: weekKey,
      label: formatWeekLabel(weekStart, now),
      postCount: weekAssets.length,
      contributors: extractContributors(weekAssets),
      assets: weekAssets,
    });
  }

  return weekGroups;
}

