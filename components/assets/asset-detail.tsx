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
  const [isMobile, setIsMobile] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) return null;

  if (isMobile) {
    return <AssetDetailMobile asset={asset} onClose={onClose} />;
  }

  return <AssetDetailDesktop asset={asset} onClose={onClose} />;
}
