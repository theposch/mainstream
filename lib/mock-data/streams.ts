// TODO: DATABASE SCHEMA - Streams Table
// When implementing database, create streams table with:
// - id (uuid, primary key)
// - name (text, not null) - e.g., "# iOS App", "# Growth Team"
// - description (text, nullable) - purpose explanation
// - ownerType (enum: 'user' | 'team', not null)
// - ownerId (uuid, not null) - references users.id or teams.id
// - isPrivate (boolean, default false) - public vs private visibility
// - status (enum: 'active' | 'archived', default 'active')
// - createdAt (timestamp, not null)
// - updatedAt (timestamp, not null)
//
// Related tables:
// - stream_members (stream_id, user_id, role, joined_at)
//   - For managing followers/contributors to streams
//   - roles: 'owner', 'admin', 'member'
// - stream_resources (id, stream_id, title, url, resource_type, display_order, created_at)
//   - For pinned external resources (Figma, Jira, PRDs, etc.)
// - asset_streams (asset_id, stream_id, added_at, added_by)
//   - Many-to-many junction table for assets belonging to multiple streams

export interface Stream {
  id: string;
  name: string;
  description?: string;
  ownerType: 'user' | 'team';
  ownerId: string;
  isPrivate: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface StreamMember {
  streamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface StreamResource {
  id: string;
  streamId: string;
  title: string;
  url: string;
  resourceType: 'figma' | 'jira' | 'notion' | 'prd' | 'other';
  displayOrder: number;
  createdAt: string;
}

export interface AssetStream {
  assetId: string;
  streamId: string;
  addedAt: string;
  addedBy: string;
}

// TODO: Remove mock streams - fetch from database
// GET /api/streams?workspace={workspaceId}
// GET /api/streams/:streamId (with authorization check)
// NOTE: This is a mutable array for local development (in-memory storage)
// In production, this will be replaced with database operations
export let streams: Stream[] = [
  // Personal Streams (migrated to slug format)
  {
    id: "stream-1",
    name: "personal-inspiration",
    description: "My personal collection of inspiring designs",
    ownerType: 'user',
    ownerId: 'user-1',
    isPrivate: true,
    status: 'active',
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "stream-2",
    name: "ui-experiments",
    description: "Experimental UI concepts and prototypes",
    ownerType: 'user',
    ownerId: 'user-1',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-02-15T00:00:00.000Z",
    updatedAt: "2024-02-15T00:00:00.000Z",
  },
  
  // Team Streams (migrated to slug format)
  {
    id: "stream-3",
    name: "component-library",
    description: "Design system components and patterns",
    ownerType: 'team',
    ownerId: 'team-1',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-01-20T00:00:00.000Z",
    updatedAt: "2024-01-20T00:00:00.000Z",
  },
  {
    id: "stream-4",
    name: "ios-app-redesign",
    description: "New design direction for our mobile app",
    ownerType: 'team',
    ownerId: 'team-2',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-02-25T00:00:00.000Z",
    updatedAt: "2024-02-25T00:00:00.000Z",
  },
  {
    id: "stream-5",
    name: "brand-guidelines-2024",
    description: "Updated brand identity and visual language",
    ownerType: 'team',
    ownerId: 'team-3',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-03-10T00:00:00.000Z",
    updatedAt: "2024-03-10T00:00:00.000Z",
  },

  // Additional streams for multi-tagging demonstration
  {
    id: "stream-6",
    name: "mobile",
    description: "All mobile-related design work across teams",
    ownerType: 'team',
    ownerId: 'team-2',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-03-15T00:00:00.000Z",
    updatedAt: "2024-03-15T00:00:00.000Z",
  },
  {
    id: "stream-7",
    name: "growth-team",
    description: "Growth initiatives, experiments, and feature launches",
    ownerType: 'team',
    ownerId: 'team-3',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-03-20T00:00:00.000Z",
    updatedAt: "2024-03-20T00:00:00.000Z",
  },
  {
    id: "stream-8",
    name: "dark-mode",
    description: "Dark mode designs and theming work",
    ownerType: 'team',
    ownerId: 'team-1',
    isPrivate: false,
    status: 'active',
    createdAt: "2024-03-25T00:00:00.000Z",
    updatedAt: "2024-03-25T00:00:00.000Z",
  },
];

// Mock stream members (followers/contributors)
// TODO: Remove mock - fetch from database via team_members join
export let streamMembers: StreamMember[] = [
  // Stream 1 (Personal Inspiration) - Private, only owner
  { streamId: "stream-1", userId: "user-1", role: "owner", joinedAt: "2024-01-10T00:00:00.000Z" },
  
  // Stream 2 (UI Experiments) - Public, owner + followers
  { streamId: "stream-2", userId: "user-1", role: "owner", joinedAt: "2024-02-15T00:00:00.000Z" },
  { streamId: "stream-2", userId: "user-2", role: "member", joinedAt: "2024-02-16T00:00:00.000Z" },
  { streamId: "stream-2", userId: "user-3", role: "member", joinedAt: "2024-02-17T00:00:00.000Z" },
  
  // Stream 3 (Component Library) - Team owned
  { streamId: "stream-3", userId: "user-1", role: "owner", joinedAt: "2024-01-20T00:00:00.000Z" },
  { streamId: "stream-3", userId: "user-2", role: "admin", joinedAt: "2024-01-20T00:00:00.000Z" },
  { streamId: "stream-3", userId: "user-3", role: "member", joinedAt: "2024-01-21T00:00:00.000Z" },
  
  // Stream 4 (iOS App Redesign)
  { streamId: "stream-4", userId: "user-2", role: "owner", joinedAt: "2024-02-25T00:00:00.000Z" },
  { streamId: "stream-4", userId: "user-1", role: "member", joinedAt: "2024-02-26T00:00:00.000Z" },
  { streamId: "stream-4", userId: "user-4", role: "member", joinedAt: "2024-02-27T00:00:00.000Z" },
  
  // Stream 5 (Brand Guidelines)
  { streamId: "stream-5", userId: "user-3", role: "owner", joinedAt: "2024-03-10T00:00:00.000Z" },
  { streamId: "stream-5", userId: "user-1", role: "member", joinedAt: "2024-03-11T00:00:00.000Z" },
  
  // Stream 6 (Mobile)
  { streamId: "stream-6", userId: "user-2", role: "owner", joinedAt: "2024-03-15T00:00:00.000Z" },
  { streamId: "stream-6", userId: "user-1", role: "member", joinedAt: "2024-03-16T00:00:00.000Z" },
  { streamId: "stream-6", userId: "user-4", role: "member", joinedAt: "2024-03-16T00:00:00.000Z" },
  
  // Stream 7 (Growth Team)
  { streamId: "stream-7", userId: "user-3", role: "owner", joinedAt: "2024-03-20T00:00:00.000Z" },
  { streamId: "stream-7", userId: "user-1", role: "member", joinedAt: "2024-03-21T00:00:00.000Z" },
  { streamId: "stream-7", userId: "user-2", role: "member", joinedAt: "2024-03-21T00:00:00.000Z" },
  
  // Stream 8 (Dark Mode)
  { streamId: "stream-8", userId: "user-2", role: "owner", joinedAt: "2024-03-25T00:00:00.000Z" },
  { streamId: "stream-8", userId: "user-1", role: "member", joinedAt: "2024-03-26T00:00:00.000Z" },
];

// Mock pinned resources for streams
// TODO: Remove mock - fetch from database
export let streamResources: StreamResource[] = [
  // Component Library resources
  {
    id: "res-1",
    streamId: "stream-3",
    title: "Figma Design System",
    url: "https://figma.com/file/design-system",
    resourceType: "figma",
    displayOrder: 0,
    createdAt: "2024-01-20T00:00:00.000Z",
  },
  {
    id: "res-2",
    streamId: "stream-3",
    title: "Component Documentation",
    url: "https://notion.so/components",
    resourceType: "notion",
    displayOrder: 1,
    createdAt: "2024-01-21T00:00:00.000Z",
  },
  {
    id: "res-3",
    streamId: "stream-3",
    title: "Component Library Jira Board",
    url: "https://jira.company.com/component-library",
    resourceType: "jira",
    displayOrder: 2,
    createdAt: "2024-01-22T00:00:00.000Z",
  },
  
  // iOS App Redesign resources
  {
    id: "res-4",
    streamId: "stream-4",
    title: "iOS App Designs",
    url: "https://figma.com/file/ios-app",
    resourceType: "figma",
    displayOrder: 0,
    createdAt: "2024-02-25T00:00:00.000Z",
  },
  {
    id: "res-5",
    streamId: "stream-4",
    title: "Product Requirements",
    url: "https://docs.google.com/document/ios-prd",
    resourceType: "prd",
    displayOrder: 1,
    createdAt: "2024-02-26T00:00:00.000Z",
  },
  
  // Growth Team resources
  {
    id: "res-6",
    streamId: "stream-7",
    title: "Growth Experiments Tracker",
    url: "https://notion.so/growth-experiments",
    resourceType: "notion",
    displayOrder: 0,
    createdAt: "2024-03-20T00:00:00.000Z",
  },
];

// Mock asset-stream relationships (many-to-many junction table)
// Initialize from assets.streamIds to maintain data consistency
// TODO: Remove mock - will be derived from assets.streamIds field
export let assetStreams: AssetStream[] = [];

// Initialize the junction table from assets
// This ensures consistency between asset.streamIds and the junction table
export function initializeAssetStreams() {
  // Clear existing relationships
  assetStreams.length = 0;
  
  // Import assets dynamically to avoid circular dependency
  const { assets } = require('./assets');
  
  // Populate from each asset's streamIds
  assets.forEach((asset: any) => {
    if (asset.streamIds && Array.isArray(asset.streamIds)) {
      asset.streamIds.forEach((streamId: string) => {
        assetStreams.push({
          assetId: asset.id,
          streamId: streamId,
          addedAt: asset.createdAt || new Date().toISOString(),
          addedBy: asset.uploaderId || 'system',
        });
      });
    }
  });
  
  console.log(`Initialized ${assetStreams.length} asset-stream relationships`);
}

// Auto-initialize on module load
initializeAssetStreams();

// NOTE: Deprecated - use migration-helpers.ts instead
// Helper function to get streams for a specific asset
// @deprecated Use getStreamsForAsset from migration-helpers.ts instead
export function getStreamsForAssetById(assetId: string): string[] {
  return assetStreams
    .filter(as => as.assetId === assetId)
    .map(as => as.streamId);
}

// Helper function to get a stream by its slug (name)
export function getStreamBySlug(slug: string): Stream | undefined {
  return streams.find(s => s.name === slug);
}

// Helper function to get assets in a specific stream
export function getAssetsInStream(streamId: string): string[] {
  return assetStreams
    .filter(as => as.streamId === streamId)
    .map(as => as.assetId);
}

// Helper function to get members of a stream
export function getStreamMembers(streamId: string): StreamMember[] {
  return streamMembers.filter(sm => sm.streamId === streamId);
}

// Helper function to get resources for a stream
export function getStreamResources(streamId: string): StreamResource[] {
  return streamResources
    .filter(sr => sr.streamId === streamId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

// Validation constants
export const STREAM_VALIDATION = {
  MIN_STREAMS_PER_ASSET: 1,
  MAX_STREAMS_PER_ASSET: 10,
  MIN_STREAM_NAME_LENGTH: 3,
  MAX_STREAM_NAME_LENGTH: 50,
  MAX_STREAM_DESCRIPTION_LENGTH: 500,
  MAX_RESOURCES_PER_STREAM: 20,
  MAX_VISIBLE_STREAM_BADGES: 3,
} as const;

