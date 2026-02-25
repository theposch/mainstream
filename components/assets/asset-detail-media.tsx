"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getFigmaEmbedUrl,
  getLoomEmbedUrl,
  getProviderInfo,
  type EmbedProvider,
} from "@/lib/utils/embed-providers";
import type { Asset } from "@/lib/types/database";

/**
 * Progressive Image Component
 * Shows thumbnail/medium immediately (cached from feed), then upgrades to full res.
 *
 * Pattern: Same as Pinterest - display low-res immediately, upgrade when high-res ready.
 * The thumbnail is already in browser cache from the feed, so it appears instantly.
 */
export function ProgressiveImage({
  thumbnailSrc,
  fullSrc,
  alt,
}: {
  thumbnailSrc: string;
  fullSrc: string;
  alt: string;
}) {
  const [currentSrc, setCurrentSrc] = React.useState(thumbnailSrc);

  React.useEffect(() => {
    if (thumbnailSrc === fullSrc) {
      setCurrentSrc(fullSrc);
      return;
    }

    setCurrentSrc(thumbnailSrc);

    const img = new window.Image();
    let cancelled = false;

    img.onload = () => {
      if (!cancelled) {
        requestAnimationFrame(() => setCurrentSrc(fullSrc));
      }
    };
    img.src = fullSrc;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [fullSrc, thumbnailSrc]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, calc(100vw - 480px)"
      priority
    />
  );
}

interface AssetMediaViewProps {
  asset: Asset;
}

/**
 * Left panel of the asset detail view — renders image, video, or embed content.
 */
export function AssetMediaView({ asset }: AssetMediaViewProps) {
  return (
    <div className="flex-1 relative bg-muted/30 flex items-center justify-center p-4 md:p-10 overflow-y-auto">
      <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
        {asset.asset_type === "embed" && asset.embed_url ? (
          <div className="relative w-full h-full">
            {asset.embed_provider === "figma" ? (
              <>
                <iframe
                  src={getFigmaEmbedUrl(asset.embed_url)}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
                <Badge
                  asChild
                  variant="secondary"
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80 cursor-pointer"
                >
                  <a
                    href={asset.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Figma
                  </a>
                </Badge>
              </>
            ) : asset.embed_provider === "loom" ? (
              <>
                <iframe
                  src={getLoomEmbedUrl(asset.embed_url) || ""}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  allow="autoplay; fullscreen"
                />
                <Badge
                  asChild
                  variant="secondary"
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium hover:bg-black/80 cursor-pointer"
                >
                  <a
                    href={asset.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Loom
                  </a>
                </Badge>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                {(() => {
                  const providerInfo = getProviderInfo(
                    asset.embed_provider as EmbedProvider
                  );
                  return (
                    <>
                      <div
                        className={`flex items-center justify-center w-24 h-24 rounded-2xl mb-4 ${providerInfo.bgColor}`}
                      >
                        <span className="text-5xl">{providerInfo.icon}</span>
                      </div>
                      <p className="text-lg font-medium text-muted-foreground mb-4">
                        {providerInfo.name} Embed
                      </p>
                      <a
                        href={asset.embed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Link
                      </a>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : asset.asset_type === "video" || asset.mime_type === "video/webm" ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              src={asset.url}
              className="max-w-full max-h-full rounded-lg"
              controls
              autoPlay
              loop
              muted
              playsInline
            />
            <Badge
              variant="secondary"
              className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white border-white/10 text-[10px] font-medium"
            >
              VIDEO
            </Badge>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <ProgressiveImage
              thumbnailSrc={asset.medium_url || asset.thumbnail_url || asset.url}
              fullSrc={asset.url}
              alt={asset.title}
            />
          </div>
        )}
      </div>
    </div>
  );
}
