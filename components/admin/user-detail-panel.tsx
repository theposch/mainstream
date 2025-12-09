"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  Mail,
  Briefcase,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  Crown,
  ShieldCheck,
  Shield,
  Layers,
  Clock,
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

  // Fetch user details when panel opens
  React.useEffect(() => {
    if (!open || !user) {
      setDetails(null);
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
            <div className="p-6">
              {/* Header */}
              <SheetHeader className="p-0 mb-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    <AvatarImage
                      src={details.user.avatar_url || undefined}
                      alt={details.user.username}
                    />
                    <AvatarFallback className="text-lg">
                      {details.user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SheetTitle className="text-xl truncate">
                        {details.user.display_name}
                      </SheetTitle>
                      <Badge
                        variant="outline"
                        className={`${roleConfig[role].color} shrink-0`}
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleConfig[role].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{details.user.username}
                    </p>
                    {details.user.bio && (
                      <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                        {details.user.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* User Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    <span className="truncate max-w-[200px]">
                      {details.user.email}
                    </span>
                  </div>
                  {details.user.job_title && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      <span>{details.user.job_title}</span>
                    </div>
                  )}
                  {details.user.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{details.user.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined{" "}
                      {formatDistanceToNow(new Date(details.user.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <StatCard
                  icon={Upload}
                  label="Uploads"
                  value={details.stats.totalUploads}
                  color="text-emerald-500"
                />
                <StatCard
                  icon={Heart}
                  label="Likes"
                  value={details.stats.totalLikes}
                  color="text-rose-500"
                />
                <StatCard
                  icon={MessageSquare}
                  label="Comments"
                  value={details.stats.totalComments}
                  color="text-cyan-500"
                />
                <StatCard
                  icon={Eye}
                  label="Views"
                  value={details.stats.totalViews}
                  color="text-blue-500"
                />
              </div>

              {/* Storage & Streams */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Storage Used</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {details.stats.storageFormatted}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Streams</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {details.stats.streamsOwned + details.stats.streamsMember}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({details.stats.streamsOwned} owned)
                    </span>
                  </p>
                </div>
              </div>

              {/* Recent Uploads */}
              {details.recentUploads.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Recent Uploads
                    </h3>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/u/${details.user.username}`}
                        target="_blank"
                      >
                        View Profile
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {details.recentUploads.slice(0, 8).map((upload) => (
                      <Link
                        key={upload.id}
                        href={`/shots/${upload.id}`}
                        target="_blank"
                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors"
                      >
                        {upload.thumbnail_url ? (
                          <Image
                            src={upload.thumbnail_url}
                            alt={upload.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="flex items-center gap-2 text-white text-xs">
                            <span className="flex items-center gap-0.5">
                              <Heart className="h-3 w-3" />
                              {upload.like_count}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {upload.view_count}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              {details.recentActivity.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {details.recentActivity.slice(0, 10).map((activity, idx) => {
                      const ActivityIcon = activityIcons[activity.type];
                      return (
                        <div
                          key={`${activity.type}-${activity.timestamp}-${idx}`}
                          className="flex items-start gap-3"
                        >
                          <div
                            className={`p-1.5 rounded-full ${activityColors[activity.type]}`}
                          >
                            <ActivityIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              {activity.type === "upload" && "Uploaded "}
                              {activity.type === "like" && "Liked "}
                              {activity.type === "comment" && "Commented on "}
                              <Link
                                href={`/shots/${activity.details.assetId}`}
                                target="_blank"
                                className="font-medium hover:underline"
                              >
                                {activity.details.assetTitle}
                              </Link>
                            </p>
                            {activity.type === "comment" &&
                              activity.details.commentContent && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  "{activity.details.commentContent}"
                                </p>
                              )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(
                                new Date(activity.timestamp),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                          {activity.details.assetThumbnail && (
                            <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
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
                </div>
              )}

              {/* Empty state */}
              {details.recentActivity.length === 0 &&
                details.recentUploads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No activity yet</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

