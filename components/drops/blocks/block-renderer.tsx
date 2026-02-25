"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DropBlock, Asset, GalleryLayout } from "@/lib/types/database";

interface BlockRendererProps {
  block: DropBlock;
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
  onDelete?: () => void;
  onDisplayModeChange?: (mode: "auto" | "fit" | "cover") => void;
  onCropPositionChange?: (x: number, y: number) => void;
  // Gallery-specific props
  onGalleryLayoutChange?: (layout: GalleryLayout) => void;
  onGalleryFeaturedIndexChange?: (index: number) => void;
  onGalleryAddImages?: (assetIds: string[]) => void;
  onGalleryRemoveImage?: (assetId: string) => void;
  availableAssets?: Asset[];
  onAssetUploaded?: (asset: Asset) => void;
}


// Format post date
function formatPostDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get effective display mode
function getEffectiveDisplayMode(block: DropBlock): "fit" | "cover" {
  if (block.display_mode && block.display_mode !== "auto") {
    return block.display_mode;
  }
  return block.asset?.embed_provider === "figma" ? "fit" : "cover";
}

// Text Block Component
function TextBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  if (isEditing && onContentChange) {
    return (
      <div className="mb-4">
        <textarea
          value={block.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write something..."
          className="w-full min-h-[80px] bg-transparent border border-border rounded-lg px-4 py-3 text-base leading-relaxed text-muted-foreground resize-y outline-none font-sans"
        />
      </div>
    );
  }

  return <p className="text-base leading-relaxed text-muted-foreground mb-4">{block.content}</p>;
}

// Heading Block Component
function HeadingBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  const level = block.heading_level || 2;
  const headingClasses = {
    1: "text-[28px] font-bold text-foreground my-8 leading-tight",
    2: "text-[22px] font-semibold text-foreground my-7 leading-tight",
    3: "text-lg font-semibold text-foreground my-6 leading-tight",
  };

  if (isEditing && onContentChange) {
    return (
      <input
        type="text"
        value={block.content || ""}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={`Heading ${level}`}
        className={cn(
          headingClasses[level as keyof typeof headingClasses],
          "w-full bg-transparent border-none border-b-2 border-transparent outline-none font-sans focus:border-border"
        )}
      />
    );
  }

  const className = headingClasses[level as keyof typeof headingClasses];
  
  // Use React.createElement to dynamically create heading tags
  return React.createElement(
    `h${level}` as "h1" | "h2" | "h3",
    { className },
    block.content
  );
}

// Divider Block Component
function DividerBlockView() {
  return <hr className="border-border my-8" />;
}

// Quote Block Component
function QuoteBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  if (isEditing && onContentChange) {
    return (
      <div className="border-l-4 border-violet-400 pl-4 my-6 italic text-muted-foreground text-base leading-relaxed">
        <textarea
          value={block.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Add a quote..."
          className="w-full min-h-[60px] bg-transparent border-none p-0 text-base leading-relaxed text-muted-foreground resize-y outline-none font-sans italic"
        />
      </div>
    );
  }

  return (
    <div className="border-l-4 border-violet-400 pl-4 my-6 italic text-muted-foreground text-base leading-relaxed">
      <p className="m-0">{block.content}</p>
    </div>
  );
}

// Draggable image for adjusting crop position in cover mode
function DraggableImage({ 
  block, 
  onPositionChange,
}: { 
  block: DropBlock; 
  onPositionChange: (x: number, y: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const [cropPos, setCropPos] = React.useState({ 
    x: block.crop_position_x ?? 50, 
    y: block.crop_position_y ?? 0 
  });

  // Update local state when block prop changes
  React.useEffect(() => {
    setCropPos({
      x: block.crop_position_x ?? 50,
      y: block.crop_position_y ?? 0,
    });
  }, [block.crop_position_x, block.crop_position_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startPos.x) / rect.width) * 100;
    const deltaY = ((e.clientY - startPos.y) / rect.height) * 100;
    
    // Invert direction: dragging right moves crop left (lower x value)
    const newX = Math.max(0, Math.min(100, cropPos.x - deltaX));
    const newY = Math.max(0, Math.min(100, cropPos.y - deltaY));
    
    setCropPos({ x: newX, y: newY });
    setStartPos({ x: e.clientX, y: e.clientY });
  }, [isDragging, startPos, cropPos]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onPositionChange(cropPos.x, cropPos.y);
    }
  }, [isDragging, cropPos, onPositionChange]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const asset = block.asset;
  if (!asset) return null;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "relative w-full h-full",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <Image
        src={asset.medium_url || asset.url || asset.thumbnail_url || ""}
        alt={asset.title}
        width={800}
        height={400}
        className="w-full h-auto max-h-[400px] object-cover block rounded-xl"
        style={{
          objectPosition: `${cropPos.x}% ${cropPos.y}%`,
        }}
      />
      {isDragging && (
        <div className="absolute inset-0 bg-violet-400/10 border-2 border-violet-400/50 rounded-xl pointer-events-none" />
      )}
    </div>
  );
}

// Display mode control buttons
function DisplayModeControls({ 
  block, 
  onModeChange 
}: { 
  block: DropBlock; 
  onModeChange: (mode: "auto" | "fit" | "cover") => void;
}) {
  const currentMode = getEffectiveDisplayMode(block);
  
  return (
    <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onModeChange('fit');
        }}
        title="Fit - Show entire image"
        aria-label="Fit - Show entire image"
        className={cn(
          "w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center backdrop-blur-sm text-sm",
          currentMode === 'fit' 
            ? "bg-violet-500/90 text-white" 
            : "bg-background/70 text-muted-foreground"
        )}
      >
        ⊡
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onModeChange('cover');
        }}
        title="Fill - Crop to fill"
        aria-label="Fill - Crop to fill"
        className={cn(
          "w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center backdrop-blur-sm text-sm",
          currentMode === 'cover' 
            ? "bg-violet-500/90 text-white" 
            : "bg-background/70 text-muted-foreground"
        )}
      >
        ⬚
      </button>
    </div>
  );
}

// Post Block Component
function PostBlockView({ block, isEditing, onDisplayModeChange, onCropPositionChange }: BlockRendererProps) {
  const asset = block.asset;
  if (!asset) return null;

  const displayMode = getEffectiveDisplayMode(block);
  const isFitMode = displayMode === "fit";

  return (
    <div className="mb-8">
      <div 
        className={cn(
          "group post-image-container rounded-xl overflow-hidden max-h-[400px] relative",
          isFitMode ? "bg-muted" : ""
        )}
      >
        {/* Draggable image in cover mode when editing */}
        {isEditing && !isFitMode && onCropPositionChange ? (
          <DraggableImage
            block={block}
            onPositionChange={onCropPositionChange}
          />
        ) : (
          <Link href={`/e/${asset.id}`}>
            <Image
              src={asset.medium_url || asset.url || asset.thumbnail_url || ""}
              alt={asset.title}
              width={800}
              height={400}
              className={cn(
                "w-full h-auto max-h-[400px] block rounded-xl",
                isFitMode ? "object-contain" : "object-cover"
              )}
              style={{
                objectPosition: isFitMode
                  ? "center"
                  : `${block.crop_position_x ?? 50}% ${block.crop_position_y ?? 0}%`,
              }}
            />
          </Link>
        )}
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls
            block={block}
            onModeChange={onDisplayModeChange}
          />
        )}
        {/* Drag hint */}
        {isEditing && !isFitMode && onCropPositionChange && (
          <div className="drag-hint group-hover:opacity-100 absolute top-3 left-3 px-2 py-1 bg-background/70 backdrop-blur-sm text-muted-foreground text-xs rounded opacity-0 transition-opacity duration-200 pointer-events-none">
            Drag to adjust crop
          </div>
        )}
      </div>
      <div className="py-4">
        <h3 className="text-lg font-semibold text-foreground mb-2 leading-snug">{asset.title}</h3>
        {asset.description && (
          <p className="text-[15px] text-muted-foreground mb-3 leading-normal">{asset.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {asset.uploader && (
            <>
              <Image
                src={asset.uploader.avatar_url || "/default-avatar.png"}
                alt={asset.uploader.display_name || asset.uploader.username || "User"}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="text-sm text-muted-foreground m-0">{asset.uploader.display_name || asset.uploader.username || "Unknown"}</span>
              <span className="text-sm text-muted-foreground m-0">•</span>
            </>
          )}
          <span className="text-sm text-muted-foreground m-0">{formatPostDate(asset.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// Featured Post Block Component
function FeaturedPostBlockView({ block, isEditing, onDisplayModeChange, onCropPositionChange }: BlockRendererProps) {
  const asset = block.asset;
  if (!asset) return null;

  const displayMode = getEffectiveDisplayMode(block);
  const isFitMode = displayMode === "fit";

  return (
    <div className="mb-10">
      <div 
        className={cn(
          "group featured-image-container rounded-2xl overflow-hidden max-h-[500px] relative",
          isFitMode ? "bg-muted" : ""
        )}
      >
        {/* Draggable image in cover mode when editing */}
        {isEditing && !isFitMode && onCropPositionChange ? (
          <DraggableImage
            block={block}
            onPositionChange={onCropPositionChange}
          />
        ) : (
          <Link href={`/e/${asset.id}`}>
            <Image
              src={asset.medium_url || asset.url || asset.thumbnail_url || ""}
              alt={asset.title}
              width={800}
              height={500}
              className={cn(
                "w-full h-auto max-h-[500px] block rounded-2xl",
                isFitMode ? "object-contain" : "object-cover"
              )}
              style={{
                objectPosition: isFitMode
                  ? "center"
                  : `${block.crop_position_x ?? 50}% ${block.crop_position_y ?? 0}%`,
              }}
            />
          </Link>
        )}
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls 
            block={block} 
            onModeChange={onDisplayModeChange} 
          />
        )}
        {/* Drag hint */}
        {isEditing && !isFitMode && onCropPositionChange && (
          <div className="drag-hint group-hover:opacity-100 absolute top-3 left-3 px-2 py-1 bg-background/70 backdrop-blur-sm text-muted-foreground text-xs rounded opacity-0 transition-opacity duration-200 pointer-events-none">
            Drag to adjust crop
          </div>
        )}
      </div>
      <div className="py-5">
        <h2 className="text-2xl font-bold text-foreground mb-3 leading-tight">{asset.title}</h2>
        {asset.description && (
          <p className="text-base text-muted-foreground mb-3 leading-normal">{asset.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {asset.uploader && (
            <>
              <Image
                src={asset.uploader.avatar_url || "/default-avatar.png"}
                alt={asset.uploader.display_name || asset.uploader.username || "User"}
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-[15px] text-muted-foreground m-0">{asset.uploader.display_name || asset.uploader.username || "Unknown"}</span>
              <span className="text-sm text-muted-foreground m-0">•</span>
            </>
          )}
          <span className="text-[15px] text-muted-foreground m-0">{formatPostDate(asset.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// Gallery Layout Toggle Controls
function GalleryLayoutControls({
  layout,
  onLayoutChange,
}: {
  layout: GalleryLayout;
  onLayoutChange: (layout: GalleryLayout) => void;
}) {
  return (
    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLayoutChange('grid');
        }}
        title="Grid layout (2x2)"
        aria-label="Grid layout (2x2)"
        className={cn(
          "w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center backdrop-blur-sm text-xs",
          layout === 'grid' 
            ? "bg-violet-500/90 text-white" 
            : "bg-background/70 text-muted-foreground"
        )}
      >
        ⊞
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLayoutChange('featured');
        }}
        title="Featured layout (1 large + thumbnails)"
        aria-label="Featured layout (1 large + thumbnails)"
        className={cn(
          "w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center backdrop-blur-sm text-xs",
          layout === 'featured' 
            ? "bg-violet-500/90 text-white" 
            : "bg-background/70 text-muted-foreground"
        )}
      >
        ⬒
      </button>
    </div>
  );
}

// Image Gallery Block Component
function ImageGalleryBlockView({
  block,
  isEditing,
  onGalleryLayoutChange,
  onGalleryFeaturedIndexChange,
  onGalleryRemoveImage,
  onGalleryAddImages,
  availableAssets,
  onAssetUploaded,
}: BlockRendererProps) {
  const [showAddModal, setShowAddModal] = React.useState(false);
  // Local assets state to include newly uploaded ones
  const [localAssets, setLocalAssets] = React.useState<Asset[]>(availableAssets || []);
  
  // Update local assets when prop changes
  React.useEffect(() => {
    setLocalAssets(availableAssets || []);
  }, [availableAssets]);
  const images = block.gallery_images || [];
  const layout = block.gallery_layout || 'grid';
  const featuredIndex = block.gallery_featured_index || 0;

  // Get featured image and remaining images
  const featuredImage = images[featuredIndex] || images[0];
  const thumbnailImages = images.filter((_, i) => i !== featuredIndex);

  if (images.length === 0 && isEditing) {
    return (
      <div className="p-10 border-2 border-dashed border-border rounded-xl text-center mb-8">
        <p className="text-muted-foreground mb-3">No images in gallery</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-violet-500 text-white border-none rounded-lg cursor-pointer"
        >
          Add Images
        </button>
        {showAddModal && localAssets && onGalleryAddImages && (
          <GalleryAddModal
            assets={localAssets}
            existingImageIds={images.map((img) => img.asset_id)}
            onAdd={(assetIds) => {
              onGalleryAddImages(assetIds);
              setShowAddModal(false);
            }}
            onClose={() => setShowAddModal(false)}
            onAssetUploaded={(newAsset) => {
              setLocalAssets((prev) => [newAsset, ...prev]);
              onAssetUploaded?.(newAsset);
            }}
          />
        )}
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="group gallery-container relative">
        {layout === 'grid' ? (
          // Grid layout (2x2)
          <div className="grid grid-cols-2 gap-2">
            {images.slice(0, 4).map((img, index) => (
              <div
                key={img.id}
                className="gallery-item group/item aspect-square rounded-lg overflow-hidden bg-muted relative"
              >
                <Image
                  src={img.asset?.medium_url || img.asset?.url || img.asset?.thumbnail_url || ''}
                  alt={img.asset?.title || ''}
                  fill
                  className="object-cover"
                />
                {isEditing && onGalleryRemoveImage && (
                  <button
                    onClick={() => onGalleryRemoveImage(img.asset_id)}
                    aria-label="Remove image"
                    className="remove-btn absolute top-2 right-2 w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm text-white border-none cursor-pointer hidden group-hover/item:flex items-center justify-center text-sm"
                  >
                    ×
                  </button>
                )}
                {index === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center text-foreground text-base font-semibold">
                    +{images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Featured layout (1 large + thumbnails)
          <div className="flex flex-col gap-2">
            {featuredImage && (
              <div
                className="gallery-item group/featured aspect-video rounded-xl overflow-hidden bg-muted relative cursor-pointer"
                onClick={() => isEditing && onGalleryFeaturedIndexChange && onGalleryFeaturedIndexChange(featuredIndex)}
              >
                <Image
                  src={featuredImage.asset?.medium_url || featuredImage.asset?.url || featuredImage.asset?.thumbnail_url || ''}
                  alt={featuredImage.asset?.title || ''}
                  fill
                  className="object-cover"
                />
                {isEditing && onGalleryRemoveImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGalleryRemoveImage(featuredImage.asset_id);
                    }}
                    aria-label="Remove featured image"
                    className="remove-btn absolute top-2 right-2 w-6 h-6 rounded-full bg-background/70 backdrop-blur-sm text-white border-none cursor-pointer hidden group-hover/featured:flex items-center justify-center text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {thumbnailImages.length > 0 && (
              <div className="flex gap-2">
                {thumbnailImages.slice(0, 4).map((img, index) => {
                  const actualIndex = images.findIndex((i) => i.id === img.id);
                  return (
                    <div
                      key={img.id}
                      className="gallery-item group/thumb flex-1 aspect-square rounded-lg overflow-hidden bg-muted relative cursor-pointer"
                      onClick={() => isEditing && onGalleryFeaturedIndexChange && onGalleryFeaturedIndexChange(actualIndex)}
                    >
                      <Image
                        src={img.asset?.thumbnail_url || img.asset?.url || ''}
                        alt={img.asset?.title || ''}
                        fill
                        className="object-cover"
                      />
                      {isEditing && onGalleryRemoveImage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGalleryRemoveImage(img.asset_id);
                          }}
                          aria-label="Remove thumbnail image"
                          className="remove-btn absolute top-1 right-1 w-5 h-5 rounded-full bg-background/70 backdrop-blur-sm text-white border-none cursor-pointer hidden group-hover/thumb:flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      )}
                      {index === 3 && thumbnailImages.length > 4 && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center text-foreground text-base font-semibold">
                          +{thumbnailImages.length - 4}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Layout toggle controls */}
        {isEditing && onGalleryLayoutChange && (
          <GalleryLayoutControls
            layout={layout}
            onLayoutChange={onGalleryLayoutChange}
          />
        )}

        {/* Add more images button */}
        {isEditing && availableAssets && onGalleryAddImages && (
          <button
            onClick={() => setShowAddModal(true)}
            aria-label="Add more images to gallery"
            className="add-images-btn group-hover:opacity-100 absolute bottom-3 left-3 px-3 py-1.5 bg-background/70 backdrop-blur-sm text-muted-foreground border-none rounded-md cursor-pointer text-xs opacity-0 transition-opacity duration-200"
          >
            + Add images
          </button>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && localAssets && onGalleryAddImages && (
        <GalleryAddModal
          assets={localAssets}
          existingImageIds={images.map((img) => img.asset_id)}
          onAdd={(assetIds) => {
            onGalleryAddImages(assetIds);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
          onAssetUploaded={(newAsset) => {
            setLocalAssets((prev) => [newAsset, ...prev]);
            onAssetUploaded?.(newAsset);
          }}
        />
      )}
    </div>
  );
}

// Gallery Add Modal (with upload support)
function GalleryAddModal({
  assets,
  existingImageIds,
  onAdd,
  onClose,
  onAssetUploaded,
}: {
  assets: Asset[];
  existingImageIds: string[];
  onAdd: (assetIds: string[]) => void;
  onClose: () => void;
  onAssetUploaded?: (asset: Asset) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"browse" | "upload">("browse");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  
  // Upload state
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileReaderRef = React.useRef<FileReader | null>(null);

  // Cleanup FileReader on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
        fileReaderRef.current = null;
      }
    };
  }, []);

  const filteredAssets = assets.filter(
    (asset) =>
      !existingImageIds.includes(asset.id) &&
      asset.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (assetId: string) => {
    if (selectedIds.includes(assetId)) {
      setSelectedIds(selectedIds.filter((id) => id !== assetId));
    } else {
      setSelectedIds([...selectedIds, assetId]);
    }
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
    
    // Clear previous state before processing new file
    setUploadError(null);
    setPreview(null);
    
    // Set upload title before file reading to avoid race conditions
    if (!uploadTitle) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setUploadTitle(nameWithoutExt);
    }
    
    // Set file state after validation
    setFile(selectedFile);
    
    // Abort any existing FileReader before creating a new one
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
    }
    
    // Create new FileReader instance
    const reader = new FileReader();
    fileReaderRef.current = reader;
    let isCompleted = false;
    
    reader.onload = (e) => {
      // Prevent race condition: only update if not already completed/errored
      if (isCompleted) return;
      isCompleted = true;
      
      if (e.target?.result) {
        setPreview(e.target.result as string);
      }
    };
    
    reader.onerror = () => {
      // Prevent race condition: only update if not already completed
      if (!isCompleted) {
        isCompleted = true;
        setUploadError("Failed to read file");
        setFile(null);
        setPreview(null);
        setUploadTitle("");
      }
    };
    
    // Start reading after all handlers are set up
    reader.readAsDataURL(selectedFile);
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
      
      // Add to selection
      setSelectedIds([...selectedIds, asset.id]);
      
      // Reset upload form
      setFile(null);
      setPreview(null);
      setUploadTitle("");
      
      // Switch to browse tab
      setActiveTab("browse");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setIsUploading(false);
    }
  };

  const clearUpload = () => {
    // Abort any in-progress file reading
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
      fileReaderRef.current = null;
    }
    setFile(null);
    setPreview(null);
    setUploadTitle("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[600px] max-h-[80vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex justify-between mb-3">
            <h3 className="m-0 text-foreground">Add images to gallery</h3>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="bg-transparent border-none text-muted-foreground cursor-pointer text-lg hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab("browse")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md border-none cursor-pointer",
                activeTab === "browse" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
              )}
            >
              Browse Posts
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md border-none cursor-pointer flex items-center gap-1.5",
                activeTab === "upload" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"
              )}
            >
              ⬆ Upload New
            </button>
          </div>

          {activeTab === "browse" && (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground outline-none"
              />
              {selectedIds.length > 0 && (
                <p className="mt-2 mb-0 text-violet-400 text-sm">
                  {selectedIds.length} selected
                </p>
              )}
            </>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "browse" ? (
            filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No images available</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-3 bg-transparent border-none text-violet-400 cursor-pointer text-sm"
                >
                  Upload a new image instead
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedIds.includes(asset.id);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => toggleSelection(asset.id)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden p-0 cursor-pointer relative",
                        isSelected ? "border-2 border-violet-400" : "border-2 border-transparent"
                      )}
                    >
                      <Image
                        src={asset.thumbnail_url || asset.url}
                        alt={asset.title}
                        fill
                        className="object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-400 flex items-center justify-center text-white text-xs">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            // Upload tab
            <div>
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer",
                    isDragging ? "border-violet-400 bg-violet-400/10" : "border-border"
                  )}
                >
                  <div className="text-[32px] mb-3">⬆</div>
                  <p className="text-foreground font-medium mb-1">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-muted-foreground text-sm">
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
                    style={{ display: "none" }}
                  />
                </div>
              ) : (
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-4">
                    <Image
                      src={preview!}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <button
                      onClick={clearUpload}
                      aria-label="Clear preview"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm border-none text-foreground cursor-pointer flex items-center justify-center hover:bg-background/80 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm text-muted-foreground mb-1.5">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Enter a title..."
                      className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground outline-none"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-red-500 text-sm mb-4">{uploadError}</p>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className={cn(
                      "w-full px-4 py-2.5 text-white border-none rounded-lg font-medium flex items-center justify-center gap-2",
                      isUploading ? "bg-muted cursor-not-allowed" : "bg-violet-500 cursor-pointer"
                    )}
                  >
                    {isUploading ? "Uploading..." : "⬆ Upload & Add to Selection"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {activeTab === "browse" && (
          <div className="p-4 border-t border-border flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-transparent border-none text-muted-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd(selectedIds)}
              disabled={selectedIds.length === 0}
              className={cn(
                "px-4 py-2 border-none rounded-md",
                selectedIds.length > 0 
                  ? "bg-violet-500 text-white cursor-pointer" 
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Add {selectedIds.length} image{selectedIds.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Block Renderer
export function BlockRenderer(props: BlockRendererProps) {
  const { block } = props;

  switch (block.type) {
    case "text":
      return <TextBlockView {...props} />;
    case "heading":
      return <HeadingBlockView {...props} />;
    case "divider":
      return <DividerBlockView />;
    case "quote":
      return <QuoteBlockView {...props} />;
    case "post":
      return <PostBlockView {...props} />;
    case "featured_post":
      return <FeaturedPostBlockView {...props} />;
    case "image_gallery":
      return <ImageGalleryBlockView {...props} />;
    default:
      return null;
  }
}

// Export individual components for direct use
export {
  TextBlockView,
  HeadingBlockView,
  DividerBlockView,
  QuoteBlockView,
  PostBlockView,
  FeaturedPostBlockView,
  ImageGalleryBlockView,
};

