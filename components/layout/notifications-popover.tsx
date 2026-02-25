"use client";

import * as React from "react";
import { Bell, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, type Notification } from "@/lib/hooks/use-notifications";
import { formatRelativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Notification content data type
interface NotificationData {
  actor: { username: string; display_name: string; avatar_url?: string };
  content: string;
  link: string;
  preview?: string | null;
  isSystemNotification?: boolean; // For scheduled drops, etc.
}

// Memoized notification item component
interface NotificationItemProps {
  notification: Notification;
  data: NotificationData;
  onRead: (id: string) => void;
  onClose: () => void;
}

const NotificationItem = React.memo(function NotificationItem({
  notification,
  data,
  onRead,
  onClose,
}: NotificationItemProps) {
  const handleClick = React.useCallback(() => {
    onRead(notification.id);
    onClose();
  }, [onRead, onClose, notification.id]);

  return (
    <Link
      href={data.link}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-accent/30"
      )}
    >
      {data.isSystemNotification ? (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>
      ) : (
      <Avatar className="h-8 w-8 border border-border mt-0.5">
        <AvatarImage src={data.actor.avatar_url} />
        <AvatarFallback>{data.actor.username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      )}
      <div className="flex-1 space-y-1">
        <p className="text-sm text-muted-foreground leading-snug">
          {data.isSystemNotification ? (
            <span className="text-foreground">{data.content}</span>
          ) : (
            <>
          <span className="font-medium text-foreground">{data.actor.display_name}</span>{" "}
          {data.content}
            </>
          )}
        </p>
        {data.preview && (
          <p className="text-sm text-muted-foreground/80 line-clamp-2 italic">
            &quot;{data.preview}&quot;
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
      )}
    </Link>
  );
});

export function NotificationsPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isRinging, setIsRinging] = React.useState(false);
  const prevUnreadCountRef = React.useRef(unreadCount);

  // Ring the bell whenever unread count increases
  React.useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setIsRinging(true);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleMarkAsRead = React.useCallback(async (id: string) => {
    await markAsRead(id);
  }, [markAsRead]);

  const handleMarkAllAsRead = React.useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleClosePopover = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  // Memoize notification content data to prevent unnecessary re-renders of NotificationItem
  const notificationDataMap = React.useMemo(() => {
    const map = new Map<string, NotificationData | null>();
    
    // Helper to build link with optional comment highlight
    const buildAssetLink = (assetId: string | null, commentId?: string | null) => {
      if (!assetId) return "#";
      return commentId ? `/e/${assetId}?comment=${commentId}` : `/e/${assetId}`;
    };

    for (const notification of notifications) {
      const actor = notification.actor;
      const asset = notification.asset;
      
      if (!actor) {
        map.set(notification.id, null);
        continue;
      }

      let content = "";
      let link = "#";
      let preview: string | null | undefined = null;

      switch (notification.type) {
        case 'like_asset':
          content = asset?.title 
            ? `liked your post "${asset.title}"`
            : "liked your post";
          link = buildAssetLink(notification.resource_id);
          break;
        case 'comment':
          content = asset?.title
            ? `commented on "${asset.title}"`
            : "commented on your post";
          link = buildAssetLink(notification.resource_id, notification.comment_id);
          preview = notification.content;
          break;
        case 'like_comment':
          content = asset?.title
            ? `liked your comment on "${asset.title}"`
            : "liked your comment";
          link = buildAssetLink(notification.resource_id, notification.comment_id);
          break;
        case 'reply_comment':
          content = asset?.title
            ? `replied to your comment on "${asset.title}"`
            : "replied to your comment";
          link = buildAssetLink(notification.resource_id, notification.comment_id);
          preview = notification.content;
          break;
        case 'follow':
          content = "started following you";
          link = `/u/${actor.username}`;
          break;
        case 'mention':
          content = asset?.title
            ? `mentioned you on "${asset.title}"`
            : "mentioned you";
          link = buildAssetLink(notification.resource_id, notification.comment_id);
          preview = notification.content;
          break;
        case 'scheduled_drop_ready':
          // For scheduled drops, the notification is self-triggered (actor = recipient)
          // and links to the drop editor
          content = notification.content || "Your scheduled drop is ready to review";
          link = notification.resource_id ? `/drops/${notification.resource_id}/edit` : "/drops?tab=drafts";
          map.set(notification.id, { actor, content, link, preview, isSystemNotification: true });
          continue; // Skip the default map.set below
      }

      map.set(notification.id, { actor, content, link, preview });
    }
    
    return map;
  }, [notifications]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-muted-foreground hover:text-foreground">
          <Bell
            className={cn("h-5 w-5 origin-top", isRinging && "animate-bell-ring")}
            onAnimationEnd={() => setIsRinging(false)}
          />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border-border" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => {
                const data = notificationDataMap.get(notification.id);
                if (!data) return null;

                return (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    data={data}
                    onRead={handleMarkAsRead}
                    onClose={handleClosePopover}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

