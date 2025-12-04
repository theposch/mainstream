import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
    // Allow data URLs for uploaded images (local development)
    dangerouslyAllowSVG: true,
    unoptimized: false,
  },
};

export default nextConfig;
