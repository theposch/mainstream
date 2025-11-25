// TODO: DATABASE SCHEMA - Likes Table
// When implementing database, create likes table with:
// - id (uuid, primary key)
// - userId (uuid, foreign key -> users.id, not null)
// - assetId (uuid, foreign key -> assets.id, not null)
// - createdAt (timestamp, not null)
//
// Indexes:
// - UNIQUE INDEX on (userId, assetId) - prevent duplicate likes
// - INDEX on userId - for fetching user's liked assets
// - INDEX on assetId - for counting likes per asset
//
// API Endpoints:
// - POST /api/assets/:assetId/like - Like an asset
// - DELETE /api/assets/:assetId/like - Unlike an asset
// - GET /api/users/:userId/likes - Get all assets liked by user
// - GET /api/assets/:assetId/likes/count - Get like count for asset

/**
 * Represents a like relationship between a user and an asset.
 */
export interface Like {
  /** Unique identifier for the like */
  id: string;
  /** ID of the user who liked the asset */
  userId: string;
  /** ID of the asset that was liked */
  assetId: string;
  /** ISO 8601 timestamp when the like was created */
  createdAt: string;
}

// TODO: Remove mock likes - replace with database queries
// In production, this will be stored in a likes table with proper foreign keys
export const likes: Like[] = [
  // User 1 (you) likes
  {
    id: "like-1",
    userId: "user-1",
    assetId: "asset-2", // Minimalist Product Card by Alex
    createdAt: "2024-03-20T10:00:00.000Z",
  },
  {
    id: "like-2",
    userId: "user-1",
    assetId: "asset-5", // Brand Color Palette by Sarah
    createdAt: "2024-03-21T14:30:00.000Z",
  },
  {
    id: "like-3",
    userId: "user-1",
    assetId: "asset-11", // Neumorphic Button Set by Sarah
    createdAt: "2024-03-22T09:15:00.000Z",
  },
  {
    id: "like-4",
    userId: "user-1",
    assetId: "asset-13", // Data Visualization Dashboard by Alex
    createdAt: "2024-03-23T16:45:00.000Z",
  },
  {
    id: "like-5",
    userId: "user-1",
    assetId: "asset-17", // Nature-Inspired Color Scheme by Sarah
    createdAt: "2024-03-24T11:20:00.000Z",
  },
  
  // User 2 (alex) likes
  {
    id: "like-6",
    userId: "user-2",
    assetId: "asset-3", // Typography Exploration by You
    createdAt: "2024-03-18T13:00:00.000Z",
  },
  {
    id: "like-7",
    userId: "user-2",
    assetId: "asset-6", // Geometric Pattern Design by You
    createdAt: "2024-03-19T15:30:00.000Z",
  },
  {
    id: "like-8",
    userId: "user-2",
    assetId: "asset-12", // Vintage Poster Design by Sarah
    createdAt: "2024-03-20T10:45:00.000Z",
  },
  
  // User 3 (sarah) likes
  {
    id: "like-9",
    userId: "user-3",
    assetId: "asset-1", // Modern Dashboard Interface by Alex
    createdAt: "2024-03-15T12:00:00.000Z",
  },
  {
    id: "like-10",
    userId: "user-3",
    assetId: "asset-8", // Colorful Gradient Mesh by You
    createdAt: "2024-03-16T14:20:00.000Z",
  },
  {
    id: "like-11",
    userId: "user-3",
    assetId: "asset-14", // Minimalist Icon Set by Alex
    createdAt: "2024-03-17T09:30:00.000Z",
  },
  
  // User 4 (mike) likes
  {
    id: "like-12",
    userId: "user-4",
    assetId: "asset-10", // Abstract 3D Shapes by You
    createdAt: "2024-03-14T11:00:00.000Z",
  },
  {
    id: "like-13",
    userId: "user-4",
    assetId: "asset-4", // Mobile App Mockup by Alex
    createdAt: "2024-03-15T16:15:00.000Z",
  },
];

/**
 * Get all asset IDs that a user has liked.
 * TODO: Replace with database query: SELECT assetId FROM likes WHERE userId = $1
 * 
 * @param userId - The ID of the user
 * @returns Array of asset IDs liked by the user
 */
export function getLikedAssetIds(userId: string): string[] {
  return likes
    .filter(like => like.userId === userId)
    .map(like => like.assetId);
}

/**
 * Get the total number of likes for an asset.
 * TODO: Replace with database query: SELECT COUNT(*) FROM likes WHERE assetId = $1
 * 
 * @param assetId - The ID of the asset
 * @returns Total count of likes for the asset
 */
export function getAssetLikeCount(assetId: string): number {
  return likes.filter(like => like.assetId === assetId).length;
}

/**
 * Check if a user has liked a specific asset.
 * TODO: Replace with database query: SELECT EXISTS(SELECT 1 FROM likes WHERE userId = $1 AND assetId = $2)
 * 
 * @param userId - The ID of the user
 * @param assetId - The ID of the asset
 * @returns True if the user has liked the asset, false otherwise
 */
export function hasUserLikedAsset(userId: string, assetId: string): boolean {
  return likes.some(like => like.userId === userId && like.assetId === assetId);
}

