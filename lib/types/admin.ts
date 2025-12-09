/**
 * Admin Types
 * 
 * Shared TypeScript interfaces for admin functionality
 */

import type { PlatformRole } from "./database";

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

/**
 * Admin user representation (database format with snake_case)
 */
export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  platform_role: PlatformRole;
  created_at: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Raw activity timestamps from the API (for client-side bucketing)
 */
export interface RawActivityData {
  uploads: string[];  // ISO timestamps
  likes: string[];
  comments: string[];
  views: string[];
}

/**
 * Activity data point after bucketing by date
 */
export interface ActivityDataPoint {
  date: string;
  uploads: number;
  likes: number;
  comments: number;
  views: number;
}

/**
 * Top contributor information
 */
export interface TopContributor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  upload_count: number;
  like_count: number;
  comment_count: number;
}

/**
 * User statistics
 */
export interface UserStats {
  total: number;
  activeThisWeek: number;
  newThisMonth: number;
}

/**
 * Content statistics
 */
export interface ContentStats {
  totalUploads: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalBytes: number;
  totalFormatted: string;
}

/**
 * Analytics API response format
 */
export interface AnalyticsApiResponse {
  users: UserStats;
  content: ContentStats;
  storage: StorageStats;
  rawActivity: RawActivityData;
  topContributors: TopContributor[];
}

/**
 * Processed analytics data for the dashboard
 */
export interface AnalyticsData {
  users: UserStats;
  content: ContentStats;
  storage: StorageStats;
  activityOverTime: ActivityDataPoint[];
  topContributors: TopContributor[];
}

