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
 */
export function isSupportedUrl(url: string): boolean {
  const provider = detectProvider(url);
  return provider !== 'unknown';
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

