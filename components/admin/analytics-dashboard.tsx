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

  return (
    <div className="space-y-8">
      {/* User Stats */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          User Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Users"
            value={data.users.total}
            icon={Users}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            title="Active This Week"
            value={data.users.activeThisWeek}
            icon={Activity}
            color="text-green-500"
            bgColor="bg-green-500/10"
            subtitle={`${Math.round((data.users.activeThisWeek / data.users.total) * 100) || 0}% of users`}
          />
          <StatCard
            title="New (30 days)"
            value={data.users.signupsOverTime.reduce((sum, d) => sum + d.count, 0)}
            icon={TrendingUp}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
        </div>

        {/* Signups Chart */}
        <Card className="mt-4 p-4 bg-card border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Signups (Last 30 Days)</h4>
          <div className="h-32 flex items-end gap-1">
            {data.users.signupsOverTime.map((point, index) => {
              const height = maxSignups > 0 ? (point.count / maxSignups) * 100 : 0;
              const date = new Date(point.date);
              const isToday = point.date === new Date().toISOString().split('T')[0];
              
              return (
                <div
                  key={point.date}
                  className="flex-1 group relative"
                  title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${point.count} signup${point.count !== 1 ? 's' : ''}`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isToday ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </Card>
      </section>

      {/* Content Stats */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Content Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Uploads"
            value={data.content.totalUploads}
            icon={Upload}
            color="text-amber-500"
            bgColor="bg-amber-500/10"
          />
          <StatCard
            title="Total Likes"
            value={data.content.totalLikes}
            icon={Heart}
            color="text-red-500"
            bgColor="bg-red-500/10"
          />
          <StatCard
            title="Total Comments"
            value={data.content.totalComments}
            icon={MessageSquare}
            color="text-cyan-500"
            bgColor="bg-cyan-500/10"
          />
          <StatCard
            title="Total Views"
            value={data.content.totalViews}
            icon={Eye}
            color="text-indigo-500"
            bgColor="bg-indigo-500/10"
          />
        </div>
      </section>

      {/* Storage Usage */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Storage Usage
        </h3>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
              <HardDrive className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{data.storage.totalFormatted}</p>
              <p className="text-sm text-muted-foreground">Total storage used</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Top Contributors */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Contributors
        </h3>
        {data.topContributors.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contributors yet</p>
          </Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Uploads
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Likes Received
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topContributors.map((contributor, index) => (
                  <tr
                    key={contributor.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={contributor.avatar_url || undefined} />
                          <AvatarFallback>
                            {contributor.display_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {contributor.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground">@{contributor.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-foreground">
                        <Upload className="h-3.5 w-3.5 text-amber-500" />
                        {contributor.upload_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-foreground">
                        <Heart className="h-3.5 w-3.5 text-red-500" />
                        {contributor.like_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-foreground">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
                        {contributor.comment_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor, subtitle }: StatCardProps) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

