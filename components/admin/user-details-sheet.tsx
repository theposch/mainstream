"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Upload,
  Heart,
  MessageSquare,
  Eye,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Mail,
  User as UserIcon,
  Folder,
  Activity,
  Image as ImageIcon,
  Globe,
  Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserDetailsData {
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string;
    platform_role: string;
    created_at: string;
    bio?: string;
    location?: string;
    job_title?: string;
  };
  stats: {
    totalUploads: number;
    totalLikesReceived: number;
    totalComments: number;
    totalViews: number;
    streamsOwned: number;
  };
  lastActive: string;
  lastSignIn: string | null;
  recentAssets: Array<{
    id: string;
    name: string;
    file_type: string;
    thumbnail_url: string | null;
    preview_url: string | null;
    view_count: number;
    created_at: string;
    stream: { id: string; name: string } | null;
  }>;
  streams: Array<{
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    cover_image: string | null;
    created_at: string;
    assetCount: number;
  }>;
  activityTimeline: Array<{
    type: 'upload' | 'like' | 'comment' | 'view' | 'stream_created';
    timestamp: string;
    details: {
      assetId?: string;
      assetName?: string;
      streamId?: string;
      streamName?: string;
      commentText?: string;
    };
  }>;
}

interface UserDetailsSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsSheet({ userId, open, onOpenChange }: UserDetailsSheetProps) {
  const [data, setData] = React.useState<UserDetailsData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !open) {
      setData(null);
      return;
    }

    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${userId}/details`);
        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }
        const userData = await response.json();
        setData(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId, open]);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <Upload className="h-4 w-4 text-amber-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-sky-500" />;
      case 'stream_created':
        return <Folder className="h-4 w-4 text-emerald-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: UserDetailsData['activityTimeline'][0]) => {
    switch (activity.type) {
      case 'upload':
        return (
          <>
            Uploaded <span className="font-medium text-foreground">{activity.details.assetName}</span>
            {activity.details.streamName && (
              <> to <span className="text-muted-foreground">{activity.details.streamName}</span></>
            )}
          </>
        );
      case 'like':
        return (
          <>
            Liked <span className="font-medium text-foreground">{activity.details.assetName}</span>
          </>
        );
      case 'comment':
        return (
          <>
            Commented on <span className="font-medium text-foreground">{activity.details.assetName}</span>
            {activity.details.commentText && (
              <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                &ldquo;{activity.details.commentText}&rdquo;
              </span>
            )}
          </>
        );
      case 'stream_created':
        return (
          <>
            Created stream <span className="font-medium text-foreground">{activity.details.streamName}</span>
          </>
        );
      default:
        return 'Activity';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Header with user info */}
            <SheetHeader className="p-6 pb-4 border-b border-border bg-gradient-to-b from-muted/50 to-background">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={data.user.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {data.user.display_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-xl">{data.user.display_name}</SheetTitle>
                    <Badge variant="outline" className={getRoleBadgeStyle(data.user.platform_role)}>
                      {data.user.platform_role.charAt(0).toUpperCase() + data.user.platform_role.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">@{data.user.username}</p>
                  {data.user.bio && (
                    <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{data.user.bio}</p>
                  )}
                </div>
              </div>
              
              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {data.user.email}
                </span>
                {data.user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {data.user.location}
                  </span>
                )}
                {data.user.job_title && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {data.user.job_title}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDistanceToNow(new Date(data.user.created_at), { addSuffix: true })}
                </span>
              </div>
            </SheetHeader>

            {/* Stats bar */}
            <div className="grid grid-cols-5 gap-2 p-4 border-b border-border bg-muted/30">
              <StatBox icon={Upload} label="Uploads" value={data.stats.totalUploads} />
              <StatBox icon={Heart} label="Likes" value={data.stats.totalLikesReceived} />
              <StatBox icon={MessageSquare} label="Comments" value={data.stats.totalComments} />
              <StatBox icon={Eye} label="Views" value={data.stats.totalViews} />
              <StatBox icon={Folder} label="Streams" value={data.stats.streamsOwned} />
            </div>

            {/* Activity timestamps */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last active: </span>
                <span className="text-foreground font-medium">
                  {formatDistanceToNow(new Date(data.lastActive), { addSuffix: true })}
                </span>
              </div>
              {data.lastSignIn && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Last sign in: </span>
                  <span className="text-foreground font-medium">
                    {formatDistanceToNow(new Date(data.lastSignIn), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>

            {/* Tabs for content */}
            <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="activity" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Activity
                </TabsTrigger>
                <TabsTrigger 
                  value="assets" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Assets ({data.recentAssets.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="streams" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Streams ({data.streams.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="activity" className="m-0 p-4">
                  {data.activityTimeline.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {data.activityTimeline.map((activity, index) => (
                        <div
                          key={`${activity.type}-${activity.timestamp}-${index}`}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">
                              {getActivityText(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="assets" className="m-0 p-4">
                  {data.recentAssets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No assets uploaded</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {data.recentAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                        >
                          {asset.thumbnail_url || asset.preview_url ? (
                            <img
                              src={asset.thumbnail_url || asset.preview_url || ''}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs text-white font-medium truncate">{asset.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-white/70 mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <Eye className="h-3 w-3" />
                                  {asset.view_count}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="streams" className="m-0 p-4">
                  {data.streams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No streams created</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.streams.map((stream) => (
                        <div
                          key={stream.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted overflow-hidden">
                            {stream.cover_image ? (
                              <img
                                src={stream.cover_image}
                                alt={stream.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Folder className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{stream.name}</p>
                              {stream.visibility === 'private' ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Globe className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {stream.assetCount} asset{stream.assetCount !== 1 ? 's' : ''} • Created {formatDistanceToNow(new Date(stream.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// Small stat box component
function StatBox({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-lg font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

