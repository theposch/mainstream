"use client";

import * as React from "react";
import { Plus, GripVertical, Trash2, Type, Heading1, Minus, Quote, Image, Star, Images, Check } from "lucide-react";
import { BlockRenderer } from "./block-renderer";
import type { DropBlock, DropBlockType, Asset, GalleryLayout } from "@/lib/types/database";

interface BlockEditorProps {
  dropId: string;
  blocks: DropBlock[];
  onBlocksChange: (blocks: DropBlock[]) => void;
  availableAssets?: Asset[];
}

// Block type options for the add menu
const BLOCK_TYPES: Array<{
  type: DropBlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  { type: "text", label: "Text", icon: <Type className="h-4 w-4" />, description: "Plain text paragraph" },
  { type: "heading", label: "Heading", icon: <Heading1 className="h-4 w-4" />, description: "Section header" },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" />, description: "Horizontal line" },
  { type: "quote", label: "Quote", icon: <Quote className="h-4 w-4" />, description: "Callout or quote" },
  { type: "post", label: "Post", icon: <Image className="h-4 w-4" />, description: "Embed a post" },
  { type: "featured_post", label: "Featured Post", icon: <Star className="h-4 w-4" />, description: "Larger post display" },
  { type: "image_gallery", label: "Image Gallery", icon: <Images className="h-4 w-4" />, description: "Grid or featured layout" },
];

export function BlockEditor({ dropId, blocks, onBlocksChange, availableAssets = [] }: BlockEditorProps) {
  const [showAddMenu, setShowAddMenu] = React.useState<number | null>(null);
  const [showAssetPicker, setShowAssetPicker] = React.useState<{ position: number; type: DropBlockType; multiSelect?: boolean } | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Add a new block
  const handleAddBlock = async (type: DropBlockType, position: number, assetId?: string, assetIds?: string[]) => {
    try {
      const response = await fetch(`/api/drops/${dropId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          position,
          asset_id: assetId,
          content: type === "heading" ? "" : type === "text" ? "" : undefined,
          heading_level: type === "heading" ? 2 : undefined,
          gallery_layout: type === "image_gallery" ? "grid" : undefined,
        }),
      });

      if (response.ok) {
        const { block } = await response.json();
        
        // If it's a gallery block, add the images
        if (type === "image_gallery" && assetIds && assetIds.length > 0) {
          const galleryResponse = await fetch(`/api/drops/${dropId}/blocks/${block.id}/gallery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ asset_ids: assetIds }),
          });
          
          if (galleryResponse.ok) {
            const { images } = await galleryResponse.json();
            block.gallery_images = images;
          }
        }
        
        const newBlocks = [...blocks];
        newBlocks.splice(position, 0, block);
        // Update positions
        newBlocks.forEach((b, i) => (b.position = i));
        onBlocksChange(newBlocks);
      }
    } catch (error) {
      console.error("Failed to add block:", error);
    }

    setShowAddMenu(null);
    setShowAssetPicker(null);
  };

  // Update block content (debounced)
  const handleContentChange = (blockId: string, content: string) => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, content } : b
    );
    onBlocksChange(newBlocks);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (error) {
        console.error("Failed to save block:", error);
      }
    }, 500);
  };

  // Delete a block
  const handleDeleteBlock = async (blockId: string) => {
    // Optimistic update
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    newBlocks.forEach((b, i) => (b.position = i));
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete block:", error);
    }
  };

  // Update display mode for a block
  const handleDisplayModeChange = async (blockId: string, mode: "auto" | "fit" | "cover") => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, display_mode: mode } : b
    );
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_mode: mode }),
      });
    } catch (error) {
      console.error("Failed to update display mode:", error);
    }
  };

  // Update crop position for a block
  const handleCropPositionChange = async (blockId: string, x: number, y: number) => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, crop_position_x: x, crop_position_y: y } : b
    );
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop_position_x: x, crop_position_y: y }),
      });
    } catch (error) {
      console.error("Failed to update crop position:", error);
    }
  };

  // Update gallery layout for a block
  const handleGalleryLayoutChange = async (blockId: string, layout: GalleryLayout) => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, gallery_layout: layout } : b
    );
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery_layout: layout }),
      });
    } catch (error) {
      console.error("Failed to update gallery layout:", error);
    }
  };

  // Update gallery featured index
  const handleGalleryFeaturedIndexChange = async (blockId: string, index: number) => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, gallery_featured_index: index } : b
    );
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery_featured_index: index }),
      });
    } catch (error) {
      console.error("Failed to update featured index:", error);
    }
  };

  // Add images to gallery
  const handleGalleryAddImages = async (blockId: string, assetIds: string[]) => {
    try {
      const response = await fetch(`/api/drops/${dropId}/blocks/${blockId}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_ids: assetIds }),
      });

      if (response.ok) {
        const { images } = await response.json();
        // Update block with new images
        const newBlocks = blocks.map((b) =>
          b.id === blockId ? { ...b, gallery_images: [...(b.gallery_images || []), ...images] } : b
        );
        onBlocksChange(newBlocks);
      }
    } catch (error) {
      console.error("Failed to add images to gallery:", error);
    }
  };

  // Remove image from gallery
  const handleGalleryRemoveImage = async (blockId: string, assetId: string) => {
    // Optimistic update
    const newBlocks = blocks.map((b) =>
      b.id === blockId
        ? { ...b, gallery_images: b.gallery_images?.filter((img) => img.asset_id !== assetId) }
        : b
    );
    onBlocksChange(newBlocks);

    try {
      await fetch(`/api/drops/${dropId}/blocks/${blockId}/gallery?asset_id=${assetId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to remove image from gallery:", error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newBlocks = [...blocks];
      const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(dragOverIndex, 0, draggedBlock);
      newBlocks.forEach((b, i) => (b.position = i));
      onBlocksChange(newBlocks);

      // Save new order
      try {
        await fetch(`/api/drops/${dropId}/blocks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block_ids: newBlocks.map((b) => b.id) }),
        });
      } catch (error) {
        console.error("Failed to reorder blocks:", error);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Handle block type selection
  const handleBlockTypeSelect = (type: DropBlockType, position: number) => {
    if (type === "post" || type === "featured_post") {
      setShowAssetPicker({ position, type, multiSelect: false });
      setShowAddMenu(null);
    } else if (type === "image_gallery") {
      setShowAssetPicker({ position, type, multiSelect: true });
      setShowAddMenu(null);
    } else {
      handleAddBlock(type, position);
    }
  };

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="block-editor">
      {/* Add block button at the top */}
      <AddBlockButton 
        position={0} 
        showMenu={showAddMenu === 0}
        onToggleMenu={() => setShowAddMenu(showAddMenu === 0 ? null : 0)}
        onSelectType={(type) => handleBlockTypeSelect(type, 0)}
      />

      {/* Render blocks */}
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <div
            className={`block-wrapper group relative ${
              draggedIndex === index ? "opacity-50" : ""
            } ${dragOverIndex === index ? "border-t-2 border-violet-500" : ""}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle and actions */}
            <div className="absolute -left-10 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteBlock(block.id)}
                className="p-1 text-zinc-600 hover:text-red-400"
                title="Delete block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Block content */}
            <BlockRenderer
              block={block}
              isEditing={true}
              onContentChange={(content) => handleContentChange(block.id, content)}
              onDelete={() => handleDeleteBlock(block.id)}
              onDisplayModeChange={(mode) => handleDisplayModeChange(block.id, mode)}
              onCropPositionChange={(x, y) => handleCropPositionChange(block.id, x, y)}
              onGalleryLayoutChange={(layout) => handleGalleryLayoutChange(block.id, layout)}
              onGalleryFeaturedIndexChange={(index) => handleGalleryFeaturedIndexChange(block.id, index)}
              onGalleryAddImages={(assetIds) => handleGalleryAddImages(block.id, assetIds)}
              onGalleryRemoveImage={(assetId) => handleGalleryRemoveImage(block.id, assetId)}
              availableAssets={availableAssets}
            />
          </div>

          {/* Add block button after each block */}
          <AddBlockButton
            position={index + 1}
            showMenu={showAddMenu === index + 1}
            onToggleMenu={() => setShowAddMenu(showAddMenu === index + 1 ? null : index + 1)}
            onSelectType={(type) => handleBlockTypeSelect(type, index + 1)}
          />
        </React.Fragment>
      ))}

      {/* Asset picker modal */}
      {showAssetPicker && (
        <AssetPickerModal
          assets={availableAssets}
          multiSelect={showAssetPicker.multiSelect}
          onSelect={(assetId) => handleAddBlock(showAssetPicker.type, showAssetPicker.position, assetId)}
          onMultiSelect={(assetIds) => handleAddBlock(showAssetPicker.type, showAssetPicker.position, undefined, assetIds)}
          onClose={() => setShowAssetPicker(null)}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        .block-wrapper {
          padding-left: 40px;
        }
      `}</style>
    </div>
  );
}

// Add Block Button Component
function AddBlockButton({
  position,
  showMenu,
  onToggleMenu,
  onSelectType,
}: {
  position: number;
  showMenu: boolean;
  onToggleMenu: () => void;
  onSelectType: (type: DropBlockType) => void;
}) {
  return (
    <div className="relative my-2">
      <button
        onClick={onToggleMenu}
        className="w-full flex items-center justify-center gap-2 py-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 rounded-lg transition-colors group"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">Add block</span>
      </button>

      {showMenu && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
          {BLOCK_TYPES.map((blockType) => (
            <button
              key={blockType.type}
              onClick={() => onSelectType(blockType.type)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
            >
              <span className="text-zinc-400">{blockType.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">{blockType.label}</div>
                <div className="text-xs text-zinc-500">{blockType.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Asset Picker Modal
function AssetPickerModal({
  assets,
  multiSelect = false,
  onSelect,
  onMultiSelect,
  onClose,
}: {
  assets: Asset[];
  multiSelect?: boolean;
  onSelect: (assetId: string) => void;
  onMultiSelect?: (assetIds: string[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const filteredAssets = assets.filter((asset) =>
    asset.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (assetId: string) => {
    if (selectedIds.includes(assetId)) {
      setSelectedIds(selectedIds.filter((id) => id !== assetId));
    } else {
      setSelectedIds([...selectedIds, assetId]);
    }
  };

  const handleConfirm = () => {
    if (multiSelect && onMultiSelect) {
      onMultiSelect(selectedIds);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">
              {multiSelect ? "Select images for gallery" : "Select a post"}
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">
              ✕
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          {multiSelect && selectedIds.length > 0 && (
            <p className="text-sm text-violet-400 mt-2">{selectedIds.length} images selected</p>
          )}
        </div>

        {/* Asset list */}
        <div className="p-4 overflow-y-auto flex-1">
          {filteredAssets.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No posts found</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => {
                      if (multiSelect) {
                        toggleSelection(asset.id);
                      } else {
                        onSelect(asset.id);
                        onClose();
                      }
                    }}
                    className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 transition-all ${
                      isSelected ? "ring-2 ring-violet-500" : "hover:ring-2 hover:ring-violet-500/50"
                    }`}
                  >
                    <img
                      src={asset.thumbnail_url || asset.url}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    } transition-opacity`}>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs text-white font-medium truncate">{asset.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer for multi-select */}
        {multiSelect && (
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedIds.length} image{selectedIds.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

