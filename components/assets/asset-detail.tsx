"use client";

import * as React from "react";
import type { Asset } from "@/lib/types/database";
import { AssetDetailDesktop } from "./asset-detail-desktop";
import { AssetDetailMobile } from "./asset-detail-mobile";

interface AssetDetailProps {
  asset: Asset;
  /** Callback when modal should close (for overlay mode) */
  onClose?: () => void;
}

export function AssetDetail({ asset, onClose }: AssetDetailProps) {
  // Check mobile on initial render (safe since this is only rendered client-side from feed.tsx)
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Render immediately - no mounted check needed since parent conditionally renders us
  if (isMobile) {
    return <AssetDetailMobile asset={asset} onClose={onClose} />;
  }

  return <AssetDetailDesktop asset={asset} onClose={onClose} />;
}
