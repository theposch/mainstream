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
  Image,
  Trophy,
} from "lucide-react";

interface SignupDataPoint {
  date: string;
  count: number;
}

interface TopContributor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  upload_count: number;
  like_count: number;
  comment_count: number;
}

interface AnalyticsData {
  users: {
    total: number;
    activeThisWeek: number;
    signupsOverTime: SignupDataPoint[];
  };
  content: {
    totalUploads: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
  };
  storage: {
    totalBytes: number;
    totalFormatted: string;
  };
  topContributors: TopContributor[];
}

export function AnalyticsDashboard() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const analyticsData = await response.json();
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

  // Calculate max signups for chart scaling
  const maxSignups = Math.max(...data.users.signupsOverTime.map(d => d.count), 1);
  const newUsersCount = data.users.signupsOverTime.reduce((sum, d) => sum + d.count, 0);
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
          value={newUsersCount}
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

      {/* Middle Row: Chart + Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups Chart - Takes 2 columns */}
        <Card className="lg:col-span-2 p-6 bg-card/50 border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">User Growth</h3>
              <p className="text-sm text-muted-foreground">New signups over the last 30 days</p>
            </div>
            {newUsersCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                +{newUsersCount}
              </div>
            )}
          </div>
          
          <div className="h-40 flex items-end gap-[3px]">
            {data.users.signupsOverTime.map((point) => {
              const height = maxSignups > 0 ? (point.count / maxSignups) * 100 : 0;
              const date = new Date(point.date);
              const isToday = point.date === new Date().toISOString().split('T')[0];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              
              return (
                <div
                  key={point.date}
                  className="flex-1 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-popover border border-border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-medium text-foreground">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <p className="text-muted-foreground">{point.count} signup{point.count !== 1 ? 's' : ''}</p>
                  </div>
                  
                  {/* Bar */}
                  <div
                    className={`w-full rounded-sm transition-all duration-150 cursor-pointer ${
                      isToday 
                        ? 'bg-emerald-500' 
                        : isWeekend
                          ? 'bg-muted-foreground/20 hover:bg-muted-foreground/30'
                          : 'bg-primary/50 hover:bg-primary/70'
                    }`}
                    style={{ height: `${Math.max(height, 3)}%` }}
                  />
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
            <Image className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Content</h3>
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
