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
  TrendingDown,
  Loader2,
  AlertCircle,
  Activity,
  Trophy,
  Minus,
} from "lucide-react";

interface WeeklyActivity {
  week: number;
  label: string;
  startDate: string;
  endDate: string;
  uploads: number;
  likes: number;
  comments: number;
  views: number;
  total: number;
}

interface PeriodComparison {
  uploads: { current: number; previous: number; change: number };
  likes: { current: number; previous: number; change: number };
  comments: { current: number; previous: number; change: number };
  views: { current: number; previous: number; change: number };
  total: { current: number; previous: number; change: number };
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
    newThisMonth: number;
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
  weeklyActivity: WeeklyActivity[];
  comparison: PeriodComparison;
  topContributors: TopContributor[];
}

const activityColors = {
  uploads: { bg: 'bg-amber-500', label: 'Uploads' },
  likes: { bg: 'bg-rose-500', label: 'Likes' },
  comments: { bg: 'bg-cyan-500', label: 'Comments' },
  views: { bg: 'bg-blue-500', label: 'Views' },
};

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

  // Calculate max total for chart scaling
  const maxTotal = Math.max(...data.weeklyActivity.map(w => w.total), 1);

  return (
    <div className="space-y-6">
      {/* Top Row: User Metrics */}
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

      {/* Period Comparison Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ComparisonCard
          label="Uploads"
          icon={Upload}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
          current={data.comparison.uploads.current}
          change={data.comparison.uploads.change}
        />
        <ComparisonCard
          label="Likes"
          icon={Heart}
          color="text-rose-500"
          bgColor="bg-rose-500/10"
          current={data.comparison.likes.current}
          change={data.comparison.likes.change}
        />
        <ComparisonCard
          label="Comments"
          icon={MessageSquare}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
          current={data.comparison.comments.current}
          change={data.comparison.comments.change}
        />
        <ComparisonCard
          label="Views"
          icon={Eye}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          current={data.comparison.views.current}
          change={data.comparison.views.change}
        />
      </div>

      {/* Weekly Activity Chart */}
      <Card className="p-6 bg-card/50 border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Weekly Activity</h3>
            <p className="text-sm text-muted-foreground">Platform engagement over the last 4 weeks</p>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            {Object.entries(activityColors).map(([key, { bg, label }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="flex items-end gap-4 h-52">
          {data.weeklyActivity.map((week) => {
            const totalHeight = maxTotal > 0 ? (week.total / maxTotal) * 100 : 0;
            const uploadsHeight = week.total > 0 ? (week.uploads / week.total) * totalHeight : 0;
            const likesHeight = week.total > 0 ? (week.likes / week.total) * totalHeight : 0;
            const commentsHeight = week.total > 0 ? (week.comments / week.total) * totalHeight : 0;
            const viewsHeight = week.total > 0 ? (week.views / week.total) * totalHeight : 0;
            
            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-3">
                {/* Stacked Bar */}
                <div className="w-full flex flex-col-reverse items-stretch group relative" style={{ height: '180px' }}>
                  {/* Tooltip */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-popover border border-border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <p className="font-medium text-foreground mb-2">{week.label}</p>
                    <div className="space-y-1 text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-amber-500"></span>
                        {week.uploads} uploads
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-rose-500"></span>
                        {week.likes} likes
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-cyan-500"></span>
                        {week.comments} comments
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-blue-500"></span>
                        {week.views} views
                      </p>
                      <p className="pt-1 border-t border-border font-medium text-foreground">
                        {week.total} total
                      </p>
                    </div>
                  </div>
                  
                  {/* Empty state */}
                  {week.total === 0 && (
                    <div className="w-full bg-muted/30 rounded-lg" style={{ height: '8px' }} />
                  )}
                  
                  {/* Stacked segments */}
                  {week.total > 0 && (
                    <div className="w-full flex flex-col-reverse rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]">
                      {viewsHeight > 0 && (
                        <div 
                          className="w-full bg-blue-500 transition-all"
                          style={{ height: `${(viewsHeight / 100) * 180}px` }}
                        />
                      )}
                      {commentsHeight > 0 && (
                        <div 
                          className="w-full bg-cyan-500 transition-all"
                          style={{ height: `${(commentsHeight / 100) * 180}px` }}
                        />
                      )}
                      {likesHeight > 0 && (
                        <div 
                          className="w-full bg-rose-500 transition-all"
                          style={{ height: `${(likesHeight / 100) * 180}px` }}
                        />
                      )}
                      {uploadsHeight > 0 && (
                        <div 
                          className="w-full bg-amber-500 transition-all"
                          style={{ height: `${(uploadsHeight / 100) * 180}px` }}
                        />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Week Label */}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{week.label}</p>
                  <p className="text-xs text-muted-foreground">{week.total} total</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  isString?: boolean;
}

function MetricCard({ label, value, icon: Icon, iconColor, iconBg, isString }: MetricCardProps) {
  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            {isString ? value : (value as number).toLocaleString()}
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

// Comparison Card Component
interface ComparisonCardProps {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current: number;
  change: number;
}

function ComparisonCard({ label, icon: Icon, color, bgColor, current, change }: ComparisonCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;
  
  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-start justify-between mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
        }`}>
          {isPositive && <TrendingUp className="h-3 w-3" />}
          {isNegative && <TrendingDown className="h-3 w-3" />}
          {isNeutral && <Minus className="h-3 w-3" />}
          {isPositive && '+'}
          {change}%
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{current}</p>
      <p className="text-xs text-muted-foreground">{label} this week</p>
    </Card>
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
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-3 border ${getRankStyle(rank)}`}>
        {rank}
      </div>
      
      <Avatar className="h-12 w-12 mb-2 ring-2 ring-border">
        <AvatarImage src={contributor.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-sm">
          {contributor.display_name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <p className="text-sm font-medium text-foreground text-center truncate w-full">
        {contributor.display_name}
      </p>
      <p className="text-xs text-muted-foreground truncate w-full text-center">
        @{contributor.username}
      </p>
      
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
