import type { NextConfig } from "next";

// Derive the Supabase Storage hostname for Next.js image optimisation.
// Falls back gracefully when the env var is missing or invalid.
function getSupabaseStoragePattern(): { protocol: 'http' | 'https'; hostname: string; pathname: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!supabaseUrl) return null;
  try {
    const parsed = new URL(supabaseUrl);
    return {
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsed.hostname,
      pathname: '/storage/v1/object/public/**',
    };
  } catch {
    return null;
  }
}

const supabaseStoragePattern = getSupabaseStoragePattern();

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Allow larger file uploads (50MB for videos)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Increase body size limit for App Router routes
    middlewareClientMaxBodySize: '50mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      // Figma oEmbed thumbnails
      {
        protocol: 'https',
        hostname: 'api-cdn.figma.com',
      },
      {
        protocol: 'https',
        hostname: 's3-alpha.figma.com',
      },
      // Figma REST API rendered images (frame-specific thumbnails)
      {
        protocol: 'https',
        hostname: 'figma-alpha-api.s3.us-west-2.amazonaws.com',
      },
      // Supabase Storage (derived from NEXT_PUBLIC_SUPABASE_URL)
      ...(supabaseStoragePattern ? [supabaseStoragePattern] : []),
    ],
    // Allow data URLs for uploaded images (local development)
    dangerouslyAllowSVG: true,
    unoptimized: false,
  },
};

export default nextConfig;
