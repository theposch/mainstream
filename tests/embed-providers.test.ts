import { describe, it, expect } from 'vitest';
import {
  detectProvider,
  isSupportedUrl,
  getSupportedProviders,
  getFigmaEmbedUrl,
  getFigmaFileKey,
  getFigmaNodeId,
  getLoomVideoId,
  getLoomEmbedUrl,
  getLoomThumbnail,
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getVimeoVideoId,
  getVimeoEmbedUrl,
  getEmbedUrl,
} from '../lib/utils/embed-providers';

describe('detectProvider', () => {
  it('detects figma file URLs', () => {
    expect(detectProvider('https://www.figma.com/file/abc123/My-Design')).toBe('figma');
  });

  it('detects figma design URLs', () => {
    expect(detectProvider('https://www.figma.com/design/XYZ789/Component-Library')).toBe('figma');
  });

  it('detects loom share URLs', () => {
    expect(detectProvider('https://www.loom.com/share/abc123def456')).toBe('loom');
  });

  it('detects youtube watch URLs', () => {
    expect(detectProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
  });

  it('detects youtu.be short URLs', () => {
    expect(detectProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('detects vimeo URLs', () => {
    expect(detectProvider('https://vimeo.com/123456789')).toBe('vimeo');
  });

  it('returns unknown for unrecognised URLs', () => {
    expect(detectProvider('https://example.com/video')).toBe('unknown');
  });

  it('returns unknown for invalid URLs', () => {
    expect(detectProvider('not-a-url')).toBe('unknown');
  });
});

describe('getSupportedProviders', () => {
  it('includes figma, loom, youtube, vimeo', () => {
    const providers = getSupportedProviders();
    expect(providers).toContain('figma');
    expect(providers).toContain('loom');
    expect(providers).toContain('youtube');
    expect(providers).toContain('vimeo');
  });
});

describe('isSupportedUrl', () => {
  it('accepts figma URLs', () => {
    expect(isSupportedUrl('https://www.figma.com/file/abc123/Design')).toBe(true);
  });

  it('accepts youtube URLs', () => {
    expect(isSupportedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('accepts vimeo URLs', () => {
    expect(isSupportedUrl('https://vimeo.com/123456789')).toBe(true);
  });

  it('rejects unknown URLs', () => {
    expect(isSupportedUrl('https://dribbble.com/shots/123')).toBe(false);
  });
});

describe('Figma helpers', () => {
  const figmaUrl = 'https://www.figma.com/file/abc123XYZ/My-Design?node-id=100-200';

  it('extracts file key', () => {
    expect(getFigmaFileKey(figmaUrl)).toBe('abc123XYZ');
  });

  it('extracts node-id', () => {
    expect(getFigmaNodeId(figmaUrl)).toBe('100-200');
  });

  it('builds embed URL with embed-host', () => {
    const url = getFigmaEmbedUrl('https://www.figma.com/file/abc123/Design');
    expect(url).toContain('embed.figma.com');
    expect(url).toContain('embed-host=cosmos');
  });
});

describe('Loom helpers', () => {
  const loomUrl = 'https://www.loom.com/share/abc123def456ghi789';

  it('extracts video ID', () => {
    expect(getLoomVideoId(loomUrl)).toBe('abc123def456ghi789');
  });

  it('builds embed URL', () => {
    expect(getLoomEmbedUrl(loomUrl)).toBe('https://www.loom.com/embed/abc123def456ghi789');
  });

  it('returns null for invalid loom URL', () => {
    expect(getLoomVideoId('https://example.com')).toBeNull();
  });

  it('builds thumbnail URL', () => {
    const thumb = getLoomThumbnail(loomUrl);
    expect(thumb).toContain('cdn.loom.com');
    expect(thumb).toContain('abc123def456ghi789');
  });
});

describe('YouTube helpers', () => {
  it('extracts video ID from watch URL', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts video ID from short URL', () => {
    expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('builds embed URL', () => {
    expect(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('builds maxresdefault thumbnail URL', () => {
    const thumb = getYouTubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(thumb).toContain('img.youtube.com');
    expect(thumb).toContain('dQw4w9WgXcQ');
    expect(thumb).toContain('maxresdefault');
  });

  it('returns null for non-youtube URL', () => {
    expect(getYouTubeVideoId('https://vimeo.com/123')).toBeNull();
  });
});

describe('Vimeo helpers', () => {
  const vimeoUrl = 'https://vimeo.com/123456789';

  it('extracts video ID', () => {
    expect(getVimeoVideoId(vimeoUrl)).toBe('123456789');
  });

  it('builds embed URL', () => {
    expect(getVimeoEmbedUrl(vimeoUrl)).toBe('https://player.vimeo.com/video/123456789');
  });

  it('returns null for non-vimeo URL', () => {
    expect(getVimeoVideoId('https://youtube.com/watch?v=123')).toBeNull();
  });
});

describe('getEmbedUrl (generic)', () => {
  it('returns figma embed URL', () => {
    const url = getEmbedUrl('https://www.figma.com/file/abc/Design');
    expect(url).toContain('embed.figma.com');
  });

  it('returns youtube embed URL', () => {
    const url = getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('returns vimeo embed URL', () => {
    const url = getEmbedUrl('https://vimeo.com/123456789');
    expect(url).toBe('https://player.vimeo.com/video/123456789');
  });

  it('returns null for unsupported URL', () => {
    expect(getEmbedUrl('https://example.com/video')).toBeNull();
  });
});
