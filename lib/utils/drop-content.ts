/**
 * Shared utilities for building Drop content blocks.
 *
 * The same asset-grouping and block-creation logic was previously duplicated in:
 *   - app/api/drops/route.ts (POST)
 *   - app/api/cron/process-schedules/route.ts
 *   - app/api/schedules/route.ts
 *
 * This module is the single source of truth.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface AssetStreamRow {
  asset_id: string;
  stream: {
    id: string;
    name: string;
  } | null;
}

/** Mapping from asset ID → list of stream associations */
export type AssetStreamMap = Record<string, { streamId: string; streamName: string }[]>;

/**
 * Build a map of asset_id → stream associations for a set of asset IDs.
 * Returns both the per-asset map and a flat name lookup.
 */
export async function buildAssetStreamMap(
  supabase: SupabaseClient,
  assetIds: string[],
): Promise<{ assetStreamMap: AssetStreamMap; streamNames: Record<string, string> }> {
  const assetStreamMap: AssetStreamMap = {};
  const streamNames: Record<string, string> = {};

  if (assetIds.length === 0) return { assetStreamMap, streamNames };

  const { data: rows } = await supabase
    .from("asset_streams")
    .select("asset_id, stream:streams(id, name)")
    .in("asset_id", assetIds);

  (rows as AssetStreamRow[] | null)?.forEach((row) => {
    if (!assetStreamMap[row.asset_id]) assetStreamMap[row.asset_id] = [];
    if (row.stream) {
      assetStreamMap[row.asset_id].push({
        streamId: row.stream.id,
        streamName: row.stream.name,
      });
      streamNames[row.stream.id] = row.stream.name;
    }
  });

  return { assetStreamMap, streamNames };
}

/**
 * Group a list of asset IDs by stream.
 *
 * When `filterStreamIds` is provided the grouping respects that order and
 * only uses streams that are in the filter list. Assets that don't belong to
 * any stream end up in `uncategorized`.
 */
export function groupAssetsByStream(
  assetIds: string[],
  assetStreamMap: AssetStreamMap,
  filterStreamIds?: string[] | null,
): { assetsByStream: Record<string, string[]>; uncategorized: string[] } {
  const assetsByStream: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  for (const assetId of assetIds) {
    const streams = assetStreamMap[assetId];
    if (!streams || streams.length === 0) {
      uncategorized.push(assetId);
      continue;
    }

    let groupingStream = streams[0];

    if (filterStreamIds?.length) {
      // Prefer the first stream in the filter order
      for (const filteredId of filterStreamIds) {
        const match = streams.find((s) => s.streamId === filteredId);
        if (match) {
          groupingStream = match;
          break;
        }
      }
    }

    if (!assetsByStream[groupingStream.streamId]) {
      assetsByStream[groupingStream.streamId] = [];
    }
    assetsByStream[groupingStream.streamId].push(assetId);
  }

  return { assetsByStream, uncategorized };
}

export interface DropBlockInput {
  drop_id: string;
  type: string;
  content?: string;
  heading_level?: number;
  asset_id?: string;
  position: number;
}

/**
 * Build the ordered array of DropBlock insert rows for a drop.
 *
 * Streams appear in `filterStreamIds` order (if provided), then any remaining
 * streams in arbitrary order, then uncategorized assets under an "Other" heading.
 */
export function buildDropBlocks(
  dropId: string,
  assetsByStream: Record<string, string[]>,
  uncategorized: string[],
  streamNames: Record<string, string>,
  filterStreamIds?: string[] | null,
): DropBlockInput[] {
  const blocks: DropBlockInput[] = [];
  let position = 0;

  // Determine stream order: honour filter order first, then append remaining
  const orderedStreams = filterStreamIds?.length
    ? filterStreamIds.filter((id) => assetsByStream[id])
    : Object.keys(assetsByStream);

  for (const streamId of Object.keys(assetsByStream)) {
    if (!orderedStreams.includes(streamId)) orderedStreams.push(streamId);
  }

  for (const streamId of orderedStreams) {
    const assetIds = assetsByStream[streamId];
    if (!assetIds || assetIds.length === 0) continue;

    blocks.push({
      drop_id: dropId,
      type: "heading",
      content: streamNames[streamId],
      heading_level: 2,
      position: position++,
    });

    for (const assetId of assetIds) {
      blocks.push({ drop_id: dropId, type: "post", asset_id: assetId, position: position++ });
    }
  }

  if (uncategorized.length > 0) {
    blocks.push({
      drop_id: dropId,
      type: "heading",
      content: "Other",
      heading_level: 2,
      position: position++,
    });
    for (const assetId of uncategorized) {
      blocks.push({ drop_id: dropId, type: "post", asset_id: assetId, position: position++ });
    }
  }

  return blocks;
}
