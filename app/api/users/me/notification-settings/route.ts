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

    // Atomic update pattern: UPDATE existing, or INSERT if none exist
    // This avoids the race condition of SELECT-then-UPSERT where two concurrent
    // requests could both read defaults and overwrite each other's changes
    
    // Step 1: Try to UPDATE existing settings (only updates provided fields)
    const { data: updatedSettings, error: updateError } = await supabase
      .from('user_notification_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('[PUT /api/users/me/notification-settings] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    // If update succeeded (row existed), return the updated settings
    if (updatedSettings) {
      return NextResponse.json(updatedSettings);
    }

    // Step 2: No existing settings - INSERT with defaults + provided updates
    // Use INSERT to avoid overwriting if another request created settings concurrently
    const insertData = {
      user_id: user.id,
      ...DEFAULT_SETTINGS,
      ...updateData, // Provided values override defaults
    };

    const { data: insertedSettings, error: insertError } = await supabase
      .from('user_notification_settings')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      // If insert fails due to conflict, another request created settings - fetch and return
      if (insertError.code === '23505') { // Unique constraint violation
        const { data: existingSettings } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (existingSettings) {
          // Apply our updates to the now-existing settings
          const { data: retrySettings, error: retryError } = await supabase
            .from('user_notification_settings')
            .update(updateData)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (!retryError && retrySettings) {
            return NextResponse.json(retrySettings);
          }
        }
      }
      
      console.error('[PUT /api/users/me/notification-settings] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save notification settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(insertedSettings);
  } catch (error) {
    console.error('[PUT /api/users/me/notification-settings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

