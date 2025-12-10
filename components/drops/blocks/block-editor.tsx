"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Trash2, Type, Heading1, Minus, Quote, Image, Star, Images, Check, Upload, Loader2, X } from "lucide-react";
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
  // Local state for assets (to include newly uploaded ones)
  const [localAssets, setLocalAssets] = React.useState<Asset[]>(availableAssets);
  
  // Update local assets when prop changes
  React.useEffect(() => {
    setLocalAssets(availableAssets);
  }, [availableAssets]);

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
                className="p-1 text-zinc-600 hover:text-red-400 cursor-pointer"
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
              availableAssets={localAssets}
              onAssetUploaded={(newAsset) => setLocalAssets((prev) => [newAsset, ...prev])}
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
          assets={localAssets}
          multiSelect={showAssetPicker.multiSelect}
          onSelect={(assetId) => handleAddBlock(showAssetPicker.type, showAssetPicker.position, assetId)}
          onMultiSelect={(assetIds) => handleAddBlock(showAssetPicker.type, showAssetPicker.position, undefined, assetIds)}
          onClose={() => setShowAssetPicker(null)}
          onAssetUploaded={(newAsset) => {
            // Add new asset to local list so it appears in the picker
            setLocalAssets((prev) => [newAsset, ...prev]);
          }}
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

// Add Block Button Component with delightful expansion animation
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
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className="relative my-2 h-8 flex items-center justify-center z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hover area */}
      <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={onToggleMenu} />

      {/* Expanding Line */}
      <motion.div
        initial={{ width: "0%", opacity: 0 }}
        animate={{ 
          width: isHovered || showMenu ? "100%" : "0%", 
          opacity: isHovered || showMenu ? 1 : 0 
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
      />

      {/* Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isHovered || showMenu ? 1 : 0.8, 
          opacity: isHovered || showMenu ? 1 : 0,
          rotate: showMenu ? 45 : 0
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onClick={onToggleMenu}
        className="relative z-20 flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-500 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </motion.button>

      {/* Menu */}
      <AnimatePresence>
      {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden backdrop-blur-xl"
          >
            {BLOCK_TYPES.map((blockType, i) => (
              <motion.button
              key={blockType.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              onClick={() => onSelectType(blockType.type)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors group relative overflow-hidden cursor-pointer"
            >
                {/* Hover gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <span className="text-zinc-400 group-hover:text-violet-400 transition-colors relative z-10">
                  {blockType.icon}
                </span>
                <div className="relative z-10">
                  <div className="text-sm font-medium text-white group-hover:text-violet-100 transition-colors">
                    {blockType.label}
                  </div>
                  <div className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {blockType.description}
                  </div>
              </div>
              </motion.button>
          ))}
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// Asset Picker Modal with Upload support
function AssetPickerModal({
  assets,
  multiSelect = false,
  onSelect,
  onMultiSelect,
  onClose,
  onAssetUploaded,
}: {
  assets: Asset[];
  multiSelect?: boolean;
  onSelect: (assetId: string) => void;
  onMultiSelect?: (assetIds: string[]) => void;
  onClose: () => void;
  onAssetUploaded?: (asset: Asset) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"browse" | "upload">("browse");
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  
  // Upload state
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // File handling
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB");
      return;
    }
    setFile(selectedFile);
    setUploadError(null);
    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
    // Set default title from filename
    if (!uploadTitle) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("visibility", "unlisted"); // Drop-only, won't appear in feed

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const { asset } = await response.json();
      
      // Notify parent of new asset
      onAssetUploaded?.(asset);
      
      if (multiSelect) {
        // Add to selection and stay in modal
        setSelectedIds([...selectedIds, asset.id]);
        // Reset upload form
        setFile(null);
        setPreview(null);
        setUploadTitle("");
        // Switch to browse tab to show the new asset
        setActiveTab("browse");
      } else {
        // Single select - use the asset and close
        onSelect(asset.id);
        onClose();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setIsUploading(false);
    }
  };

  const clearUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadTitle("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab("browse")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === "browse"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              Browse Posts
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "upload"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload New
            </button>
          </div>

          {activeTab === "browse" && (
            <>
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
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "browse" ? (
            // Browse existing posts
            filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500">No posts found</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-3 text-sm text-violet-400 hover:text-violet-300 cursor-pointer"
                >
                  Upload a new image instead
                </button>
              </div>
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
                      className={`group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 transition-all cursor-pointer ${
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
            )
          ) : (
            // Upload new image
            <div className="space-y-4">
              {!file ? (
                // Drop zone
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  }`}
                >
                  <Upload className="h-10 w-10 mx-auto text-zinc-500 mb-3" />
                  <p className="text-white font-medium mb-1">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-sm text-zinc-500">
                    PNG, JPG, GIF, WebP up to 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                // Preview
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800">
                    <img
                      src={preview!}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={clearUpload}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Enter a title..."
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-400">{uploadError}</p>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {multiSelect ? "Upload & Add to Selection" : "Upload & Use"}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer for multi-select */}
        {multiSelect && activeTab === "browse" && (
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
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

