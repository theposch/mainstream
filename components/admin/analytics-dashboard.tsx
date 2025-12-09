"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Users,
  Upload,
  Heart,
  MessageSquare,
  Eye,
  HardDrive,
  TrendingUp,
  Loader2,
  AlertCircle,
  Activity,
  Trophy,
} from "lucide-react";
import type {
  ActivityDataPoint,
  RawActivityData,
  AnalyticsApiResponse,
  AnalyticsData,
  TopContributor,
} from "@/lib/types/admin";

/**
 * Convert ISO timestamp to local date string (YYYY-MM-DD)
 */
function toLocalDateString(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Bucket raw timestamps by local date
 */
function bucketActivityByLocalDate(rawActivity: RawActivityData): ActivityDataPoint[] {
  const now = new Date();
  const activityByDate = new Map<string, ActivityDataPoint>();
  
  // Generate 30 days of local dates (29 days ago to today)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    activityByDate.set(dateStr, { date: dateStr, uploads: 0, likes: 0, comments: 0, views: 0 });
  }

  // Bucket activity by local date
  rawActivity.uploads.forEach(timestamp => {
    const dateStr = toLocalDateString(timestamp);
    const activity = activityByDate.get(dateStr);
    if (activity) activity.uploads++;
  });

  rawActivity.likes.forEach(timestamp => {
    const dateStr = toLocalDateString(timestamp);
    const activity = activityByDate.get(dateStr);
    if (activity) activity.likes++;
  });

  rawActivity.comments.forEach(timestamp => {
    const dateStr = toLocalDateString(timestamp);
    const activity = activityByDate.get(dateStr);
    if (activity) activity.comments++;
  });

  rawActivity.views.forEach(timestamp => {
    const dateStr = toLocalDateString(timestamp);
    const activity = activityByDate.get(dateStr);
    if (activity) activity.views++;
  });

  return Array.from(activityByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

type ActivityType = 'uploads' | 'likes' | 'comments' | 'views';

const activityConfig: Record<ActivityType, { label: string; color: string; bgColor: string }> = {
  uploads: { label: 'Uploads', color: 'bg-amber-500', bgColor: 'bg-amber-500/20' },
  likes: { label: 'Likes', color: 'bg-rose-500', bgColor: 'bg-rose-500/20' },
  comments: { label: 'Comments', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/20' },
  views: { label: 'Views', color: 'bg-blue-500', bgColor: 'bg-blue-500/20' },
};

export function AnalyticsDashboard() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityType>('views');

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const apiData: AnalyticsApiResponse = await response.json();
        
        // Process raw timestamps into local date buckets
        const activityOverTime = bucketActivityByLocalDate(apiData.rawActivity);
        
        // Convert API response to client data structure
        const analyticsData: AnalyticsData = {
          users: apiData.users,
          content: apiData.content,
          storage: apiData.storage,
          activityOverTime,
          topContributors: apiData.topContributors,
        };
        
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Failed to load analytics</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // Get max value for the selected activity type for scaling
  const maxActivity = Math.max(
    ...data.activityOverTime.map(d => d[selectedActivity]),
    1
  );
  
  // Calculate total activity for selected type in last 30 days
  const totalSelectedActivity = data.activityOverTime.reduce(
    (sum, d) => sum + d[selectedActivity],
    0
  );

  const engagementRate = data.users.total > 0 
    ? Math.round((data.users.activeThisWeek / data.users.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Users"
          value={data.users.total}
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <MetricCard
          label="Active This Week"
          value={data.users.activeThisWeek}
          subtitle={`${engagementRate}% engagement`}
          icon={Activity}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <MetricCard
          label="New Users (30d)"
          value={data.users.newThisMonth}
          icon={TrendingUp}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
        />
        <MetricCard
          label="Storage Used"
          value={data.storage.totalFormatted}
          isString
          icon={HardDrive}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Middle Row: Activity Chart + Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart - Takes 2 columns */}
        <Card className="lg:col-span-2 p-6 bg-card/50 border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Platform Activity</h3>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
              {totalSelectedActivity.toLocaleString()} {activityConfig[selectedActivity].label.toLowerCase()}
            </div>
          </div>
          
          {/* Activity Type Selector */}
          <div className="flex gap-2 mb-5">
            {(Object.keys(activityConfig) as ActivityType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedActivity(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                  selectedActivity === type
                    ? `${activityConfig[type].color} text-white`
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {activityConfig[type].label}
              </button>
            ))}
          </div>
          
          {/* Bar Chart */}
          <div className="h-44 flex items-end gap-[2px] bg-muted/20 rounded-lg p-2 pb-0">
            {data.activityOverTime.map((point, index) => {
              const value = point[selectedActivity];
              const height = maxActivity > 0 ? (value / maxActivity) * 100 : 0;
              // Parse date string as LOCAL time by adding T00:00:00 (avoids UTC interpretation)
              const date = new Date(point.date + 'T00:00:00');
              // The last bar is always "today" since we generate 30 days ending at today
              const isToday = index === data.activityOverTime.length - 1;
              
              return (
                <div
                  key={point.date}
                  className="flex-1 group relative min-w-[4px]"
                  style={{ height: '100%' }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-medium text-foreground mb-1">
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="space-y-0.5 text-muted-foreground">
                      <p><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>{point.uploads} uploads</p>
                      <p><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>{point.likes} likes</p>
                      <p><span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-1.5"></span>{point.comments} comments</p>
                      <p><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>{point.views} views</p>
                    </div>
                  </div>
                  
                  {/* Bar container - full height, bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <div
                      className={`w-full rounded-sm transition-all duration-150 cursor-pointer ${
                        value > 0
                          ? isToday 
                            ? activityConfig[selectedActivity].color
                            : `${activityConfig[selectedActivity].color} opacity-60 hover:opacity-100`
                          : 'bg-muted-foreground/10'
                      }`}
                      style={{ 
                        height: value > 0 
                          ? `${Math.max((height / 100) * 160, 8)}px`
                          : '2px'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </Card>

        {/* Content Stats - Right Column */}
        <Card className="p-6 bg-card/50 border-border">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">All-Time Stats</h3>
          </div>
          
          <div className="space-y-4">
            <ContentStatRow
              icon={Upload}
              label="Uploads"
              value={data.content.totalUploads}
              color="text-amber-500"
            />
            <ContentStatRow
              icon={Eye}
              label="Views"
              value={data.content.totalViews}
              color="text-blue-500"
            />
            <ContentStatRow
              icon={Heart}
              label="Likes"
              value={data.content.totalLikes}
              color="text-rose-500"
            />
            <ContentStatRow
              icon={MessageSquare}
              label="Comments"
              value={data.content.totalComments}
              color="text-cyan-500"
            />
          </div>
          
          {/* Storage Usage */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Storage</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.storage.totalFormatted}</p>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Top Contributors */}
      <Card className="p-6 bg-card/50 border-border">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-base font-semibold text-foreground">Top Contributors</h3>
        </div>
        
        {data.topContributors.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No contributors yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.topContributors.slice(0, 5).map((contributor, index) => (
              <ContributorCard
                key={contributor.id}
                contributor={contributor}
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  isString?: boolean;
}

function MetricCard({ label, value, subtitle, icon: Icon, iconColor, iconBg, isString }: MetricCardProps) {
  return (
    <Card className="p-4 bg-card/50 border-border hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            {isString ? value : (value as number).toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

// Content Stat Row Component
interface ContentStatRowProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function ContentStatRow({ icon: Icon, label, value, color }: ContentStatRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// Contributor Card Component
interface ContributorCardProps {
  contributor: TopContributor;
  rank: number;
}

function ContributorCard({ contributor, rank }: ContributorCardProps) {
  const getRankStyle = (r: number) => {
    if (r === 1) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (r === 2) return "bg-zinc-400/20 text-zinc-300 border-zinc-400/30";
    if (r === 3) return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Rank Badge */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-3 border ${getRankStyle(rank)}`}>
        {rank}
      </div>
      
      {/* Avatar */}
      <Avatar className="h-12 w-12 mb-2 ring-2 ring-border">
        <AvatarImage src={contributor.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-sm">
          {contributor.display_name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Name */}
      <p className="text-sm font-medium text-foreground text-center truncate w-full">
        {contributor.display_name}
      </p>
      <p className="text-xs text-muted-foreground truncate w-full text-center">
        @{contributor.username}
      </p>
      
      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Upload className="h-3 w-3 text-amber-500" />
          {contributor.upload_count}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Heart className="h-3 w-3 text-rose-500" />
          {contributor.like_count}
        </span>
      </div>
    </div>
  );
}
