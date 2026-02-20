/**
 * Embed Asset API Route
 * 
 * Creates a new asset from a URL (Figma, YouTube, etc.)
 * 
 * POST /api/assets/embed - Create an embed asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/logger';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const log = createScopedLogger('EmbedRoute');
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
import { saveImageToPublic, generateUniqueFilename } from '@/lib/utils/file-storage';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

/**
 * Downloads an image from a URL and saves it locally
 * Returns the local path or null if failed
 */
async function downloadAndSaveThumbnail(imageUrl: string): Promise<string | null> {
  try {
    log.info('Downloading thumbnail', { imageUrl });

    const response = await fetch(imageUrl);
    if (!response.ok) {
      log.warn('Failed to fetch thumbnail', { status: response.status });
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Process with Sharp - optimize and convert to JPEG
    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Generate unique filename and save
    const filename = generateUniqueFilename('embed-thumb.jpg');
    const localPath = await saveImageToPublic(processed, filename, 'thumbnails');
    
    log.info('Thumbnail saved', { localPath });
    return localPath;
  } catch (error) {
    log.error('Failed to save thumbnail', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  const rl = checkRateLimit(request, RATE_LIMITS.upload);
  if (!rl.success) {
    log.warn('Rate limit exceeded', { remaining: rl.remaining, reset: rl.reset });
    return rateLimitResponse(rl);
  }

  log.info('Starting embed creation');

  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    log.warn('Authentication failed');
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

    log.info('Detected embed provider', { provider });

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
        log.info('Trying frame-specific Figma thumbnail');
        const frameThumbnailResult = await fetchFigmaFrameThumbnail(url, userFigmaToken);
        
        if (frameThumbnailResult) {
          log.info('Got frame-specific thumbnail', {
            width: frameThumbnailResult.width,
            height: frameThumbnailResult.height,
          });
          thumbnailUrl = frameThumbnailResult.imageUrl;
          frameWidth = frameThumbnailResult.width;
          frameHeight = frameThumbnailResult.height;
          usedFrameSpecificThumbnail = true;
        } else {
          log.warn('Frame-specific thumbnail failed, falling back to oEmbed');
        }
      }

      // Fall back to oEmbed if we don't have a thumbnail yet
      if (!thumbnailUrl) {
        log.info('Fetching Figma oEmbed data');
        const oembedData = await fetchFigmaOEmbed(url);

        if (oembedData) {
          log.info('Figma oEmbed data received', {
            title: oembedData.title,
            hasThumbnail: !!oembedData.thumbnail_url,
          });
          if (!thumbnailUrl) {
            thumbnailUrl = oembedData.thumbnail_url || null;
          }
          oembedTitle = oembedData.title || null;
        } else {
          log.warn('No Figma oEmbed data available (file may be private)');
        }
      }
    } else if (provider === 'loom') {
      log.info('Fetching Loom data');

      // Try oEmbed first for better metadata
      const oembedData = await fetchLoomOEmbed(url);

      if (oembedData) {
        log.info('Loom oEmbed data received', {
          title: oembedData.title,
          hasThumbnail: !!oembedData.thumbnail_url,
        });
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
        log.info('Using Loom standard thumbnail', { thumbnailUrl });
      }
    } else if (provider === 'youtube') {
      log.info('Fetching YouTube data');

      // Fetch title via YouTube oEmbed (no API key required)
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedResp = await fetch(oembedUrl, { headers: { 'Accept': 'application/json' } });
        if (oembedResp.ok) {
          const oembedData = await oembedResp.json();
          oembedTitle = oembedData.title || null;
        }
      } catch {
        log.warn('YouTube oEmbed failed, skipping title');
      }

      // Use high-quality YouTube thumbnail (no API key required)
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        // Try maxresdefault first, fall back to hqdefault if download fails
        thumbnailUrl = getYouTubeThumbnail(url);
        log.info('YouTube thumbnail URL', { thumbnailUrl });
      }
    } else if (provider === 'vimeo') {
      log.info('Fetching Vimeo data');

      const oembedData = await fetchVimeoOEmbed(url);

      if (oembedData) {
        log.info('Vimeo oEmbed data received', {
          title: oembedData.title,
          hasThumbnail: !!oembedData.thumbnail_url,
        });
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
      log.info('Downloading thumbnail', { type: usedFrameSpecificThumbnail ? 'frame-specific' : 'oEmbed' });
      localThumbnailPath = await downloadAndSaveThumbnail(thumbnailUrl);

      if (localThumbnailPath) {
        log.info('Thumbnail saved locally', { path: localThumbnailPath });
        thumbnailUrl = localThumbnailPath; // Use local path instead of CDN URL
      } else {
        log.warn('Failed to save thumbnail locally, will use CDN URL as fallback');
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
        log.error('Error creating user profile', new Error(createUserError.message));
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
      log.info('Using thumbnail', { thumbnailUrl });
    }

    // Add frame dimensions if available (for proper aspect ratio in feed)
    if (frameWidth && frameHeight) {
      assetData.width = frameWidth;
      assetData.height = frameHeight;
      log.info('Stored frame dimensions', { frameWidth, frameHeight });
    }

    log.info('Creating embed asset');

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
      log.error('Error creating asset', new Error(assetError.message));
      return NextResponse.json(
        { error: 'Failed to create embed asset' },
        { status: 500 }
      );
    }

    log.info('Asset created', { assetId: asset.id });

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
        log.error('Error associating streams', new Error(streamError.message));
        // Non-fatal - continue
      } else {
        log.info('Associated asset with streams', { count: streamIds.length });
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

    log.request('POST', '/api/assets/embed', 200, Date.now() - start);

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
    log.error('Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

