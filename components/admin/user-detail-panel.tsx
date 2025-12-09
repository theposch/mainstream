"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Copy,
  Check,
  Trash2,
  Settings,
  LayoutGrid,
  Activity,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import type { PlatformRole } from "@/lib/types/database";
import type { AdminUser } from "@/lib/types/admin";
import type { User } from "@/lib/auth/get-user";

// ============================================================================
// TYPES
// ============================================================================

interface UserActivity {
  type: "upload" | "like" | "comment" | "stream";
  timestamp: string;
  details: {
    assetId?: string;
    assetTitle?: string;
    assetThumbnail?: string;
    commentContent?: string;
    streamId?: string;
    streamName?: string;
    streamCoverUrl?: string;
    // Streams the asset was uploaded to (for upload activities)
    streams?: Array<{ id: string; name: string }>;
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
  currentUser: User;
  onUserUpdated?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const roleConfig: Record<PlatformRole, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  admin: { label: "Admin", icon: ShieldCheck, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  user: { label: "User", icon: Shield, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

const activityIcons = {
  upload: Upload,
  like: Heart,
  comment: MessageSquare,
  stream: Layers,
};

const activityColors = {
  upload: "text-emerald-500 bg-emerald-500/10",
  like: "text-rose-500 bg-rose-500/10",
  comment: "text-cyan-500 bg-cyan-500/10",
  stream: "text-violet-500 bg-violet-500/10",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserDetailPanel({
  user,
  open,
  onOpenChange,
  currentUser,
  onUserUpdated,
}: UserDetailPanelProps) {
  const [details, setDetails] = React.useState<UserDetails | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [copied, setCopied] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const isOwner = currentUser.platformRole === "owner";
  const isCurrentUser = user?.id === currentUser.id;
  const canChangeRole = isOwner && !isCurrentUser;
  const canDelete = !isCurrentUser && user?.platform_role !== "owner" && 
    (isOwner || user?.platform_role === "user");

  // Fetch user details when panel opens
  React.useEffect(() => {
    if (!open || !user) {
      setDetails(null);
      setActiveTab("overview");
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${user.id}/details`);
        if (!response.ok) throw new Error("Failed to fetch user details");
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

  // Copy email to clipboard
  const handleCopyEmail = async () => {
    if (!details?.user.email) return;
    await navigator.clipboard.writeText(details.user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Change user role
  const handleRoleChange = async (newRole: PlatformRole) => {
    if (!user || !details) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Update local state
      setDetails({
        ...details,
        user: { ...details.user, platform_role: newRole },
      });
      onUserUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!user) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      onUserUpdated?.();
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const role = (details?.user.platform_role || user?.platform_role || "user") as PlatformRole;
  const RoleIcon = roleConfig[role].icon;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[560px] p-0 bg-background border-border flex flex-col"
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
            <div className="flex flex-col h-full overflow-hidden">
              {/* Fixed Header */}
              <div className="p-6 pb-0 border-b border-border shrink-0">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={details.user.avatar_url || undefined} alt={details.user.username} />
                    <AvatarFallback className="text-lg">
                      {details.user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-lg font-semibold truncate">{details.user.display_name}</h2>
                      <Badge variant="outline" className={`${roleConfig[role].color} shrink-0`}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleConfig[role].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{details.user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCopyEmail}
                      >
                        {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copied ? "Copied!" : details.user.email}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/u/${details.user.username}`} target="_blank">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tabs - matching admin page style */}
                <nav className="flex gap-1">
                  {[
                    { id: "overview", label: "Overview", icon: null },
                    { id: "uploads", label: "Uploads", icon: LayoutGrid },
                    { id: "activity", label: "Activity", icon: Activity },
                    { id: "manage", label: "Manage", icon: Settings },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "px-4 py-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors",
                          isActive
                            ? "text-foreground border-primary"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                        )}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content - Scrollable */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 pb-12">
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <OverviewTab details={details} />
                    </div>
                  )}
                  {activeTab === "uploads" && (
                    <UploadsTab uploads={details.recentUploads} stats={details.stats} />
                  )}
                  {activeTab === "activity" && (
                    <ActivityTab 
                      initialActivities={details.recentActivity} 
                      userId={details.user.id}
                    />
                  )}
                  {activeTab === "manage" && (
                    <div className="space-y-6">
                      <ManageTab
                        details={details}
                        canChangeRole={canChangeRole}
                        canDelete={canDelete}
                        isCurrentUser={isCurrentUser}
                        actionLoading={actionLoading}
                        onRoleChange={handleRoleChange}
                        onDeleteClick={() => setDeleteDialogOpen(true)}
                        onCopyEmail={handleCopyEmail}
                        copied={copied}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{details?.user.display_name}</span>?
              This action cannot be undone and will permanently delete their account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ details }: { details: UserDetails }) {
  // Calculate this week's activity
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const thisWeekActivity = details.recentActivity.filter(
    (a) => new Date(a.timestamp) >= oneWeekAgo
  );
  const uploadsThisWeek = thisWeekActivity.filter((a) => a.type === "upload").length;
  const likesThisWeek = thisWeekActivity.filter((a) => a.type === "like").length;
  const commentsThisWeek = thisWeekActivity.filter((a) => a.type === "comment").length;

  return (
    <>
      {/* About */}
      {(details.user.bio || details.user.job_title || details.user.location) && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h3>
          {details.user.bio && <p className="text-sm text-foreground mb-2">{details.user.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {details.user.job_title && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> {details.user.job_title}
              </span>
            )}
            {details.user.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {details.user.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Joined {formatDistanceToNow(new Date(details.user.created_at), { addSuffix: true })}
            </span>
          </div>
        </section>
      )}

      {/* Stats */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">At a Glance</h3>
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={Upload} label="Uploads" value={details.stats.totalUploads} color="text-emerald-500" />
          <StatCard icon={Heart} label="Likes" value={details.stats.totalLikes} color="text-rose-500" />
          <StatCard icon={Eye} label="Views" value={details.stats.totalViews} color="text-blue-500" />
          <StatCard icon={HardDrive} label="Storage" value={details.stats.storageFormatted} color="text-purple-500" isText />
        </div>
      </section>

      {/* This Week */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">This Week</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {uploadsThisWeek} uploads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {likesThisWeek} likes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            {commentsThisWeek} comments
          </span>
        </div>
      </section>

      {/* Latest Uploads */}
      {details.recentUploads.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Latest Uploads</h3>
          <div className="grid grid-cols-6 gap-1.5">
            {details.recentUploads.slice(0, 6).map((upload) => (
              <UploadThumbnail key={upload.id} upload={upload} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {details.recentActivity.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {details.recentActivity.slice(0, 5).map((activity, idx) => (
              <ActivityItem key={`${activity.type}-${activity.timestamp}-${idx}`} activity={activity} compact />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ============================================================================
// UPLOADS TAB
// ============================================================================

function UploadsTab({ uploads, stats }: { uploads: UserUpload[]; stats: UserDetails["stats"] }) {
  if (uploads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No uploads yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{stats.totalUploads} uploads • {stats.storageFormatted} total</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {uploads.map((upload) => (
          <UploadThumbnail key={upload.id} upload={upload} showStats />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

function ActivityTab({ 
  initialActivities, 
  userId 
}: { 
  initialActivities: UserActivity[]; 
  userId: string;
}) {
  // All activities fetched from API
  const [allActivities, setAllActivities] = React.useState<UserActivity[]>(initialActivities);
  // How many to currently show
  const [displayCount, setDisplayCount] = React.useState(30);
  const [loading, setLoading] = React.useState(false);
  const [hasFetchedAll, setHasFetchedAll] = React.useState(false);

  // Fetch all activities when component mounts or userId changes
  React.useEffect(() => {
    // Reset state
    setAllActivities(initialActivities);
    setDisplayCount(30);
    setHasFetchedAll(false);

    // If initial activities suggest there might be more, fetch all
    if (initialActivities.length >= 30) {
      const fetchAllActivities = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/admin/users/${userId}/activity`);
          if (!response.ok) throw new Error('Failed to load activity');
          
          const data = await response.json();
          setAllActivities(data.activities);
          setHasFetchedAll(true);
        } catch (error) {
          console.error('Error loading activity:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAllActivities();
    } else {
      setHasFetchedAll(true);
    }
  }, [userId, initialActivities]);

  // Activities currently displayed
  const activities = allActivities.slice(0, displayCount);
  const hasMore = displayCount < allActivities.length;
  const total = allActivities.length;

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + 30, allActivities.length));
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  // Group activities by day
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp);
    let key: string;
    if (isToday(date)) key = "Today";
    else if (isYesterday(date)) key = "Yesterday";
    else key = format(date, "MMMM d");
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
    return groups;
  }, {} as Record<string, UserActivity[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([day, dayActivities]) => (
        <section key={day}>
          {/* Day header with line */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          {/* Timeline */}
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
            
            {/* Activity items */}
            <div className="space-y-4">
              {dayActivities.map((activity, idx) => (
                <TimelineItem 
                  key={`${activity.type}-${activity.timestamp}-${idx}`} 
                  activity={activity}
                  isLast={idx === dayActivities.length - 1}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="pt-4 text-center">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading all activity...
          </Button>
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && (
        <div className="pt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="gap-2"
          >
            Show More
            <span className="text-muted-foreground">
              ({displayCount} of {total})
            </span>
          </Button>
        </div>
      )}

      {/* All loaded indicator */}
      {!loading && !hasMore && activities.length > 30 && (
        <div className="pt-4 text-center text-xs text-muted-foreground">
          All {activities.length} activities loaded
        </div>
      )}
    </div>
  );
}

function TimelineItem({ activity, isLast }: { activity: UserActivity; isLast: boolean }) {
  const ActivityIcon = activityIcons[activity.type];
  const time = format(new Date(activity.timestamp), "h:mm a");
  
  // Determine the link and title based on activity type
  const isStreamActivity = activity.type === "stream";
  const linkHref = isStreamActivity 
    ? `/stream/${activity.details.streamName}` 
    : `/shots/${activity.details.assetId}`;
  const title = isStreamActivity 
    ? activity.details.streamName 
    : activity.details.assetTitle;
  const thumbnailUrl = isStreamActivity 
    ? activity.details.streamCoverUrl 
    : activity.details.assetThumbnail;
  
  return (
    <div className="flex gap-3 relative">
      {/* Icon node on timeline */}
      <div className={cn(
        "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 border-background",
        activityColors[activity.type]
      )}>
        <ActivityIcon className="h-3 w-3" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm">
              <span className="text-muted-foreground">
                {activity.type === "upload" && "Uploaded "}
                {activity.type === "like" && "Liked "}
                {activity.type === "comment" && "Commented on "}
                {activity.type === "stream" && "Created stream "}
              </span>
              <Link
                href={linkHref}
                target="_blank"
                className="font-medium text-foreground hover:underline"
              >
                {title}
              </Link>
              {/* Show streams for uploads */}
              {activity.type === "upload" && activity.details.streams && activity.details.streams.length > 0 && (
                <span className="text-muted-foreground">
                  {" to "}
                  <StreamTags streams={activity.details.streams} />
                </span>
              )}
            </p>
            {activity.type === "comment" && activity.details.commentContent && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 bg-muted/50 rounded px-2 py-1">
                "{activity.details.commentContent}"
              </p>
            )}
          </div>
          
          {/* Thumbnail */}
          {thumbnailUrl && (
            <Link
              href={linkHref}
              target="_blank"
              className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0 border border-border hover:border-primary/50 transition-colors"
            >
              <Image
                src={thumbnailUrl}
                alt=""
                fill
                className="object-cover"
              />
            </Link>
          )}
        </div>
        
        {/* Time */}
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
}

// Stream tags component for showing which streams an asset belongs to
function StreamTags({ streams, maxShow = 2 }: { streams: Array<{ id: string; name: string }>; maxShow?: number }) {
  const visibleStreams = streams.slice(0, maxShow);
  const hiddenCount = streams.length - maxShow;

  return (
    <>
      {visibleStreams.map((stream, idx) => (
        <span key={stream.id}>
          {idx > 0 && " "}
          <Link
            href={`/stream/${stream.name}`}
            target="_blank"
            className="text-primary hover:underline font-medium"
          >
            #{stream.name}
          </Link>
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-muted-foreground text-xs ml-1">
          +{hiddenCount} more
        </span>
      )}
    </>
  );
}

// ============================================================================
// MANAGE TAB
// ============================================================================

function ManageTab({
  details,
  canChangeRole,
  canDelete,
  isCurrentUser,
  actionLoading,
  onRoleChange,
  onDeleteClick,
  onCopyEmail,
  copied,
}: {
  details: UserDetails;
  canChangeRole: boolean;
  canDelete: boolean;
  isCurrentUser: boolean;
  actionLoading: boolean;
  onRoleChange: (role: PlatformRole) => void;
  onDeleteClick: () => void;
  onCopyEmail: () => void;
  copied: boolean;
}) {
  const currentRole = details.user.platform_role as PlatformRole;
  const RoleIcon = roleConfig[currentRole].icon;

  return (
    <>
      {/* Role */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Role</h3>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Role</span>
            {canChangeRole ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={actionLoading}>
                    <RoleIcon className="h-3.5 w-3.5 mr-1.5" />
                    {roleConfig[currentRole].label}
                    <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRoleChange("user")} disabled={currentRole === "user"}>
                    <Shield className="h-4 w-4 mr-2 text-zinc-400" /> User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRoleChange("admin")} disabled={currentRole === "admin"}>
                    <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" /> Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRoleChange("owner")} disabled={currentRole === "owner"} className="text-amber-500">
                    <Crown className="h-4 w-4 mr-2" /> Transfer Ownership
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline" className={roleConfig[currentRole].color}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {roleConfig[currentRole].label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentRole === "owner" && "Full platform access including user management"}
            {currentRole === "admin" && "Can view all content and manage users"}
            {currentRole === "user" && "Standard user access"}
          </p>
          {!canChangeRole && !isCurrentUser && (
            <p className="text-xs text-amber-500 mt-2">Only the platform owner can change roles</p>
          )}
          {isCurrentUser && (
            <p className="text-xs text-muted-foreground mt-2">You cannot change your own role</p>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={onCopyEmail}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Email Copied!" : "Copy Email Address"}
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/u/${details.user.username}`} target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Profile
            </Link>
          </Button>
        </div>
      </section>

      {/* Danger Zone */}
      {canDelete && (
        <section>
          <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">Danger Zone</h3>
          <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Permanently delete this user</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will remove all their uploads, comments, likes, and cannot be undone.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={onDeleteClick}
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </section>
      )}

      {!canDelete && !isCurrentUser && (
        <section>
          <div className="bg-muted/30 rounded-lg p-4 border border-border text-center">
            <p className="text-sm text-muted-foreground">
              {details.user.platform_role === "owner" 
                ? "The platform owner cannot be deleted" 
                : "Only the owner can delete admin users"}
            </p>
          </div>
        </section>
      )}
    </>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-base font-bold">{isText ? value : (value as number).toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function UploadThumbnail({ upload, showStats = false }: { upload: UserUpload; showStats?: boolean }) {
  return (
    <Link
      href={`/shots/${upload.id}`}
      target="_blank"
      className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors"
    >
      {upload.thumbnail_url ? (
        <Image src={upload.thumbnail_url} alt={upload.title} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {showStats && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
          <div className="flex items-center gap-1.5 text-white text-[10px]">
            <span className="flex items-center gap-0.5">
              <Heart className="h-2.5 w-2.5" />
              {upload.like_count}
            </span>
            <span className="flex items-center gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              {upload.view_count}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

function ActivityItem({ activity, compact = false }: { activity: UserActivity; compact?: boolean }) {
  const ActivityIcon = activityIcons[activity.type];
  const isStreamActivity = activity.type === "stream";
  const linkHref = isStreamActivity 
    ? `/stream/${activity.details.streamName}` 
    : `/shots/${activity.details.assetId}`;
  const title = isStreamActivity 
    ? activity.details.streamName 
    : activity.details.assetTitle;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`p-1 rounded-full ${activityColors[activity.type]} shrink-0`}>
        <ActivityIcon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">
          {activity.type === "upload" && "Uploaded "}
          {activity.type === "like" && "Liked "}
          {activity.type === "comment" && "Commented on "}
          {activity.type === "stream" && "Created "}
        </span>
        <Link
          href={linkHref}
          target="_blank"
          className="font-medium text-foreground hover:underline truncate"
        >
          {title}
        </Link>
        {/* Show streams for uploads (compact: show only first one) */}
        {activity.type === "upload" && activity.details.streams && activity.details.streams.length > 0 && (
          <span className="text-muted-foreground">
            {" → "}
            <Link
              href={`/stream/${activity.details.streams[0].name}`}
              target="_blank"
              className="text-primary hover:underline"
            >
              #{activity.details.streams[0].name}
            </Link>
            {activity.details.streams.length > 1 && (
              <span className="text-xs ml-0.5">+{activity.details.streams.length - 1}</span>
            )}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {compact 
          ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: false })
          : format(new Date(activity.timestamp), "h:mm a")}
      </span>
    </div>
  );
}
