/**
 * Admin Analytics API Route
 * 
 * GET /api/admin/analytics - Get platform analytics data
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

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

interface AnalyticsResponse {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /api/admin/analytics
 * 
 * Returns platform analytics data including:
 * - User stats (total, active this week, signups over time)
 * - Content stats (uploads, likes, comments, views)
 * - Storage usage
 * - Top contributors
 */
export async function GET() {
  try {
    // Check admin access
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
    
    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Active users this week (users who uploaded, liked, commented, or viewed)
    // Get unique user IDs from various activity tables
    const [uploaders, likers, commenters, viewers] = await Promise.all([
      supabase
        .from('assets')
        .select('uploader_id')
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('asset_likes')
        .select('user_id')
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('asset_comments')
        .select('user_id')
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('asset_views')
        .select('user_id')
        .gte('viewed_at', oneWeekAgo.toISOString()),
    ]);

    const activeUserIds = new Set<string>();
    (uploaders.data || []).forEach(r => activeUserIds.add(r.uploader_id));
    (likers.data || []).forEach(r => activeUserIds.add(r.user_id));
    (commenters.data || []).forEach(r => activeUserIds.add(r.user_id));
    (viewers.data || []).forEach(r => activeUserIds.add(r.user_id));
    const activeThisWeek = activeUserIds.size;

    // Signups over time (last 30 days, grouped by day)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const signupsByDate = new Map<string, number>();
    // Initialize all dates in range with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      signupsByDate.set(dateStr, 0);
    }
    // Count actual signups
    (recentUsers || []).forEach(user => {
      const dateStr = user.created_at.split('T')[0];
      signupsByDate.set(dateStr, (signupsByDate.get(dateStr) || 0) + 1);
    });
    
    const signupsOverTime: SignupDataPoint[] = Array.from(signupsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // === CONTENT STATS ===
    
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

    // Sum up all view counts
    const totalViews = (viewsData || []).reduce((sum, asset) => sum + (asset.view_count || 0), 0);

    // === STORAGE USAGE ===
    
    const { data: storageData } = await supabase
      .from('assets')
      .select('file_size');

    const totalBytes = (storageData || []).reduce((sum, asset) => sum + (asset.file_size || 0), 0);

    // === TOP CONTRIBUTORS ===
    
    // Get top 10 users by upload count
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url');

    if (!allUsers) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get upload counts per user
    const { data: uploadCounts } = await supabase
      .from('assets')
      .select('uploader_id');

    // Get like counts per user (likes received on their assets)
    const { data: assetLikes } = await supabase
      .from('asset_likes')
      .select('asset_id, assets!inner(uploader_id)')
      
    // Get comment counts per user
    const { data: commentCounts } = await supabase
      .from('asset_comments')
      .select('user_id');

    // Aggregate stats per user
    const userStats = new Map<string, { uploads: number; likes: number; comments: number }>();
    
    // Initialize all users
    allUsers.forEach(user => {
      userStats.set(user.id, { uploads: 0, likes: 0, comments: 0 });
    });

    // Count uploads
    (uploadCounts || []).forEach(asset => {
      const stats = userStats.get(asset.uploader_id);
      if (stats) stats.uploads++;
    });

    // Count likes received (on user's assets)
    (assetLikes || []).forEach((like: any) => {
      const uploaderId = like.assets?.uploader_id;
      if (uploaderId) {
        const stats = userStats.get(uploaderId);
        if (stats) stats.likes++;
      }
    });

    // Count comments made
    (commentCounts || []).forEach(comment => {
      const stats = userStats.get(comment.user_id);
      if (stats) stats.comments++;
    });

    // Build top contributors list sorted by uploads
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
        signupsOverTime,
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
      topContributors,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[GET /api/admin/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

