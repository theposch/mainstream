"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Heart,
  MessageSquare,
  Eye,
  HardDrive,
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  Crown,
  ShieldCheck,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { PlatformRole } from "@/lib/types/database";
import type { AdminUser } from "@/lib/types/admin";

interface UserActivity {
  type: "upload" | "like" | "comment";
  timestamp: string;
  details: {
    assetId: string;
    assetTitle: string;
    assetThumbnail?: string;
    commentContent?: string;
  };
}

interface UserUpload {
  id: string;
  title: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  view_count: number;
}

interface UserDetails {
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    job_title: string | null;
    location: string | null;
    platform_role: string;
    created_at: string;
    updated_at: string;
  };
  stats: {
    totalUploads: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    storageUsed: number;
    storageFormatted: string;
    streamsOwned: number;
    streamsMember: number;
  };
  recentActivity: UserActivity[];
  recentUploads: UserUpload[];
}

interface UserDetailPanelProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleConfig: Record<
  PlatformRole,
  { label: string; icon: React.ElementType; color: string }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  user: {
    label: "User",
    icon: Shield,
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
};

const activityIcons = {
  upload: Upload,
  like: Heart,
  comment: MessageSquare,
};

const activityColors = {
  upload: "text-emerald-500 bg-emerald-500/10",
  like: "text-rose-500 bg-rose-500/10",
  comment: "text-cyan-500 bg-cyan-500/10",
};

export function UserDetailPanel({
  user,
  open,
  onOpenChange,
}: UserDetailPanelProps) {
  const [details, setDetails] = React.useState<UserDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAllActivity, setShowAllActivity] = React.useState(false);

  // Fetch user details when panel opens
  React.useEffect(() => {
    if (!open || !user) {
      setDetails(null);
      setShowAllActivity(false);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${user.id}/details`);
        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }
        const data = await response.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, user]);

  const role = (user?.platform_role || "user") as PlatformRole;
  const RoleIcon = roleConfig[role].icon;

  // Count activity by type
  const activitySummary = React.useMemo(() => {
    if (!details) return { uploads: 0, likes: 0, comments: 0 };
    return details.recentActivity.reduce(
      (acc, activity) => {
        acc[activity.type === "upload" ? "uploads" : activity.type === "like" ? "likes" : "comments"]++;
        return acc;
      },
      { uploads: 0, likes: 0, comments: 0 }
    );
  }, [details]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 bg-background border-border"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : details ? (
          <ScrollArea className="h-full">
            {/* Hero Section */}
            <div className="bg-gradient-to-b from-muted/50 to-background p-6 pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                  <AvatarImage
                    src={details.user.avatar_url || undefined}
                    alt={details.user.username}
                  />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {details.user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-semibold truncate">
                      {details.user.display_name}
                    </h2>
                    <Badge
                      variant="outline"
                      className={`${roleConfig[role].color} shrink-0 text-[10px] px-1.5 py-0`}
                    >
                      <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                      {roleConfig[role].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{details.user.username}
                    {details.user.job_title && (
                      <span className="mx-1.5">•</span>
                    )}
                    {details.user.job_title && (
                      <span>{details.user.job_title}</span>
                    )}
                  </p>
                  {details.user.bio && (
                    <p className="text-sm text-foreground/70 mt-1.5 line-clamp-1">
                      {details.user.bio}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={`/u/${details.user.username}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Quick Info Bar */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(details.user.created_at), "MMM d, yyyy")}
                </span>
                <span className="truncate">{details.user.email}</span>
              </div>
            </div>

            {/* Stats Row - Unified */}
            <div className="px-6 py-4 border-b border-border">
              <div className="grid grid-cols-6 gap-2">
                <StatPill icon={Upload} value={details.stats.totalUploads} label="Uploads" color="text-emerald-500" />
                <StatPill icon={Heart} value={details.stats.totalLikes} label="Likes" color="text-rose-500" />
                <StatPill icon={MessageSquare} value={details.stats.totalComments} label="Comments" color="text-cyan-500" />
                <StatPill icon={Eye} value={details.stats.totalViews} label="Views" color="text-blue-500" />
                <StatPill icon={HardDrive} value={details.stats.storageFormatted} label="Storage" color="text-purple-500" isText />
                <StatPill icon={Layers} value={details.stats.streamsOwned + details.stats.streamsMember} label="Streams" color="text-amber-500" />
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
              {/* Recent Uploads - 6 columns */}
              {details.recentUploads.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground">
                      Uploads
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {details.stats.totalUploads} total
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {details.recentUploads.slice(0, 12).map((upload) => (
                      <Link
                        key={upload.id}
                        href={`/shots/${upload.id}`}
                        target="_blank"
                        className="group relative aspect-square rounded-md overflow-hidden bg-muted hover:ring-2 hover:ring-primary/50 transition-all"
                      >
                        {upload.thumbnail_url ? (
                          <Image
                            src={upload.thumbnail_url}
                            alt={upload.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        {/* Minimal hover overlay */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center gap-1.5 text-white text-[10px]">
                            <Heart className="h-2.5 w-2.5" />
                            <span>{upload.like_count}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Summary - Compact */}
              {details.recentActivity.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Recent Activity</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {activitySummary.uploads > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {activitySummary.uploads} uploads
                          </span>
                        )}
                        {activitySummary.likes > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {activitySummary.likes} likes
                          </span>
                        )}
                        {activitySummary.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                            {activitySummary.comments} comments
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showAllActivity ? "rotate-90" : ""}`} />
                  </button>

                  {/* Expanded Activity List */}
                  {showAllActivity && (
                    <div className="mt-3 space-y-2 pl-1">
                      {details.recentActivity.slice(0, 15).map((activity, idx) => {
                        const ActivityIcon = activityIcons[activity.type];
                        return (
                          <div
                            key={`${activity.type}-${activity.timestamp}-${idx}`}
                            className="flex items-center gap-3 py-1.5"
                          >
                            <div className={`p-1 rounded ${activityColors[activity.type]}`}>
                              <ActivityIcon className="h-3 w-3" />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <Link
                                href={`/shots/${activity.details.assetId}`}
                                target="_blank"
                                className="text-sm truncate hover:underline"
                              >
                                {activity.details.assetTitle}
                              </Link>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            {activity.details.assetThumbnail && (
                              <div className="relative h-7 w-7 rounded overflow-hidden bg-muted shrink-0">
                                <Image
                                  src={activity.details.assetThumbnail}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {details.recentActivity.length === 0 && details.recentUploads.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
  color,
  isText = false,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-sm font-semibold">
          {isText ? value : (typeof value === 'number' ? value.toLocaleString() : value)}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

