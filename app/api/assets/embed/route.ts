/**
 * Embed Asset API Route
 * 
 * Creates a new asset from a URL (Figma, YouTube, etc.)
 * 
 * POST /api/assets/embed - Create an embed asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  detectProvider,
  isSupportedUrl,
  getFigmaTitle,
  fetchFigmaOEmbed,
  fetchFigmaFrameThumbnail,
  getFigmaNodeId,
} from '@/lib/utils/embed-providers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[POST /api/assets/embed] Starting embed creation...');

  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log('[POST /api/assets/embed] Authentication failed');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { url, title, description, streamIds } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Detect provider
    const provider = detectProvider(url);
    
    if (!isSupportedUrl(url)) {
      const supportedList = 'Figma';
      return NextResponse.json(
        { error: `Unsupported URL. Currently supported: ${supportedList}` },
        { status: 400 }
      );
    }

    console.log(`[POST /api/assets/embed] Detected provider: ${provider}`);

    // Fetch user profile to check for Figma token
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, figma_access_token')
      .eq('id', user.id)
      .single();

    const userFigmaToken = userData?.figma_access_token || null;
    const hasNodeId = getFigmaNodeId(url) !== null;

    // Fetch thumbnail data
    let thumbnailUrl: string | null = null;
    let oembedTitle: string | null = null;
    let usedFrameSpecificThumbnail = false;
    let frameWidth: number | null = null;
    let frameHeight: number | null = null;
    
    if (provider === 'figma') {
      // Strategy: If user has Figma token AND URL has node-id, try frame-specific thumbnail first
      if (userFigmaToken && hasNodeId) {
        console.log('[POST /api/assets/embed] User has Figma token and URL has node-id, trying frame-specific thumbnail...');
        const frameThumbnailResult = await fetchFigmaFrameThumbnail(url, userFigmaToken);
        
        if (frameThumbnailResult) {
          console.log('[POST /api/assets/embed] Got frame-specific thumbnail!', {
            width: frameThumbnailResult.width,
            height: frameThumbnailResult.height,
          });
          thumbnailUrl = frameThumbnailResult.imageUrl;
          frameWidth = frameThumbnailResult.width;
          frameHeight = frameThumbnailResult.height;
          usedFrameSpecificThumbnail = true;
        } else {
          console.log('[POST /api/assets/embed] Frame-specific thumbnail failed, falling back to oEmbed');
        }
      }

      // Fall back to oEmbed if we don't have a thumbnail yet
      if (!thumbnailUrl) {
        console.log('[POST /api/assets/embed] Fetching Figma oEmbed data...');
        const oembedData = await fetchFigmaOEmbed(url);
        
        if (oembedData) {
          console.log('[POST /api/assets/embed] oEmbed data received:', {
            title: oembedData.title,
            hasThumbnail: !!oembedData.thumbnail_url,
          });
          if (!thumbnailUrl) {
            thumbnailUrl = oembedData.thumbnail_url || null;
          }
          oembedTitle = oembedData.title || null;
        } else {
          console.log('[POST /api/assets/embed] No oEmbed data available (file may be private)');
        }
      }
    }

    // Extract title: user-provided > oEmbed > URL extraction > fallback
    let finalTitle = title?.trim();
    if (!finalTitle) {
      finalTitle = oembedTitle || getFigmaTitle(url) || 'Figma Design';
    }

    // Log thumbnail source for debugging
    if (thumbnailUrl) {
      console.log(`[POST /api/assets/embed] Using ${usedFrameSpecificThumbnail ? 'frame-specific' : 'oEmbed'} thumbnail`);
    }

    // Ensure user profile exists in public.users
    const existingUser = userData;
    const userCheckError = userDataError;

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create them
      const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
      const displayName = user.user_metadata?.full_name || username;
      
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          username: username,
          display_name: displayName,
          avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        });

      if (createUserError) {
        console.error('[POST /api/assets/embed] Error creating user profile:', createUserError);
      }
    }

    // Create the asset record
    const assetData: Record<string, unknown> = {
      title: finalTitle,
      description: description?.trim() || null,
      type: 'link',  // Legacy type field (constraint: image|video|link)
      asset_type: 'embed',  // New type field for embeds
      embed_url: url,
      embed_provider: provider,
      url: url,  // Store original URL as fallback
      uploader_id: user.id,
    };
    
    // Add thumbnail and dimensions if we got them
    if (thumbnailUrl) {
      assetData.thumbnail_url = thumbnailUrl;
      // Use thumbnail as the main URL for feed display
      assetData.url = thumbnailUrl;
      console.log('[POST /api/assets/embed] Using thumbnail:', thumbnailUrl);
    }

    // Add frame dimensions if available (for proper aspect ratio in feed)
    if (frameWidth && frameHeight) {
      assetData.width = frameWidth;
      assetData.height = frameHeight;
      console.log('[POST /api/assets/embed] Stored frame dimensions:', { frameWidth, frameHeight });
    }

    console.log('[POST /api/assets/embed] Creating asset with data:', assetData);

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert(assetData)
      .select(`
        *,
        uploader:users!uploader_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (assetError) {
      console.error('[POST /api/assets/embed] Error creating asset:', assetError);
      return NextResponse.json(
        { error: 'Failed to create embed asset' },
        { status: 500 }
      );
    }

    console.log('[POST /api/assets/embed] Asset created:', asset.id);

    // Associate with streams if provided
    if (streamIds && Array.isArray(streamIds) && streamIds.length > 0) {
      const streamAssociations = streamIds.map((streamId: string) => ({
        asset_id: asset.id,
        stream_id: streamId,
      }));

      const { error: streamError } = await supabase
        .from('asset_streams')
        .insert(streamAssociations);

      if (streamError) {
        console.error('[POST /api/assets/embed] Error associating streams:', streamError);
        // Non-fatal - continue
      } else {
        console.log(`[POST /api/assets/embed] Associated with ${streamIds.length} stream(s)`);
      }

      // Fetch the streams for the response
      const { data: streams } = await supabase
        .from('streams')
        .select('id, name, description, owner_type, owner_id, is_private, status, cover_image_url, created_at, updated_at')
        .in('id', streamIds);

      if (streams) {
        asset.streams = streams;
      }
    }

    console.log('[POST /api/assets/embed] Embed creation complete');

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        likeCount: 0,
        isLikedByCurrentUser: false,
        view_count: 0,
      },
    });

  } catch (error) {
    console.error('[POST /api/assets/embed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

