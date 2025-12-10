"use client";

import * as React from "react";
import type { Asset } from "@/lib/types/database";
import { AssetDetailDesktop } from "./asset-detail-desktop";
import { AssetDetailMobile } from "./asset-detail-mobile";

interface AssetDetailProps {
  asset: Asset;
  /** All assets in the current view for navigation */
  allAssets?: Asset[];
  /** Callback when modal should close (for overlay mode) */
  onClose?: () => void;
  /** Callback when navigating to another asset (for modal mode) */
  onNavigate?: (assetId: string) => void;
  /** Callback when asset is deleted (for feed updates) */
  onDelete?: (assetId: string) => void;
}

export function AssetDetail({ asset, allAssets = [], onClose, onNavigate, onDelete }: AssetDetailProps) {
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

  // Calculate previous/next assets for navigation
  const currentIndex = allAssets.findIndex(a => a.id === asset.id);
  const previousAsset = currentIndex > 0 ? allAssets[currentIndex - 1] : null;
  const nextAsset = currentIndex < allAssets.length - 1 ? allAssets[currentIndex + 1] : null;

  // Render immediately - no mounted check needed since parent conditionally renders us
  if (isMobile) {
    return (
      <AssetDetailMobile 
        asset={asset} 
        allAssets={allAssets}
        onClose={onClose}
        onNavigate={onNavigate}
        onDelete={onDelete}
      />
    );
  }

  return (
    <AssetDetailDesktop 
      asset={asset} 
      previousAsset={previousAsset}
      nextAsset={nextAsset}
      onClose={onClose}
      onNavigate={onNavigate}
      onDelete={onDelete}
    />
  );
}
