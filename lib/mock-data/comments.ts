
export interface Comment {
  id: string;
  assetId: string;
  userId: string;
  content: string;
  parentId?: string; // For nested replies
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  likes: number;
  hasLiked: boolean;
}

// TODO: DATABASE SCHEMA - Comments Table
// When implementing database, create asset_comments table with:
// - id (uuid, primary key)
// - asset_id (uuid, foreign key -> assets.id, not null, indexed)
// - user_id (uuid, foreign key -> users.id, not null)
// - content (text, not null)
// - parent_id (uuid, foreign key -> asset_comments.id, nullable) - for nested replies
// - created_at (timestamp, not null, default now())
// - updated_at (timestamp, nullable)
// - is_edited (boolean, default false)
// - likes (integer, default 0)
//
// Indexes:
// - CREATE INDEX idx_asset_comments_asset_id ON asset_comments(asset_id);
// - CREATE INDEX idx_asset_comments_parent_id ON asset_comments(parent_id);
// - CREATE INDEX idx_asset_comments_created_at ON asset_comments(created_at);

export const comments: Comment[] = [
  {
    id: "comment-1",
    assetId: "asset-1",
    userId: "user-2", // Alex
    content: "Love the color palette in this one! Especially that deep purple.",
    createdAt: "2024-03-15T10:30:00.000Z",
    isEdited: false,
    likes: 3,
    hasLiked: true
  },
  {
    id: "comment-2",
    assetId: "asset-1",
    userId: "user-1", // You
    content: "Thanks! I extracted it from a photo I took in Tokyo.",
    parentId: "comment-1",
    createdAt: "2024-03-15T10:35:00.000Z",
    isEdited: false,
    likes: 1,
    hasLiked: false
  },
  {
    id: "comment-3",
    assetId: "asset-1",
    userId: "user-3", // Sarah
    content: "Could you share the hex codes?",
    createdAt: "2024-03-15T11:00:00.000Z",
    isEdited: false,
    likes: 0,
    hasLiked: false
  },
  {
    id: "comment-4",
    assetId: "asset-1",
    userId: "user-1", // You
    content: "Sure! They are listed in the sidebar right above.",
    parentId: "comment-3",
    createdAt: "2024-03-15T11:05:00.000Z",
    isEdited: true,
    updatedAt: "2024-03-15T11:06:00.000Z",
    likes: 0,
    hasLiked: false
  },
  {
    id: "comment-5",
    assetId: "asset-2",
    userId: "user-4", // Mike
    content: "This is exactly the vibe we need for the new campaign.",
    createdAt: "2024-03-20T09:15:00.000Z",
    isEdited: false,
    likes: 2,
    hasLiked: true
  },
  {
    id: "comment-6",
    assetId: "asset-2",
    userId: "user-2", // Alex
    content: "Agreed. Let's discuss this in the team meeting.",
    parentId: "comment-5",
    createdAt: "2024-03-20T09:30:00.000Z",
    isEdited: false,
    likes: 1,
    hasLiked: false
  },
  {
    id: "comment-7",
    assetId: "asset-3",
    userId: "user-3", // Sarah
    content: "Is this using Inter or SF Pro?",
    createdAt: "2024-03-22T14:00:00.000Z",
    isEdited: false,
    likes: 0,
    hasLiked: false
  }
];
