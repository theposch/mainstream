/**
 * Embed Provider Detection & URL Utilities
 * 
 * Handles detection of embed providers from URLs and generates
 * appropriate embed URLs for iframes.
 * 
 * Supported Providers:
 * - Figma (files, designs, prototypes, boards)
 * - YouTube (videos) - future
 * - Vimeo (videos) - future
 * - Dribbble (shots) - future
 */

export type EmbedProvider = 'figma' | 'youtube' | 'vimeo' | 'dribbble' | 'unknown';

export interface EmbedInfo {
  provider: EmbedProvider;
  embedUrl: string;
  originalUrl: string;
  title?: string;
}

/**
 * Provider detection patterns
 */
const PROVIDER_PATTERNS: Record<EmbedProvider, RegExp | null> = {
  figma: /figma\.com\/(file|design|proto|board)\/([a-zA-Z0-9-_]+)/,
  youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  vimeo: /vimeo\.com\/(\d+)/,
  dribbble: /dribbble\.com\/shots\/(\d+)/,
  unknown: null,
};

/**
 * Detects the embed provider from a URL
 * 
 * @param url - The URL to analyze
 * @returns The detected provider or 'unknown'
 */
export function detectProvider(url: string): EmbedProvider {
  try {
    // Validate URL format
    new URL(url);
    
    for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
      if (pattern && pattern.test(url)) {
        return provider as EmbedProvider;
      }
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Checks if a URL is from a supported embed provider
 * Only returns true for providers that are fully implemented
 */
export function isSupportedUrl(url: string): boolean {
  const provider = detectProvider(url);
  return isProviderSupported(provider);
}

/**
 * Gets the list of currently supported providers
 */
export function getSupportedProviders(): EmbedProvider[] {
  // Only return providers we've fully implemented
  return ['figma'];
}

/**
 * Checks if a specific provider is currently supported
 */
export function isProviderSupported(provider: EmbedProvider): boolean {
  return getSupportedProviders().includes(provider);
}

// ============================================================================
// Figma Specific
// ============================================================================

/**
 * Validates if a URL is a valid Figma URL
 */
export function isFigmaUrl(url: string): boolean {
  return PROVIDER_PATTERNS.figma?.test(url) ?? false;
}

/**
 * Extracts the Figma file type from a URL
 */
export function getFigmaType(url: string): 'file' | 'design' | 'proto' | 'board' | null {
  const match = url.match(/figma\.com\/(file|design|proto|board)\//);
  return match ? (match[1] as 'file' | 'design' | 'proto' | 'board') : null;
}

/**
 * Extracts the Figma file key from a URL
 */
export function getFigmaFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Converts a Figma URL to an embed URL
 * 
 * @param figmaUrl - Original Figma URL (www.figma.com/...)
 * @param options - Embed options
 * @returns Embed URL for iframe src
 */
export function getFigmaEmbedUrl(
  figmaUrl: string,
  options: {
    embedHost?: string;
    theme?: 'light' | 'dark' | 'system';
    viewportControls?: boolean;
    nodeId?: string;
  } = {}
): string {
  const {
    embedHost = 'cosmos',
    theme = 'system',
    viewportControls = true,
  } = options;

  try {
    const url = new URL(figmaUrl);
    
    // Change hostname from www.figma.com to embed.figma.com
    url.hostname = 'embed.figma.com';
    
    // Add required embed-host parameter
    url.searchParams.set('embed-host', embedHost);
    
    // Add optional parameters
    if (theme !== 'system') {
      url.searchParams.set('theme', theme);
    }
    
    if (!viewportControls) {
      url.searchParams.set('viewport-controls', 'false');
    }
    
    if (options.nodeId) {
      url.searchParams.set('node-id', options.nodeId);
    }
    
    return url.toString();
  } catch {
    // If URL parsing fails, return a basic embed URL
    return figmaUrl.replace('www.figma.com', 'embed.figma.com') + 
      `?embed-host=${embedHost}`;
  }
}

/**
 * Extracts the file/design name from a Figma URL
 */
export function getFigmaTitle(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // URL format: /file/KEY/TITLE or /design/KEY/TITLE
    if (pathParts.length >= 4) {
      // Decode URI and replace hyphens with spaces
      const title = decodeURIComponent(pathParts[3])
        .replace(/-/g, ' ')
        .replace(/\?.*$/, ''); // Remove query params if any
      return title;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Figma oEmbed response type
 */
export interface FigmaOEmbedResponse {
  title: string;
  thumbnail_url?: string;
  author_name?: string;
  author_url?: string;
  provider_name: string;
  provider_url: string;
  type: string;
  version: string;
  width?: number;
  height?: number;
}

/**
 * Fetches Figma file metadata via oEmbed API
 * 
 * This endpoint is public and doesn't require authentication.
 * However, it may not return thumbnails for private files.
 * 
 * @param figmaUrl - The Figma file URL
 * @returns oEmbed data including thumbnail_url, or null if failed
 */
export async function fetchFigmaOEmbed(figmaUrl: string): Promise<FigmaOEmbedResponse | null> {
  try {
    const oembedUrl = `https://www.figma.com/api/oembed?url=${encodeURIComponent(figmaUrl)}`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache for too long since thumbnails can change
      next: { revalidate: 3600 }, // 1 hour
    });
    
    if (!response.ok) {
      console.log(`[fetchFigmaOEmbed] Failed to fetch oEmbed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data as FigmaOEmbedResponse;
  } catch (error) {
    console.error('[fetchFigmaOEmbed] Error:', error);
    return null;
  }
}

/**
 * Extracts the node-id from a Figma URL if present
 * Node IDs in URLs use hyphens (4919-3452) but the API uses colons (4919:3452)
 */
export function getFigmaNodeId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const nodeId = urlObj.searchParams.get('node-id');
    return nodeId || null;
  } catch {
    return null;
  }
}

/**
 * Converts node-id from URL format (4919-3452) to API format (4919:3452)
 * Uses global replace to handle multi-segment node IDs (e.g., 4919-3452-1234 -> 4919:3452:1234)
 */
export function convertNodeIdToApiFormat(nodeId: string): string {
  return nodeId.replace(/-/g, ':');
}

/**
 * Figma REST API Images response type
 */
export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string>; // nodeId -> imageUrl
}

/**
 * Fetches a rendered image of specific Figma node(s) using the REST API
 * 
 * Requires a valid Figma Personal Access Token.
 * Returns frame-specific thumbnails, unlike oEmbed which only returns file-level.
 * 
 * @param fileKey - Figma file key (extracted from URL)
 * @param nodeIds - Array of node IDs to render (use API format with colons)
 * @param accessToken - Figma Personal Access Token
 * @param options - Rendering options (format, scale)
 * @returns Map of nodeId -> image URL, or null if failed
 */
export async function fetchFigmaNodeImages(
  fileKey: string,
  nodeIds: string[],
  accessToken: string,
  options: {
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
    scale?: number; // 0.01 to 4
  } = {}
): Promise<FigmaImagesResponse | null> {
  const { format = 'png', scale = 2 } = options;

  try {
    const idsParam = nodeIds.join(',');
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=${format}&scale=${scale}`;

    console.log(`[fetchFigmaNodeImages] Fetching from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      console.log(`[fetchFigmaNodeImages] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as FigmaImagesResponse;
  } catch (error) {
    console.error('[fetchFigmaNodeImages] Error:', error);
    return null;
  }
}

/**
 * Response type for frame thumbnail with dimensions
 */
export interface FigmaFrameThumbnailResult {
  imageUrl: string;
  width: number;
  height: number;
}

/**
 * Fetches node information including bounding box from Figma API
 */
export async function fetchFigmaNodeInfo(
  fileKey: string,
  nodeId: string,
  accessToken: string
): Promise<{ width: number; height: number } | null> {
  try {
    const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      console.log(`[fetchFigmaNodeInfo] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const node = data.nodes?.[nodeId]?.document;
    
    if (!node) {
      console.log('[fetchFigmaNodeInfo] Node not found in response');
      return null;
    }

    // Get absolute bounding box for the node
    const bounds = node.absoluteBoundingBox || node.absoluteRenderBounds;
    
    if (!bounds) {
      console.log('[fetchFigmaNodeInfo] No bounding box found');
      return null;
    }

    return {
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
  } catch (error) {
    console.error('[fetchFigmaNodeInfo] Error:', error);
    return null;
  }
}

/**
 * High-level helper to get a frame-specific thumbnail from a Figma URL
 * 
 * @param figmaUrl - Full Figma URL (may include node-id)
 * @param accessToken - Figma Personal Access Token
 * @returns Image URL and dimensions for the specific frame, or null if failed
 */
export async function fetchFigmaFrameThumbnail(
  figmaUrl: string,
  accessToken: string
): Promise<FigmaFrameThumbnailResult | null> {
  const fileKey = getFigmaFileKey(figmaUrl);
  const nodeId = getFigmaNodeId(figmaUrl);

  if (!fileKey) {
    console.log('[fetchFigmaFrameThumbnail] Could not extract file key');
    return null;
  }

  if (!nodeId) {
    console.log('[fetchFigmaFrameThumbnail] No node-id in URL, falling back to oEmbed');
    return null;
  }

  // Convert node-id format for API (4919-3452 -> 4919:3452)
  const apiNodeId = convertNodeIdToApiFormat(nodeId);

  // Fetch both image and node info in parallel
  const [imagesResult, nodeInfo] = await Promise.all([
    fetchFigmaNodeImages(fileKey, [apiNodeId], accessToken),
    fetchFigmaNodeInfo(fileKey, apiNodeId, accessToken),
  ]);

  if (!imagesResult || imagesResult.err || !imagesResult.images) {
    console.log('[fetchFigmaFrameThumbnail] Failed to fetch node image');
    return null;
  }

  // Get the image URL for the requested node
  const imageUrl = imagesResult.images[apiNodeId];
  
  if (!imageUrl) {
    console.log('[fetchFigmaFrameThumbnail] No image URL in response');
    return null;
  }

  // Use node dimensions if available, otherwise default to 16:9
  const width = nodeInfo?.width || 1600;
  const height = nodeInfo?.height || 900;

  console.log('[fetchFigmaFrameThumbnail] Got frame thumbnail:', { imageUrl, width, height });
  
  return { imageUrl, width, height };
}

// ============================================================================
// YouTube Specific (for future implementation)
// ============================================================================

/**
 * Validates if a URL is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return PROVIDER_PATTERNS.youtube?.test(url) ?? false;
}

/**
 * Extracts the YouTube video ID from a URL
 */
export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Converts a YouTube URL to an embed URL
 */
export function getYouTubeEmbedUrl(youtubeUrl: string): string | null {
  const videoId = getYouTubeVideoId(youtubeUrl);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Gets the YouTube thumbnail URL
 */
export function getYouTubeThumbnail(youtubeUrl: string): string | null {
  const videoId = getYouTubeVideoId(youtubeUrl);
  if (!videoId) return null;
  // maxresdefault is highest quality, falls back to hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// ============================================================================
// Generic Embed Helpers
// ============================================================================

/**
 * Gets the embed URL for any supported provider
 */
export function getEmbedUrl(url: string): string | null {
  const provider = detectProvider(url);
  
  switch (provider) {
    case 'figma':
      return getFigmaEmbedUrl(url);
    case 'youtube':
      return getYouTubeEmbedUrl(url);
    // Add more providers here
    default:
      return null;
  }
}

/**
 * Gets display info for a provider
 */
export function getProviderInfo(provider: EmbedProvider): {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
} {
  const providers = {
    figma: {
      name: 'Figma',
      icon: '🎨',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500',
    },
    youtube: {
      name: 'YouTube',
      icon: '▶️',
      color: 'text-red-400',
      bgColor: 'bg-red-500',
    },
    vimeo: {
      name: 'Vimeo',
      icon: '🎬',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500',
    },
    dribbble: {
      name: 'Dribbble',
      icon: '🏀',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500',
    },
    unknown: {
      name: 'Link',
      icon: '🔗',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500',
    },
  };
  
  return providers[provider];
}

