"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { notifications as initialNotifications, Notification } from "@/lib/mock-data/notifications";
import { users } from "@/lib/mock-data/users";
import { assets } from "@/lib/mock-data/assets";
import { formatRelativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NotificationsPopover() {
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = React.useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getNotificationContent = (notification: Notification) => {
    const actor = users.find(u => u.id === notification.actorId);
    
    if (!actor) return null;

    let content = "";
    let icon = null;
    let link = "#";

    switch (notification.type) {
      case 'like_asset':
        const asset = assets.find(a => a.id === notification.resourceId);
        content = `liked your asset "${asset?.title || 'Unknown Asset'}"`;
        link = `/e/${notification.resourceId}`;
        break;
      case 'like_comment':
        content = "liked your comment";
        // In a real app, this would anchor to the comment
        link = "#"; 
        break;
      case 'reply_comment':
        content = "replied to your comment";
        link = "#";
        break;
      case 'follow':
        content = "started following you";
        link = `/u/${actor.username}`;
        break;
      case 'mention':
        content = "mentioned you in a comment";
        link = "#";
        break;
    }

    return { actor, content, link };
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-black" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-800" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h4 className="font-semibold text-sm text-white">Notifications</h4>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Bell className="h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {notifications.map((notification) => {
                const data = getNotificationContent(notification);
                if (!data) return null;

                return (
                  <Link
                    key={notification.id}
                    href={data.link}
                    onClick={() => {
                        handleMarkAsRead(notification.id);
                        setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors",
                      !notification.isRead && "bg-zinc-800/30"
                    )}
                  >
                    <Avatar className="h-8 w-8 border border-border mt-0.5">
                      <AvatarImage src={data.actor.avatarUrl} />
                      <AvatarFallback>{data.actor.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-zinc-300 leading-snug">
                        <span className="font-medium text-white">{data.actor.displayName}</span>{" "}
                        {data.content}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

