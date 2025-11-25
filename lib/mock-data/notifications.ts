
import { User } from "./users";
import { Asset } from "./assets";
import { Comment } from "./comments";

export type NotificationType = 'like_asset' | 'like_comment' | 'reply_comment' | 'follow' | 'mention';

export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string; // User who performed the action
  resourceId?: string; // ID of asset, comment, etc.
  resourceType?: 'asset' | 'comment' | 'user';
  isRead: boolean;
  createdAt: string;
}

// TODO: DATABASE SCHEMA - Notifications Table
// create table notifications (
//   id uuid primary key default gen_random_uuid(),
//   type text not null, -- 'like_asset', 'like_comment', 'reply_comment', 'follow', 'mention'
//   recipient_id uuid not null references users(id),
//   actor_id uuid not null references users(id),
//   resource_id uuid,
//   resource_type text,
//   is_read boolean default false,
//   created_at timestamptz default now()
// );
// create index idx_notifications_recipient_id on notifications(recipient_id);

export const notifications: Notification[] = [
  {
    id: "notif-1",
    type: "like_asset",
    recipientId: "user-1",
    actorId: "user-2", // Alex
    resourceId: "asset-1",
    resourceType: "asset",
    isRead: false,
    createdAt: "2024-03-25T14:30:00.000Z"
  },
  {
    id: "notif-2",
    type: "reply_comment",
    recipientId: "user-1",
    actorId: "user-3", // Sarah
    resourceId: "comment-1", // The comment being replied to
    resourceType: "comment",
    isRead: false,
    createdAt: "2024-03-25T10:15:00.000Z"
  },
  {
    id: "notif-3",
    type: "follow",
    recipientId: "user-1",
    actorId: "user-4", // Mike
    isRead: true,
    createdAt: "2024-03-24T09:00:00.000Z"
  },
  {
    id: "notif-4",
    type: "mention",
    recipientId: "user-1",
    actorId: "user-2", // Alex
    resourceId: "comment-6", // Comment containing mention
    resourceType: "comment",
    isRead: true,
    createdAt: "2024-03-23T16:45:00.000Z"
  }
];

