// Migration utilities for transitioning from Projects to Streams
// These helpers ensure backward compatibility and smooth data migration

import { Asset } from "./assets";
import { Stream, streams, assetStreams, AssetStream, STREAM_VALIDATION } from "./streams";

/**
 * Migrates an asset from legacy projectId to streamIds array
 * Ensures backward compatibility during the transition period
 */
export function migrateAssetToStreams(asset: Asset): Asset {
  // If asset already has streamIds, return as-is
  if (asset.streamIds && asset.streamIds.length > 0) {
    return asset;
  }

  // Migrate from legacy projectId
  if (asset.projectId) {
    // Map old project IDs to new stream IDs
    const streamId = projectIdToStreamId(asset.projectId);
    
    return {
      ...asset,
      streamIds: [streamId],
    };
  }

  // No projectId or streamIds - assign to default "Unsorted" stream
  console.warn(`Asset ${asset.id} has no projectId or streamIds, assigning to default stream`);
  return {
    ...asset,
    streamIds: ["stream-unsorted"], // TODO: Create default "Unsorted" stream
  };
}

/**
 * Maps legacy project IDs to new stream IDs
 * Maintains 1:1 mapping for converted projects
 */
function projectIdToStreamId(projectId: string): string {
  const mapping: Record<string, string> = {
    "proj-1": "stream-1",
    "proj-2": "stream-2",
    "proj-3": "stream-3",
    "proj-4": "stream-4",
    "proj-5": "stream-5",
  };

  return mapping[projectId] || projectId.replace("proj-", "stream-");
}

/**
 * Gets all streams that an asset belongs to
 * Handles both streamIds array and legacy projectId
 */
export function getStreamsForAsset(asset: Asset): string[] {
  // Primary: use streamIds if available
  if (asset.streamIds && asset.streamIds.length > 0) {
    return asset.streamIds;
  }

  // Fallback: migrate from legacy projectId
  if (asset.projectId) {
    const streamId = projectIdToStreamId(asset.projectId);
    console.warn(`Auto-migrating asset ${asset.id} from projectId to streamIds`);
    
    // Optionally update the asset in-place (for in-memory mock data)
    if (!asset.streamIds) {
      asset.streamIds = [streamId];
    }
    
    return [streamId];
  }

  // No streams found
  console.warn(`Asset ${asset.id} has no associated streams`);
  return [];
}

/**
 * Gets all assets that belong to a specific stream
 * Filters based on streamIds array
 */
export function getAssetsForStream(streamId: string, assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const assetStreams = getStreamsForAsset(asset);
    return assetStreams.includes(streamId);
  });
}

/**
 * Gets stream objects for an asset (full Stream data, not just IDs)
 */
export function getAssetStreamObjects(asset: Asset): Stream[] {
  const streamIds = getStreamsForAsset(asset);
  return streamIds
    .map(id => streams.find(s => s.id === id))
    .filter((s): s is Stream => s !== undefined);
}

/**
 * Validates stream IDs for an asset
 * Ensures constraints are met (1-10 streams per asset)
 */
export function validateAssetStreams(streamIds: string[]): {
  valid: boolean;
  error?: string;
} {
  if (!streamIds || streamIds.length === 0) {
    return {
      valid: false,
      error: "Asset must belong to at least one stream",
    };
  }

  if (streamIds.length < STREAM_VALIDATION.MIN_STREAMS_PER_ASSET) {
    return {
      valid: false,
      error: `Asset must belong to at least ${STREAM_VALIDATION.MIN_STREAMS_PER_ASSET} stream(s)`,
    };
  }

  if (streamIds.length > STREAM_VALIDATION.MAX_STREAMS_PER_ASSET) {
    return {
      valid: false,
      error: `Asset can belong to at most ${STREAM_VALIDATION.MAX_STREAMS_PER_ASSET} streams`,
    };
  }

  // Check that all streams exist
  const invalidStreams = streamIds.filter(id => !streams.find(s => s.id === id));
  if (invalidStreams.length > 0) {
    return {
      valid: false,
      error: `Invalid stream IDs: ${invalidStreams.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Filters out archived streams from an asset's stream list
 * Returns only active streams
 */
export function getActiveStreamsForAsset(asset: Asset): Stream[] {
  const assetStreamObjects = getAssetStreamObjects(asset);
  return assetStreamObjects.filter(s => s.status === 'active');
}

/**
 * Checks if an asset belongs to any archived streams
 */
export function hasArchivedStreams(asset: Asset): boolean {
  const assetStreamObjects = getAssetStreamObjects(asset);
  return assetStreamObjects.some(s => s.status === 'archived');
}

/**
 * Gets count of archived streams for an asset
 */
export function getArchivedStreamCount(asset: Asset): number {
  const assetStreamObjects = getAssetStreamObjects(asset);
  return assetStreamObjects.filter(s => s.status === 'archived').length;
}

/**
 * Adds an asset to a stream (updates the many-to-many relationship)
 */
export function addAssetToStream(
  assetId: string,
  streamId: string,
  addedBy: string
): AssetStream {
  // Check if relationship already exists
  const existing = assetStreams.find(
    as => as.assetId === assetId && as.streamId === streamId
  );

  if (existing) {
    console.warn(`Asset ${assetId} already belongs to stream ${streamId}`);
    return existing;
  }

  // Create new relationship
  const newRelation: AssetStream = {
    assetId,
    streamId,
    addedAt: new Date().toISOString(),
    addedBy,
  };

  assetStreams.push(newRelation);
  return newRelation;
}

/**
 * Removes an asset from a stream
 */
export function removeAssetFromStream(assetId: string, streamId: string): boolean {
  const index = assetStreams.findIndex(
    as => as.assetId === assetId && as.streamId === streamId
  );

  if (index === -1) {
    console.warn(`Asset ${assetId} not found in stream ${streamId}`);
    return false;
  }

  assetStreams.splice(index, 1);
  return true;
}

/**
 * Bulk updates an asset's streams
 * Replaces all existing stream relationships with new ones
 */
export function updateAssetStreams(
  assetId: string,
  newStreamIds: string[],
  updatedBy: string
): boolean {
  // Validate new stream IDs
  const validation = validateAssetStreams(newStreamIds);
  if (!validation.valid) {
    console.error(`Invalid stream IDs for asset ${assetId}: ${validation.error}`);
    return false;
  }

  // Remove all existing relationships for this asset
  const existingIndices = assetStreams
    .map((as, index) => as.assetId === assetId ? index : -1)
    .filter(index => index !== -1)
    .reverse(); // Reverse to remove from end to avoid index shifting

  existingIndices.forEach(index => assetStreams.splice(index, 1));

  // Add new relationships
  newStreamIds.forEach(streamId => {
    addAssetToStream(assetId, streamId, updatedBy);
  });

  return true;
}

/**
 * Gets a user-friendly display of streams for an asset
 * Returns first N streams + overflow count
 */
export function getDisplayStreams(asset: Asset, maxVisible: number = 3): {
  visible: Stream[];
  overflowCount: number;
} {
  const allStreams = getActiveStreamsForAsset(asset);
  
  return {
    visible: allStreams.slice(0, maxVisible),
    overflowCount: Math.max(0, allStreams.length - maxVisible),
  };
}

