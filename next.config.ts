import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger file uploads (50MB for videos)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Increase body size limit for proxy/middleware (default is 10MB)
    proxyBodySize: 50 * 1024 * 1024, // 50MB in bytes
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
    ],
    // Allow data URLs for uploaded images (local development)
    dangerouslyAllowSVG: true,
    unoptimized: false,
  },
};

export default nextConfig;
