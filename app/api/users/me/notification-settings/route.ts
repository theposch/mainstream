/**
 * User Notification Settings API Route
 * 
 * Manages user notification preferences
 * 
 * GET /api/users/me/notification-settings - Get current settings
 * PUT /api/users/me/notification-settings - Update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Default settings for new users
const DEFAULT_SETTINGS = {
  in_app_enabled: true,
  likes_enabled: true,
  comments_enabled: true,
  follows_enabled: true,
  mentions_enabled: true,
};

/**
 * GET /api/users/me/notification-settings
 * 
 * Fetches user's notification settings.
 * Creates default settings if none exist.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Try to fetch existing settings
    const { data: settings, error: fetchError } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[GET /api/users/me/notification-settings] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    // If no settings exist, create default settings
    if (!settings) {
      const { data: newSettings, error: insertError } = await supabase
        .from('user_notification_settings')
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[GET /api/users/me/notification-settings] Insert error:', insertError);
        // Return defaults even if insert fails (user can still use the UI)
        return NextResponse.json({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[GET /api/users/me/notification-settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/me/notification-settings
 * 
 * Updates user's notification settings
 * 
 * Body (all optional):
 * - in_app_enabled: boolean
 * - likes_enabled: boolean
 * - comments_enabled: boolean
 * - follows_enabled: boolean
 * - mentions_enabled: boolean
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      in_app_enabled,
      likes_enabled,
      comments_enabled,
      follows_enabled,
      mentions_enabled,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, boolean> = {};
    
    if (typeof in_app_enabled === 'boolean') updateData.in_app_enabled = in_app_enabled;
    if (typeof likes_enabled === 'boolean') updateData.likes_enabled = likes_enabled;
    if (typeof comments_enabled === 'boolean') updateData.comments_enabled = comments_enabled;
    if (typeof follows_enabled === 'boolean') updateData.follows_enabled = follows_enabled;
    if (typeof mentions_enabled === 'boolean') updateData.mentions_enabled = mentions_enabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
        { status: 400 }
      );
    }

    // First, try to fetch existing settings to merge with
    const { data: existingSettings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build the full data to upsert
    // If settings exist, merge with existing values; otherwise use defaults
    const baseSettings = existingSettings || DEFAULT_SETTINGS;
    const upsertData = {
      user_id: user.id,
      in_app_enabled: updateData.in_app_enabled ?? baseSettings.in_app_enabled,
      likes_enabled: updateData.likes_enabled ?? baseSettings.likes_enabled,
      comments_enabled: updateData.comments_enabled ?? baseSettings.comments_enabled,
      follows_enabled: updateData.follows_enabled ?? baseSettings.follows_enabled,
      mentions_enabled: updateData.mentions_enabled ?? baseSettings.mentions_enabled,
    };

    // Use upsert to handle race conditions atomically
    // If another request inserted between our SELECT and this UPSERT,
    // this will update instead of failing with a constraint violation
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/users/me/notification-settings] Upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[PUT /api/users/me/notification-settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

