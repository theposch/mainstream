"use client";

import * as React from "react";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { MasonryGrid } from "@/components/assets/masonry-grid";
import { AssetDetail } from "@/components/assets/asset-detail";
import { assetKeys, fetchAssetById } from "@/lib/queries/asset-queries";
import type { Asset } from "@/lib/types/database";

interface StreamPageContentProps {
  assets: Asset[];
}

export function StreamPageContent({ assets }: StreamPageContentProps) {
  // Modal state with URL sync via nuqs (Pinterest-style overlay)
  const [selectedAssetId, setSelectedAssetId] = useQueryState("asset", {
    defaultValue: "",
    shallow: true,
    history: "push",
  });

  // Find selected asset from current assets for modal
  const assetFromCache = React.useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => a.id === selectedAssetId) || null;
  }, [selectedAssetId, assets]);

  // Deep linking support: fetch asset from API if not in cache
  const { data: fetchedAsset } = useQuery({
    queryKey: assetKeys.detail(selectedAssetId || ""),
    queryFn: () => fetchAssetById(selectedAssetId!),
    enabled: !!selectedAssetId && !assetFromCache,
    staleTime: 5 * 60 * 1000,
  });

  // Use cached asset if available, otherwise use fetched asset
  const selectedAsset = assetFromCache || fetchedAsset || null;

  // Modal handlers
  const handleAssetClick = React.useCallback(
    (asset: Asset) => {
      setSelectedAssetId(asset.id);
    },
    [setSelectedAssetId]
  );

  const handleCloseModal = React.useCallback(() => {
    setSelectedAssetId("");
  }, [setSelectedAssetId]);

  return (
    <>
      <div className="mt-8">
        {assets.length > 0 ? (
          <MasonryGrid assets={assets} onAssetClick={handleAssetClick} />
        ) : (
          <div className="text-center py-20">
            <p className="text-lg font-medium text-muted-foreground">No assets in this stream yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Assets will appear here when added to the stream.
            </p>
          </div>
        )}
      </div>

      {/* Asset Detail Modal Overlay */}
      {selectedAsset && (
        <AssetDetail 
          asset={selectedAsset} 
          allAssets={assets}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

