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
  getLoomTitle,
  getLoomThumbnail,
  fetchLoomOEmbed,
  getYouTubeVideoId,
  getYouTubeThumbnail,
  fetchVimeoOEmbed,
} from '@/lib/utils/embed-providers';
import { decrypt } from '@/lib/utils/encryption';
import { logger } from '@/lib/logger';
import { saveImageToPublic, generateUniqueFilename } from '@/lib/utils/file-storage';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

/**
 * Downloads an image from a URL and saves it locally
 * Returns the local path or null if failed
 */
async function downloadAndSaveThumbnail(imageUrl: string, userId?: string): Promise<string | null> {
  try {
    logger.debug('embed', 'Downloading thumbnail', { imageUrl });

    const response = await fetch(imageUrl);
    if (!response.ok) {
      logger.warn('embed', 'Failed to fetch thumbnail', { status: response.status });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with Sharp - optimize and convert to JPEG
    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique filename and save to Supabase Storage
    const filename = generateUniqueFilename('embed-thumb.jpg');
    const storagePath = await saveImageToPublic(processed, filename, 'thumbnails', undefined, userId);

    logger.debug('embed', 'Thumbnail saved', { storagePath });
    return storagePath;
  } catch (error) {
    logger.error('embed', 'Failed to download and save thumbnail', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
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
      const supportedList = 'Figma, Loom, YouTube, Vimeo';
      return NextResponse.json(
        { error: `Unsupported URL. Currently supported: ${supportedList}` },
        { status: 400 }
      );
    }

    logger.debug('embed', `Detected provider: ${provider}`);

    // Fetch user profile to check for Figma token
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, figma_access_token')
      .eq('id', user.id)
      .single();

    // Decrypt Figma token if present (stored encrypted in DB)
    const encryptedToken = userData?.figma_access_token || null;
    const userFigmaToken = encryptedToken ? decrypt(encryptedToken) : null;
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
        const frameThumbnailResult = await fetchFigmaFrameThumbnail(url, userFigmaToken);
        
        if (frameThumbnailResult) {
          logger.debug('embed', 'Got frame-specific thumbnail', { width: frameThumbnailResult.width, height: frameThumbnailResult.height });
          thumbnailUrl = frameThumbnailResult.imageUrl;
          frameWidth = frameThumbnailResult.width;
          frameHeight = frameThumbnailResult.height;
          usedFrameSpecificThumbnail = true;
        } else {
          logger.debug('embed', 'Frame-specific thumbnail failed, falling back to oEmbed');
        }
      }

      // Fall back to oEmbed if we don't have a thumbnail yet
      if (!thumbnailUrl) {
        const oembedData = await fetchFigmaOEmbed(url);

        if (oembedData) {
          if (!thumbnailUrl) {
            thumbnailUrl = oembedData.thumbnail_url || null;
          }
          oembedTitle = oembedData.title || null;
        } else {
          logger.debug('embed', 'No Figma oEmbed data available (file may be private)');
        }
      }
    } else if (provider === 'loom') {
      // Try oEmbed first for better metadata
      const oembedData = await fetchLoomOEmbed(url);

      if (oembedData) {
        thumbnailUrl = oembedData.thumbnail_url || null;
        oembedTitle = oembedData.title || null;

        if (oembedData.thumbnail_width && oembedData.thumbnail_height) {
          frameWidth = oembedData.thumbnail_width;
          frameHeight = oembedData.thumbnail_height;
        }
      }

      // Fall back to standard Loom thumbnail URL if oEmbed failed
      if (!thumbnailUrl) {
        thumbnailUrl = getLoomThumbnail(url);
      }
    } else if (provider === 'youtube') {
      // Fetch title via YouTube oEmbed (no API key required)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedResp = await fetch(oembedUrl, { headers: { 'Accept': 'application/json' } });
        if (oembedResp.ok) {
          const oembedData = await oembedResp.json();
          oembedTitle = oembedData.title || null;
        }
      } catch {
        logger.debug('embed', 'YouTube oEmbed failed, skipping title');
      }

      // Use high-quality YouTube thumbnail (no API key required)
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        // Try maxresdefault first, fall back to hqdefault if download fails
        thumbnailUrl = getYouTubeThumbnail(url);
      }
    } else if (provider === 'vimeo') {
      const oembedData = await fetchVimeoOEmbed(url);

      if (oembedData) {
        thumbnailUrl = oembedData.thumbnail_url || null;
        oembedTitle = oembedData.title || null;

        if (oembedData.thumbnail_width && oembedData.thumbnail_height) {
          frameWidth = oembedData.thumbnail_width;
          frameHeight = oembedData.thumbnail_height;
        }
      }
    }

    // Extract title: user-provided > oEmbed > URL extraction > fallback
    let finalTitle = title?.trim();
    if (!finalTitle) {
      if (provider === 'figma') {
        finalTitle = oembedTitle || getFigmaTitle(url) || 'Figma Design';
      } else if (provider === 'loom') {
        finalTitle = oembedTitle || getLoomTitle(url) || 'Loom Recording';
      } else if (provider === 'youtube') {
        finalTitle = oembedTitle || 'YouTube Video';
      } else if (provider === 'vimeo') {
        finalTitle = oembedTitle || 'Vimeo Video';
      } else {
        finalTitle = oembedTitle || 'Embedded Content';
      }
    }

    // Download and save thumbnail locally (never expires, fully under our control)
    let localThumbnailPath: string | null = null;
    if (thumbnailUrl) {
      localThumbnailPath = await downloadAndSaveThumbnail(thumbnailUrl, user.id);

      if (localThumbnailPath) {
        thumbnailUrl = localThumbnailPath; // Use local path instead of CDN URL
      } else {
        logger.warn('embed', 'Failed to save thumbnail locally, using CDN URL as fallback');
      }
    }

    // Ensure user profile exists in public.users
    if (userDataError && userDataError.code === 'PGRST116') {
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
        logger.error('embed', 'Error creating user profile', createUserError);
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
    }

    // Add frame dimensions if available (for proper aspect ratio in feed)
    if (frameWidth && frameHeight) {
      assetData.width = frameWidth;
      assetData.height = frameHeight;
    }

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
      logger.error('embed', 'Error creating asset', assetError);
      return NextResponse.json(
        { error: 'Failed to create embed asset' },
        { status: 500 }
      );
    }

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
        logger.error('embed', 'Error associating streams', streamError);
        // Non-fatal - continue
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
    logger.error('embed', 'Unexpected error creating embed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

