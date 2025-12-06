/**
 * Notification Preferences Helper
 * 
 * Checks if a user should receive a specific type of notification
 * based on their notification settings.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 
  | 'like_asset' 
  | 'like_comment' 
  | 'comment' 
  | 'reply_comment' 
  | 'follow' 
  | 'mention';

/**
 * Check if a user should receive a notification of a given type
 * 
 * @param supabase - Supabase client instance
 * @param recipientId - The user who would receive the notification
 * @param notificationType - The type of notification
 * @returns true if notification should be created, false otherwise
 */
export async function shouldCreateNotification(
  supabase: SupabaseClient,
  recipientId: string,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    // Fetch user's notification settings
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .select('in_app_enabled, likes_enabled, comments_enabled, follows_enabled, mentions_enabled')
      .eq('user_id', recipientId)
      .maybeSingle();

    // If no settings found or error, default to allowing notifications
    if (error || !settings) {
      return true;
    }

    // Check master toggle first
    if (!settings.in_app_enabled) {
      return false;
    }

    // Check specific notification type
    switch (notificationType) {
      case 'like_asset':
      case 'like_comment':
        return settings.likes_enabled;
      
      case 'comment':
      case 'reply_comment':
        return settings.comments_enabled;
      
      case 'follow':
        return settings.follows_enabled;
      
      case 'mention':
        return settings.mentions_enabled;
      
      default:
        // Unknown type - allow by default
        return true;
    }
  } catch (error) {
    console.error('[shouldCreateNotification] Error checking preferences:', error);
    // On error, default to allowing notifications
    return true;
  }
}

