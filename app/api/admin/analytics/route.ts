/**
 * Admin Analytics API Route
 * 
 * GET /api/admin/analytics - Get platform analytics data
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface WeeklyActivity {
  week: number; // 1-4, where 4 is current week
  label: string; // "This Week", "Last Week", etc.
  startDate: string;
  endDate: string;
  uploads: number;
  likes: number;
  comments: number;
  views: number;
  total: number;
}

interface PeriodComparison {
  uploads: { current: number; previous: number; change: number; };
  likes: { current: number; previous: number; change: number; };
  comments: { current: number; previous: number; change: number; };
  views: { current: number; previous: number; change: number; };
  total: { current: number; previous: number; change: number; };
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

interface AnalyticsResponse {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getWeekBounds(weeksAgo: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  
  // Get start of current week (Sunday)
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - currentDay);
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  
  // Calculate start and end of target week
  const start = new Date(startOfCurrentWeek);
  start.setDate(start.getDate() - (weeksAgo * 7));
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  const labels = ['This Week', 'Last Week', '2 Weeks Ago', '3 Weeks Ago'];
  
  return { start, end, label: labels[weeksAgo] || `${weeksAgo} Weeks Ago` };
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * GET /api/admin/analytics
 */
export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createAdminClient();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // === USER STATS ===
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Active users this week
    const [uploaders, likers, commenters, viewers] = await Promise.all([
      supabase.from('assets').select('uploader_id').gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('asset_likes').select('user_id').gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('asset_comments').select('user_id').gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('asset_views').select('user_id').gte('viewed_at', oneWeekAgo.toISOString()),
    ]);

    const activeUserIds = new Set<string>();
    (uploaders.data || []).forEach(r => activeUserIds.add(r.uploader_id));
    (likers.data || []).forEach(r => activeUserIds.add(r.user_id));
    (commenters.data || []).forEach(r => activeUserIds.add(r.user_id));
    (viewers.data || []).forEach(r => r.user_id && activeUserIds.add(r.user_id));
    const activeThisWeek = activeUserIds.size;

    // === WEEKLY ACTIVITY (last 4 weeks) ===
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    
    const [allUploads, allLikes, allComments, allViews] = await Promise.all([
      supabase.from('assets').select('created_at').gte('created_at', fourWeeksAgo.toISOString()),
      supabase.from('asset_likes').select('created_at').gte('created_at', fourWeeksAgo.toISOString()),
      supabase.from('asset_comments').select('created_at').gte('created_at', fourWeeksAgo.toISOString()),
      supabase.from('asset_views').select('viewed_at').gte('viewed_at', fourWeeksAgo.toISOString()),
    ]);

    // Build weekly activity for last 4 weeks
    const weeklyActivity: WeeklyActivity[] = [];
    
    for (let weeksAgo = 3; weeksAgo >= 0; weeksAgo--) {
      const { start, end, label } = getWeekBounds(weeksAgo);
      
      const uploads = (allUploads.data || []).filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      }).length;
      
      const likes = (allLikes.data || []).filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      }).length;
      
      const comments = (allComments.data || []).filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      }).length;
      
      const views = (allViews.data || []).filter(r => {
        const d = new Date(r.viewed_at);
        return d >= start && d <= end;
      }).length;
      
      weeklyActivity.push({
        week: 4 - weeksAgo,
        label,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        uploads,
        likes,
        comments,
        views,
        total: uploads + likes + comments + views,
      });
    }

    // === PERIOD COMPARISON (This week vs Last week) ===
    const thisWeek = weeklyActivity.find(w => w.week === 4) || { uploads: 0, likes: 0, comments: 0, views: 0, total: 0 };
    const lastWeek = weeklyActivity.find(w => w.week === 3) || { uploads: 0, likes: 0, comments: 0, views: 0, total: 0 };
    
    const comparison: PeriodComparison = {
      uploads: {
        current: thisWeek.uploads,
        previous: lastWeek.uploads,
        change: calculateChange(thisWeek.uploads, lastWeek.uploads),
      },
      likes: {
        current: thisWeek.likes,
        previous: lastWeek.likes,
        change: calculateChange(thisWeek.likes, lastWeek.likes),
      },
      comments: {
        current: thisWeek.comments,
        previous: lastWeek.comments,
        change: calculateChange(thisWeek.comments, lastWeek.comments),
      },
      views: {
        current: thisWeek.views,
        previous: lastWeek.views,
        change: calculateChange(thisWeek.views, lastWeek.views),
      },
      total: {
        current: thisWeek.total,
        previous: lastWeek.total,
        change: calculateChange(thisWeek.total, lastWeek.total),
      },
    };

    // === CONTENT STATS (All time) ===
    const [
      { count: totalUploads },
      { count: totalLikes },
      { count: totalComments },
      { data: viewsData },
    ] = await Promise.all([
      supabase.from('assets').select('*', { count: 'exact', head: true }),
      supabase.from('asset_likes').select('*', { count: 'exact', head: true }),
      supabase.from('asset_comments').select('*', { count: 'exact', head: true }),
      supabase.from('assets').select('view_count'),
    ]);

    const totalViews = (viewsData || []).reduce((sum, asset) => sum + (asset.view_count || 0), 0);

    // === STORAGE USAGE ===
    const { data: storageData } = await supabase.from('assets').select('file_size');
    const totalBytes = (storageData || []).reduce((sum, asset) => sum + (asset.file_size || 0), 0);

    // === TOP CONTRIBUTORS ===
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url');

    if (!allUsers) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const { data: uploadCounts } = await supabase.from('assets').select('uploader_id');
    const { data: assetLikes } = await supabase
      .from('asset_likes')
      .select('asset_id, assets!inner(uploader_id)');
    const { data: commentCounts } = await supabase.from('asset_comments').select('user_id');

    const userStats = new Map<string, { uploads: number; likes: number; comments: number }>();
    allUsers.forEach(user => userStats.set(user.id, { uploads: 0, likes: 0, comments: 0 }));

    (uploadCounts || []).forEach(asset => {
      const stats = userStats.get(asset.uploader_id);
      if (stats) stats.uploads++;
    });

    (assetLikes || []).forEach((like: any) => {
      const uploaderId = like.assets?.uploader_id;
      if (uploaderId) {
        const stats = userStats.get(uploaderId);
        if (stats) stats.likes++;
      }
    });

    (commentCounts || []).forEach(comment => {
      const stats = userStats.get(comment.user_id);
      if (stats) stats.comments++;
    });

    const topContributors: TopContributor[] = allUsers
      .map(user => {
        const stats = userStats.get(user.id) || { uploads: 0, likes: 0, comments: 0 };
        return {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          upload_count: stats.uploads,
          like_count: stats.likes,
          comment_count: stats.comments,
        };
      })
      .filter(user => user.upload_count > 0 || user.like_count > 0 || user.comment_count > 0)
      .sort((a, b) => b.upload_count - a.upload_count)
      .slice(0, 10);

    // === BUILD RESPONSE ===
    const analytics: AnalyticsResponse = {
      users: {
        total: totalUsers || 0,
        activeThisWeek,
        newThisMonth: newThisMonth || 0,
      },
      content: {
        totalUploads: totalUploads || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0,
        totalViews,
      },
      storage: {
        totalBytes,
        totalFormatted: formatBytes(totalBytes),
      },
      weeklyActivity,
      comparison,
      topContributors,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[GET /api/admin/analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
